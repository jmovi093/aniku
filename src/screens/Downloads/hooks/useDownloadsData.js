const logger = createLogger("app");
import { createLogger } from "../../../utils/logger";
// screens/Downloads/hooks/useDownloadsData.js
// Hook para gestión de datos de descargas

import { useState, useEffect, useRef } from "react";
import DownloadService from "../../../services/DownloadService";

export const useDownloadsData = () => {
  const [groupedDownloads, setGroupedDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAnimes, setExpandedAnimes] = useState(new Set());
  const loadingRef = useRef(false);

  // 📱 Cargar datos iniciales + registrar listener S5
  useEffect(() => {
    loadDownloads();

    // S5: escuchar eventos de descarga para refrescar la lista automáticamente
    const listener = ({ state }) => {
      if (state === DownloadService.DOWNLOAD_STATES.COMPLETED) {
        // Nueva descarga terminada → refrescar lista (debounce con ref)
        if (!loadingRef.current) {
          loadDownloads();
        }
      }
    };

    DownloadService.addDownloadListener(listener);
    return () => DownloadService.removeDownloadListener(listener);
  }, []);

  // 📥 Función para cargar descargas
  const loadDownloads = async () => {
    if (loadingRef.current) return;
    try {
      loadingRef.current = true;
      setLoading(true);
      const downloadsList = await DownloadService.getDownloads();
      logger.debug("📱 DESCARGAS ENCONTRADAS:", downloadsList.length);

      // Agrupar descargas por anime
      const grouped = groupDownloadsByAnime(downloadsList);
      setGroupedDownloads(grouped);
    } catch (error) {
      logger.error("Error cargando descargas:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // 📁 Agrupar descargas por anime
  const groupDownloadsByAnime = (downloads) => {
    const grouped = {};

    downloads.forEach((download) => {
      const animeKey = download.animeId;

      if (!grouped[animeKey]) {
        grouped[animeKey] = {
          animeId: download.animeId,
          animeName: download.animeName,
          episodes: [],
          totalEpisodes: 0,
          totalSize: 0,
          lastDownload: download.downloadDate,
        };
      }

      grouped[animeKey].episodes.push(download);
      grouped[animeKey].totalEpisodes++;

      // Calcular tamaño total si está disponible
      if (download.fileSize) {
        grouped[animeKey].totalSize += parseInt(download.fileSize) || 0;
      }

      // Mantener la fecha de descarga más reciente
      if (download.downloadDate > grouped[animeKey].lastDownload) {
        grouped[animeKey].lastDownload = download.downloadDate;
      }
    });

    // Convertir a array y ordenar por fecha más reciente
    return Object.values(grouped).sort(
      (a, b) => new Date(b.lastDownload) - new Date(a.lastDownload),
    );
  };

  // 🔄 Toggle expansión de anime
  const toggleAnimeExpansion = (animeId) => {
    const newExpanded = new Set(expandedAnimes);
    if (newExpanded.has(animeId)) {
      newExpanded.delete(animeId);
    } else {
      newExpanded.add(animeId);
    }
    setExpandedAnimes(newExpanded);
  };

  return {
    groupedDownloads,
    loading,
    expandedAnimes,
    loadDownloads,
    toggleAnimeExpansion,
  };
};
