import { defineStore } from "pinia";
import { ref as dbRef, onValue, update, off } from "firebase/database";
import { rtdb, storage } from "@/config/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

export const usePromotionStore = defineStore("promotion", {
  state: () => ({
    settings: {
      slideInterval: 5000,
      transitionEffect: "fade",
      enableAnimation: true,
      showControls: false,
      autoPlay: true,
    },
    slides: [], // Array {id, type, url, title, caption, order, isActive}
    isConnected: true,
  }),

  getters: {
    activeSlides: (state) => state.slides.filter((s) => s.isActive).sort((a, b) => a.order - b.order),
  },

  actions: {
    startListening() {
      const settingsRef = dbRef(rtdb, "settings/promotion");
      const contentRef = dbRef(rtdb, "content/promotion/slides");
      const connRef = dbRef(rtdb, ".info/connected");

      onValue(connRef, (snap) => {
        this.isConnected = snap.val() === true;
      });

      onValue(settingsRef, (snap) => {
        if (snap.exists()) {
          this.settings = { ...this.settings, ...snap.val() };
        }
      });

      onValue(contentRef, (snap) => {
        if (snap.exists()) {
          this.slides = Object.values(snap.val());
        } else {
          this.slides = [];
        }
      });
    },

    stopListening() {
      off(dbRef(rtdb, "settings/promotion"));
      off(dbRef(rtdb, "content/promotion/slides"));
      off(dbRef(rtdb, ".info/connected"));
    },

    // Fallback manual refresh (dipanggil setiap 60 detik di DisplayPromosiView)
    refreshSlides() {
      // Realtime DB listener sudah aktif — ini no-op jika listener OK
      // Jika listener putus, data sudah stale — user perlu reload
    },

    async saveSettings(newSettings) {
      await update(dbRef(rtdb, "settings/promotion"), {
        ...newSettings,
        updatedAt: Date.now(),
      });
    },

    async uploadSlide(file, metadata, onProgress) {
      const ext = file.name.split(".").pop().toLowerCase();
      const slideId = crypto.randomUUID();
      const path = `promotions/${slideId}.${ext}`;
      const fileRef = storageRef(storage, path);
      const task = uploadBytesResumable(fileRef, file);

      return new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            if (onProgress) onProgress(pct);
          },
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            const order = this.slides.length;
            const slide = {
              id: slideId,
              type: file.type.startsWith("video") ? "video" : "image",
              url,
              path,
              title: metadata.title || "",
              caption: metadata.caption || "",
              order,
              isActive: true,
              uploadedAt: Date.now(),
            };
            await update(dbRef(rtdb, `content/promotion/slides/${slideId}`), slide);
            resolve(slide);
          },
        );
      });
    },

    async deleteSlide(slideId) {
      const slide = this.slides.find((s) => s.id === slideId);
      if (!slide) return;

      // Hapus dari Storage
      try {
        const fileRef = storageRef(storage, slide.path);
        await deleteObject(fileRef);
      } catch {
        /* file mungkin sudah tidak ada */
      }

      // Hapus dari Realtime DB
      await update(dbRef(rtdb, `content/promotion/slides/${slideId}`), null);
    },

    async reorderSlides(orderedIds) {
      const updates = {};
      orderedIds.forEach((id, idx) => {
        updates[`content/promotion/slides/${id}/order`] = idx;
      });
      await update(dbRef(rtdb), updates);
    },
  },
});
