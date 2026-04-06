import { defineStore } from "pinia";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null, // Firebase Auth user object
    userRole: null, // 'admin' | 'supervisor' | 'staf' | 'admin_custom'
    initialized: false, // true setelah onAuthStateChanged pertama kali resolve
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    currentUser: (state) => state.user,
  },

  actions: {
    // ── Dipanggil sekali saat app mount (main.js) ───────────────────────────
    init() {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          unsubscribe();
          if (firebaseUser) {
            this.user = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            };
            // Role disimpan di displayName ("admin|supervisor|staf|admin_custom")
            this.userRole = firebaseUser.displayName || "staf";
          } else {
            // Fallback: cek sessionStorage (kompatibilitas sistem lama)
            const session = sessionStorage.getItem("currentUser");
            if (session) {
              const parsed = JSON.parse(session);
              this.user = parsed;
              this.userRole = parsed.role || "staf";
            } else {
              this.user = null;
              this.userRole = null;
            }
          }
          this.initialized = true;
          resolve();
        });
      });
    },

    // ── Login ────────────────────────────────────────────────────────────────
    async login(email, password) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = credential.user;
      this.user = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      };
      this.userRole = firebaseUser.displayName || "staf";
      // Simpan ke sessionStorage untuk kompatibilitas modul lama
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          uid: this.user.uid,
          email: this.user.email,
          role: this.userRole,
        }),
      );
    },

    // ── Logout ───────────────────────────────────────────────────────────────
    async logout() {
      await signOut(auth);
      sessionStorage.removeItem("currentUser");
      this.user = null;
      this.userRole = null;
    },

    // ── Cek role helper ──────────────────────────────────────────────────────
    hasRole(roles) {
      return Array.isArray(roles) ? roles.includes(this.userRole) : this.userRole === roles;
    },
  },
});
