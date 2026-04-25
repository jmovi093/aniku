const logger = createLogger("downloads");
import { createLogger } from "../utils/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNFS from "react-native-fs";
import {
  createDownloadTask,
  getExistingDownloadTasks,
} from "@kesha-antonov/react-native-background-downloader";
import { CustomAlert } from "../components/CustomAlert.js";
import AnimeService from "./AnimeService.js";

class DownloadService {
  static DOWNLOADS_KEY = "downloaded_episodes";
  static PENDING_METADATA_KEY = "download_pending_metadata";
  // ruta sin prefijo file:// — lo que espera el downloader nativo
  static DOWNLOADS_DIR = `${RNFS.DocumentDirectoryPath}/downloads/`;

  static DOWNLOAD_STATES = {
    QUEUED: "queued",
    DOWNLOADING: "downloading",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled",
  };

  // downloadKey → task (en memoria, sesión actual)
  static activeDownloads = new Map();
  static downloadListeners = new Set();
  static activeProgress = new Map(); // S5: hidratación de UI
  static _metadataCache = null; // S4: evitar lecturas repetidas de AsyncStorage
  static initialized = false;

  // ─── Init ────────────────────────────────────────────────────────────────

  static async init() {
    if (this.initialized) return;
    try {
      await this.initDownloadsDirectory();
      // Reengancharse a descargas que el OS mantuvo vivas mientras la app estaba cerrada
      await this.reattachExistingDownloads();
      this.initialized = true;
      logger.debug("✅ DownloadService inicializado (Android DownloadManager)");
    } catch (error) {
      logger.error("Error inicializando DownloadService:", error);
    }
  }

  static async initDownloadsDirectory() {
    const exists = await RNFS.exists(this.DOWNLOADS_DIR);
    if (!exists) {
      await RNFS.mkdir(this.DOWNLOADS_DIR);
      logger.debug("📁 Directorio de descargas creado");
    }
  }

  // Reengancharse a tareas activas que el DownloadManager del OS siguió ejecutando
  static async reattachExistingDownloads() {
    try {
      const lostTasks = await getExistingDownloadTasks();
      if (lostTasks.length > 0) {
        logger.debug(
          `🔄 Reanudando ${lostTasks.length} descarga(s) del sistema`,
        );
      }
      for (const task of lostTasks) {
        // task.id tiene el formato "<animeId>_ep_<episodeNo>"
        const meta = await this.getPendingMetadata(task.id);
        const [animeId, episodeNo] = meta
          ? [meta.animeId, meta.episodeNo]
          : this._parseTaskId(task.id);

        this._attachHandlers(task, task.id, animeId, episodeNo, meta || null);
        this.activeDownloads.set(task.id, task);
        this.notifyListeners(
          animeId,
          episodeNo,
          this.DOWNLOAD_STATES.DOWNLOADING,
          0,
        );
        task.resume();
      }
    } catch (error) {
      logger.warn("Error reanudando descargas existentes:", error.message);
    }
  }

  static _parseTaskId(taskId) {
    // formato: "animeId_ep_episodeNo"
    const sepIdx = taskId.lastIndexOf("_ep_");
    if (sepIdx === -1) return [taskId, "0"];
    return [taskId.slice(0, sepIdx), taskId.slice(sepIdx + 4)];
  }

  // ─── Listeners + activeProgress (S5) ─────────────────────────────────────

  static addDownloadListener(listener) {
    this.downloadListeners.add(listener);
  }

  static removeDownloadListener(listener) {
    this.downloadListeners.delete(listener);
  }

  static notifyListeners(animeId, episodeNo, state, progress = 0) {
    const key = `${animeId}_ep_${episodeNo}`;
    const terminal =
      state === this.DOWNLOAD_STATES.COMPLETED ||
      state === this.DOWNLOAD_STATES.FAILED ||
      state === this.DOWNLOAD_STATES.CANCELLED;
    if (terminal) {
      this.activeProgress.delete(key);
    } else {
      this.activeProgress.set(key, { state, progress });
    }
    this.downloadListeners.forEach((listener) => {
      try {
        listener({ animeId, episodeNo, state, progress });
      } catch (_) {}
    });
  }

