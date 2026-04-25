const logger = createLogger("history");
import { createLogger } from "../utils/logger";
// services/ListsService.js
// Servicio para gestionar listas personalizadas de anime (híbrido: local + Firestore)

import AsyncStorage from "@react-native-async-storage/async-storage";
import CloudListsService from "./CloudListsService";

const LISTS_KEY = "@anime_lists";
const listItemsKey = (listId) => `@list_items_${listId}`;

class ListsService {
  // 📋 Obtener todas las listas
  static async getLists() {
    try {
      const json = await AsyncStorage.getItem(LISTS_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      logger.error("Error obteniendo listas:", error);
      return [];
    }
  }

  // 📋 Obtener listas con metadata (conteo + thumbnail del primer anime)
  static async getListsWithMeta() {
    try {
      const lists = await this.getLists();
      const withMeta = await Promise.all(
        lists.map(async (list) => {
          const items = await this.getListItems(list.id);
          return {
            ...list,
            animeCount: items.length,
            thumbnail: items[0]?.thumbnail || null,
          };
        }),
      );
      return withMeta;
    } catch (error) {
      logger.error("Error obteniendo listas con meta:", error);
      return [];
    }
  }

  // ➕ Crear nueva lista
  static async createList(name) {
    try {
      const lists = await this.getLists();
      const newList = {
        id: `list_${Date.now()}`,
        name: name.trim(),
        createdAt: Date.now(),
      };
      lists.unshift(newList);
      await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
      logger.debug("✅ Lista creada:", newList.name);
      CloudListsService.uploadLists(lists); // async fire-and-forget
      return newList;
    } catch (error) {
      logger.error("Error creando lista:", error);
      throw error;
    }
  }

  // 🗑️ Eliminar lista
  static async deleteList(listId) {
    try {
      const lists = await this.getLists();
      const filtered = lists.filter((l) => l.id !== listId);
      await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(filtered));
      await AsyncStorage.removeItem(listItemsKey(listId));
      logger.debug("🗑️ Lista eliminada:", listId);
      CloudListsService.uploadLists(filtered);
      CloudListsService.deleteListItems(listId);
    } catch (error) {
      logger.error("Error eliminando lista:", error);
      throw error;
    }
  }

  // 📝 Renombrar lista
  static async renameList(listId, newName) {
    try {
      const lists = await this.getLists();
      const updated = lists.map((l) =>
        l.id === listId ? { ...l, name: newName.trim() } : l,
      );
      await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(updated));
      CloudListsService.uploadLists(updated);
    } catch (error) {
      logger.error("Error renombrando lista:", error);
      throw error;
    }
  }

  // 📺 Obtener animes de una lista
  static async getListItems(listId) {
    try {
      const json = await AsyncStorage.getItem(listItemsKey(listId));
      return json ? JSON.parse(json) : [];
    } catch (error) {
      logger.error("Error obteniendo items de lista:", error);
      return [];
    }
  }

  // ➕ Añadir anime a una lista
  static async addAnimeToList(listId, anime) {
    try {
      const items = await this.getListItems(listId);
      const exists = items.find((i) => i.animeId === anime.animeId);
      if (exists) return { success: true, alreadyExists: true };

      items.unshift({
        animeId: anime.animeId,
        animeName: anime.animeName,
        thumbnail: anime.thumbnail || null,
        addedAt: Date.now(),
      });
      await AsyncStorage.setItem(listItemsKey(listId), JSON.stringify(items));
      logger.debug("✅ Anime añadido a lista:", anime.animeName);
      CloudListsService.uploadListItems(listId, items);
      return { success: true };
    } catch (error) {
      logger.error("Error añadiendo anime a lista:", error);
      throw error;
    }
  }

  // 🗑️ Quitar anime de una lista
  static async removeAnimeFromList(listId, animeId) {
    try {
      const items = await this.getListItems(listId);
      const filtered = items.filter((i) => i.animeId !== animeId);
      await AsyncStorage.setItem(
        listItemsKey(listId),
        JSON.stringify(filtered),
      );
      logger.debug("🗑️ Anime removido de lista:", animeId);
      CloudListsService.uploadListItems(listId, filtered);
    } catch (error) {
      logger.error("Error removiendo anime de lista:", error);
      throw error;
    }
  }

  // 🔍 Comprobar si un anime ya está en una lista
  static async isAnimeInList(listId, animeId) {
    try {
      const items = await this.getListItems(listId);
      return items.some((i) => i.animeId === animeId);
    } catch {
      return false;
    }
  }

  // ☁️ Sincronizar bidireccional: local ↔ Firestore
  static async syncFromCloud() {
    try {
      logger.debug("🔄 [Lists] Iniciando sync bidireccional...");
      const cloudData = await CloudListsService.downloadAll();
      if (!cloudData) {
        logger.debug("🔄 [Lists] Sin auth o error, abortando");
        return;
      }

      const { lists: cloudLists, itemsByList: cloudItems } = cloudData;
      const localLists = await this.getLists();
      logger.debug(
        `🔄 [Lists] Local: ${localLists.length} | Cloud: ${cloudLists.length}`,
      );

      // Merge listas: gana el más reciente por createdAt
      const mergedMap = new Map();
      [...cloudLists, ...localLists].forEach((l) => {
        const existing = mergedMap.get(l.id);
        if (!existing || l.createdAt > existing.createdAt) {
          mergedMap.set(l.id, l);
        }
      });
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => b.createdAt - a.createdAt,
      );
      await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(merged));

      // Merge items por lista: local + cloud, deduplicado por animeId
      const mergedItems = {};
      for (const list of merged) {
        const localItems = await this.getListItems(list.id);
        const cloudListItems = cloudItems[list.id] || [];
        const itemMap = new Map();
        [...cloudListItems, ...localItems].forEach((i) =>
          itemMap.set(i.animeId, i),
        );
        mergedItems[list.id] = Array.from(itemMap.values());
        await AsyncStorage.setItem(
          listItemsKey(list.id),
          JSON.stringify(mergedItems[list.id]),
        );
      }

      // Subir merged completo a Firestore
      await CloudListsService.uploadLists(merged);
      for (const [listId, items] of Object.entries(mergedItems)) {
        await CloudListsService.uploadListItems(listId, items);
      }

      const totalItems = Object.values(mergedItems).reduce(
        (acc, a) => acc + a.length,
        0,
      );
      logger.debug(
        `✅ [Lists] Sync completado: ${merged.length} listas, ${totalItems} animes`,
      );
    } catch (error) {
      logger.warn("❌ [Lists] syncFromCloud error:", error.message);
    }
  }

  // 🔍 Obtener en qué listas está un anime
  static async getListsForAnime(animeId) {
    try {
      const lists = await this.getLists();
      const result = [];
      for (const list of lists) {
        const items = await this.getListItems(list.id);
        const inList = items.some((i) => i.animeId === animeId);
        result.push({ ...list, inList, animeCount: items.length });
      }
      return result;
    } catch (error) {
      logger.error("Error obteniendo listas para anime:", error);
      return [];
    }
  }
}

export default ListsService;
