const logger = createLogger("history");
import { createLogger } from "../utils/logger";
// src/services/CloudListsService.js
// Sincronización de listas personalizadas con Firebase Firestore

import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import AuthService from "./AuthService";

// Estructura Firestore:
//   userLists/{userId}         → { userId, lists: [...], updatedAt }
//   userListItems/{userId}_{listId} → { userId, listId, items: [...], updatedAt }

class CloudListsService {
  static LISTS_COLLECTION = "userLists";
  static ITEMS_COLLECTION = "userListItems";

  static getUser() {
    return AuthService.getCurrentUser();
  }

  // ──────────────────────────────────────────────────────
  // 📤 Subir array completo de listas (metadatos)
  // ──────────────────────────────────────────────────────
  static async uploadLists(lists) {
    const user = this.getUser();
    if (!user) return;
    try {
      await setDoc(
        doc(db, this.LISTS_COLLECTION, user.uid),
        { userId: user.uid, lists, updatedAt: serverTimestamp() },
        { merge: false },
      );
    } catch (e) {
      logger.warn("☁️ [Lists] Error subiendo listas:", e.message);
    }
  }

  // ──────────────────────────────────────────────────────
  // 📤 Subir items de una lista específica
  // ──────────────────────────────────────────────────────
  static async uploadListItems(listId, items) {
    const user = this.getUser();
    if (!user) return;
    try {
      const docId = `${user.uid}_${listId}`;
      await setDoc(
        doc(db, this.ITEMS_COLLECTION, docId),
        { userId: user.uid, listId, items, updatedAt: serverTimestamp() },
        { merge: false },
      );
    } catch (e) {
      logger.warn("☁️ [Lists] Error subiendo items:", e.message);
    }
  }

  // ──────────────────────────────────────────────────────
  // 🗑️ Borrar items de una lista (cuando se elimina la lista)
  // ──────────────────────────────────────────────────────
  static async deleteListItems(listId) {
    const user = this.getUser();
    if (!user) return;
    try {
      const docId = `${user.uid}_${listId}`;
      await deleteDoc(doc(db, this.ITEMS_COLLECTION, docId));
    } catch (e) {
      logger.warn("☁️ [Lists] Error borrando items:", e.message);
    }
  }

  // ──────────────────────────────────────────────────────
  // 📥 Descargar listas + todos sus items del usuario
  // ──────────────────────────────────────────────────────
  static async downloadAll() {
    const user = this.getUser();
    if (!user) {
      logger.debug("☁️ [Lists] Sin usuario autenticado, skip download");
      return null;
    }
    try {
      logger.debug("☁️ [Lists] Descargando desde Firestore para:", user.uid);
      // 1. Metadatos de listas
      const listsSnap = await getDoc(doc(db, this.LISTS_COLLECTION, user.uid));
      if (!listsSnap.exists()) {
        logger.debug("☁️ [Lists] No hay documento de listas en Firestore");
        return { lists: [], itemsByList: {} };
      }

      const { lists } = listsSnap.data();
      logger.debug(`☁️ [Lists] Encontradas ${lists?.length ?? 0} listas`);

      // 2. Items de cada lista (por docId, evita query con permisos de colección)
      const itemsByList = {};
      for (const list of lists) {
        const docId = `${user.uid}_${list.id}`;
        const itemSnap = await getDoc(doc(db, this.ITEMS_COLLECTION, docId));
        itemsByList[list.id] = itemSnap.exists()
          ? itemSnap.data().items || []
          : [];
      }

      logger.debug(`☁️ [Lists] Descargadas ${lists.length} listas de Firestore`);
      return { lists, itemsByList };
    } catch (e) {
      logger.warn("☁️ [Lists] Error descargando:", e.code, e.message);
      return null;
    }
  }
}

export default CloudListsService;