  static getActiveProgress(animeId, episodeNo) {
    return this.activeProgress.get(`${animeId}_ep_${episodeNo}`) || null;
  }

  // ─── Metadata con caché en memoria (S4) ──────────────────────────────────

  static async getDownloads() {
    if (this._metadataCache !== null) return this._metadataCache;
    try {
      const raw = await AsyncStorage.getItem(this.DOWNLOADS_KEY);
      this._metadataCache = raw ? JSON.parse(raw) : [];
    } catch (_) {
      this._metadataCache = [];
    }
    return this._metadataCache;
  }

  static async saveDownloadMetadata(metadata) {
    const downloads = await this.getDownloads();
    const existingIndex = downloads.findIndex(
      (d) =>
        d.animeId === metadata.animeId &&
        String(d.episodeNo) === String(metadata.episodeNo),
    );
    if (existingIndex >= 0) {
      downloads[existingIndex] = metadata;
    } else {
      downloads.unshift(metadata);
    }
    this._metadataCache = downloads;
    await AsyncStorage.setItem(this.DOWNLOADS_KEY, JSON.stringify(downloads));
    logger.debug(
      "✅ Metadata guardada:",
      metadata.animeName,
      "ep",
      metadata.episodeNo,
    );
  }

  static async getDownloadState(animeId, episodeNo) {
    const downloads = await this.getDownloads();
    const found = downloads.find(
      (d) => d.animeId === animeId && String(d.episodeNo) === String(episodeNo),
    );
    if (found) return this.DOWNLOAD_STATES.COMPLETED;

    const downloadKey = `${animeId}_ep_${episodeNo}`;
    if (this.activeDownloads.has(downloadKey)) {
      return this.DOWNLOAD_STATES.DOWNLOADING;
    }
    return null;
  }

  // Verifica si un archivo local existe (para detectar borrados externos)
  static async fileExists(localPath) {
    try {
      return await RNFS.exists(localPath);
    } catch (_) {
      return false;
    }
  }

  // Limpia metadata huérfana (archivo borrado fuera de la app)
  static async removeOrphanMetadata(download) {
    try {
      const downloads = await this.getDownloads();
      const filtered = downloads.filter(
        (d) =>
          !(
            d.animeId === download.animeId &&
            String(d.episodeNo) === String(download.episodeNo)
          ),
      );
      this._metadataCache = filtered;
      await AsyncStorage.setItem(this.DOWNLOADS_KEY, JSON.stringify(filtered));
      logger.debug(`🧹 Metadata huérfana eliminada: ep ${download.episodeNo}`);
    } catch (_) {}
  }

  // Solo el estado en memoria (descargas activas), sin AsyncStorage
  static getLiveState(animeId, episodeNo) {
    const downloadKey = `${animeId}_ep_${episodeNo}`;
    if (this.activeDownloads.has(downloadKey)) {
      return this.DOWNLOAD_STATES.DOWNLOADING;
    }
    return null;
  }

  // ─── Metadata pendiente (para restaurar al reengancharse) ────────────────

  static async savePendingMetadata(downloadKey, metadata) {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_METADATA_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[downloadKey] = metadata;
      await AsyncStorage.setItem(
        this.PENDING_METADATA_KEY,
        JSON.stringify(all),
      );
    } catch (_) {}
  }

  static async getPendingMetadata(downloadKey) {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_METADATA_KEY);
      if (!raw) return null;
      return JSON.parse(raw)[downloadKey] || null;
    } catch (_) {
      return null;
    }
  }

  static async clearPendingMetadata(downloadKey) {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_METADATA_KEY);
      if (!raw) return;
      const all = JSON.parse(raw);
      delete all[downloadKey];
      await AsyncStorage.setItem(
        this.PENDING_METADATA_KEY,
        JSON.stringify(all),
      );
    } catch (_) {}
  }

  // ─── Download (Android DownloadManager vía RNBackgroundDownloader) ────────

  static async enqueueEpisode(animeId, animeName, episodeNo, videoLink) {
    const currentState = await this.getDownloadState(animeId, episodeNo);
    if (
      currentState === this.DOWNLOAD_STATES.COMPLETED ||
      currentState === this.DOWNLOAD_STATES.DOWNLOADING
    ) {
      logger.debug(`⚠️ Ep ${episodeNo} ya está ${currentState}`);
      return;
    }

    const cleanAnimeName = animeName
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_");
    const filename = `${cleanAnimeName}_EP${episodeNo}.mp4`;
    const localPath = `${this.DOWNLOADS_DIR}${filename}`;
    const downloadKey = `${animeId}_ep_${episodeNo}`;

    const metadata = {
      animeId,
      animeName,
      episodeNo,
      localPath,
      filename,
      quality: videoLink.quality || "Unknown",
      source: videoLink.source || "Unknown",
    };

    // Persistir metadata ANTES de iniciar, para poder restaurarla si la app muere
    await this.savePendingMetadata(downloadKey, metadata);

    logger.debug(`📥 Descarga nativa iniciada: ${animeName} ep ${episodeNo}`);
    logger.debug(`   🔗 URL: ${videoLink.url?.substring(0, 80)}...`);
    logger.debug(`   📁 Destino: ${localPath}`);
    logger.debug(
      `   🏷️ Source: ${videoLink.source} | Quality: ${videoLink.quality}`,
    );
    logger.debug(`   🔑 DownloadKey: ${downloadKey}`);
    this.notifyListeners(
      animeId,
      episodeNo,
      this.DOWNLOAD_STATES.DOWNLOADING,
      0,
    );

    let task;
    try {
      task = createDownloadTask({
        id: downloadKey,
        url: videoLink.url,
        destination: localPath,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
          Referer: "https://allmanga.to",
        },
        isAllowedOverRoaming: true,
        isAllowedOverMetered: true,
      });
      logger.debug(`✅ Tarea creada por createDownloadTask`);
    } catch (createError) {
      logger.error(`❌ Error creando tarea de descarga:`, createError);
      await this.clearPendingMetadata(downloadKey);
      this.notifyListeners(animeId, episodeNo, this.DOWNLOAD_STATES.FAILED);
      throw createError;
    }

    this._attachHandlers(task, downloadKey, animeId, episodeNo, metadata);
    this.activeDownloads.set(downloadKey, task);
    task.start();
    logger.debug(`▶️ Tarea iniciada: ${downloadKey}`);
  }

  // Adjuntar callbacks a una tarea (nueva o reenganchada)
  static _attachHandlers(task, downloadKey, animeId, episodeNo, metadata) {
    task
      .begin(({ expectedBytes }) => {
        logger.debug(
          `🟢 [begin] ep ${episodeNo} — tamaño esperado: ${expectedBytes} bytes`,
        );
        this.notifyListeners(
          animeId,
          episodeNo,
          this.DOWNLOAD_STATES.DOWNLOADING,
          0,
        );
      })
      .progress(({ bytesDownloaded, bytesTotal }) => {
        const pct =
          bytesTotal > 0 ? Math.round((bytesDownloaded / bytesTotal) * 100) : 0;
        if (pct % 10 === 0) {
          logger.debug(
            `📊 [progress] ep ${episodeNo}: ${pct}% (${bytesDownloaded}/${bytesTotal})`,
          );
        }
        this.notifyListeners(
          animeId,
          episodeNo,
          this.DOWNLOAD_STATES.DOWNLOADING,
          pct,
        );
      })
      .done(async ({ bytesDownloaded }) => {
        logger.debug(`✅ [done] ep ${episodeNo} — ${bytesDownloaded} bytes`);
        this.activeDownloads.delete(downloadKey);
        await this.clearPendingMetadata(downloadKey);

        if (metadata) {
          await this.saveDownloadMetadata({
            ...metadata,
            downloadDate: new Date().toISOString(),
          });
        }

        this.notifyListeners(
          animeId,
          episodeNo,
          this.DOWNLOAD_STATES.COMPLETED,
          100,
        );
      })
      .error(({ error, errorCode }) => {
        logger.error(
          `❌ [error] ep ${episodeNo}: ${error} (código: ${errorCode})`,
        );
        this.activeDownloads.delete(downloadKey);
        // No borramos pending metadata — permite reengancharse en siguiente init()
        this.notifyListeners(animeId, episodeNo, this.DOWNLOAD_STATES.FAILED);
      });
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────

  static async cancelDownload(animeId, episodeNo) {
    const downloadKey = `${animeId}_ep_${episodeNo}`;
    const task = this.activeDownloads.get(downloadKey);

    if (task) {
      // Leer metadata ANTES de limpiarla
      const meta = await this.getPendingMetadata(downloadKey);

      task.stop();
      this.activeDownloads.delete(downloadKey);
      await this.clearPendingMetadata(downloadKey);

      // Eliminar archivo parcial si existe
      try {
        if (meta) {
          const exists = await RNFS.exists(meta.localPath);
          if (exists) await RNFS.unlink(meta.localPath);
        }
      } catch (_) {}

      this.notifyListeners(animeId, episodeNo, this.DOWNLOAD_STATES.CANCELLED);
      logger.debug("⏹️ Descarga cancelada:", downloadKey);
      return true;
    }
    return false;
  }

  // ─── Descarga masiva paralela (S6) ────────────────────────────────────────

  static async downloadAllEpisodes(episodes, animeId, animeName) {
    logger.debug("📥 DESCARGANDO TODOS LOS EPISODIOS:", episodes.length);
    const BATCH = 5;
    let successCount = 0;

    for (let i = 0; i < episodes.length; i += BATCH) {
      const batch = episodes.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(async (episodeNo) => {
          const currentState = await this.getDownloadState(animeId, episodeNo);
          if (
            currentState === this.DOWNLOAD_STATES.COMPLETED ||
            currentState === this.DOWNLOAD_STATES.DOWNLOADING
          )
            return null;
          const videoLink = await AnimeService.getBestDownloadUrl(
            animeId,
            String(episodeNo),
          );
          return { episodeNo, videoLink };
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          await this.enqueueEpisode(
            animeId,
            animeName,
            r.value.episodeNo,
            r.value.videoLink,
          );
          successCount++;
        } else if (r.status === "rejected") {
          logger.warn("⚠️ No se pudo resolver URL:", r.reason?.message);
        }
      }
    }

    if (successCount > 0) {
      CustomAlert.success(
        "Descargas iniciadas",
        `${successCount} episodios descargando en segundo plano`,
      );
    } else {
      CustomAlert.warning(
        "Sin descargas",
        "No se pudieron iniciar las descargas",
      );
    }

    return successCount;
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  static async deleteDownload(download) {
    try {
      logger.debug(
        "🗑️ ELIMINANDO DESCARGA:",
        download.animeId,
        "ep",
        download.episodeNo,
      );
      const exists = await RNFS.exists(download.localPath);
      if (exists) {
        await RNFS.unlink(download.localPath);
      }

      const downloads = await this.getDownloads();
      const filtered = downloads.filter(
        (d) =>
          !(
            d.animeId === download.animeId &&
            String(d.episodeNo) === String(download.episodeNo)
          ),
      );
      this._metadataCache = filtered;
      await AsyncStorage.setItem(this.DOWNLOADS_KEY, JSON.stringify(filtered));

      CustomAlert.success("Eliminado", "El episodio ha sido eliminado");
      return true;
    } catch (error) {
      logger.error("❌ Error eliminando descarga:", error);
      CustomAlert.error("Error", "No se pudo eliminar el archivo");
      return false;
    }
  }

  // ─── Helpers de compatibilidad ────────────────────────────────────────────

  // Shim para llamadas que usen la firma antigua
  static async startDownload(videoLink, animeName, episodeNo, animeId) {
    await this.enqueueEpisode(animeId, animeName, episodeNo, videoLink);
    return { success: true };
  }

  static async getEpisodeLocalPath(animeId, episodeNo) {
    const downloads = await this.getDownloads();
    const download = downloads.find(
      (d) => d.animeId === animeId && String(d.episodeNo) === String(episodeNo),
    );
    return download ? download.localPath : null;
  }

  static async getDownloadedEpisodes(animeId) {
    const downloads = await this.getDownloads();
    return downloads.filter((d) => d.animeId === animeId);
  }
}

export default DownloadService;
