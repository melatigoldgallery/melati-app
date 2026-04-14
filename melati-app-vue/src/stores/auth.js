import { defineStore } from "pinia";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { auth, db, functions } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { buildUserAccessMap, getDefaultPageAccess } from "@/config/access-control";

function mapUsernameLoginError(err) {
  const code = err?.code || "";
  const message = String(err?.message || "");

  if (code === "functions/not-found") {
    const mapped = new Error("Username tidak ditemukan.");
    mapped.code = "auth/username-not-found";
    return mapped;
  }

  if (code === "functions/permission-denied") {
    const mapped = new Error("Password salah.");
    mapped.code = "auth/wrong-password";
    return mapped;
  }

  if (code === "functions/failed-precondition") {
    if (message.toLowerCase().includes("akun tidak aktif")) {
      const mapped = new Error("Akun tidak aktif.");
      mapped.code = "auth/user-disabled";
      return mapped;
    }

    const mapped = new Error("Konfigurasi server login belum lengkap. Hubungi admin sistem.");
    mapped.code = "auth/server-login-config";
    return mapped;
  }

  if (code === "functions/internal" || code === "functions/unavailable") {
    const mapped = new Error("Layanan login username sedang bermasalah. Coba lagi beberapa saat.");
    mapped.code = "auth/server-login-config";
    return mapped;
  }

  if (code === "auth/insufficient-permission") {
    const mapped = new Error("Konfigurasi server login belum lengkap. Hubungi admin sistem.");
    mapped.code = "auth/server-login-config";
    return mapped;
  }

  if (code === "functions/invalid-argument") {
    const mapped = new Error("Email/username dan password wajib diisi.");
    mapped.code = "auth/invalid-credential";
    return mapped;
  }

  return err;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null, // Firebase Auth user object
    userRole: null, // 'admin' | 'supervisor' | 'staf' | 'admin_custom'
    accessPages: {}, // pageKey -> boolean
    initialized: false, // true setelah onAuthStateChanged pertama kali resolve
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    currentUser: (state) => state.user,
    canAccessPage: (state) => (pageKey) => {
      if (!pageKey) return true;
      if (state.userRole === "supervisor") return true;
      // Admin must always be able to open access settings page.
      if (state.userRole === "admin" && (pageKey === "admin.access-codes" || pageKey === "admin.maintenance")) {
        return true;
      }
      if (typeof state.accessPages?.[pageKey] === "boolean") return state.accessPages[pageKey];
      return getDefaultPageAccess(pageKey, state.userRole || "staf");
    },
  },

  actions: {
    // ── Ambil role dari Firestore userRoles/{email}, fallback ke displayName ─
    async fetchRole(firebaseUser) {
      try {
        const token = await firebaseUser.getIdTokenResult();
        if (token?.claims?.role) return String(token.claims.role);
      } catch (_) {
        /* ignore token read errors */
      }

      try {
        if (firebaseUser.email) {
          const snap = await getDoc(doc(db, "userRoles", firebaseUser.email));
          if (snap.exists()) return snap.data().role || "staf";
        }
      } catch (_) {
        /* jaringan/permission error — gunakan fallback */
      }
      return firebaseUser.displayName || "staf";
    },

    async resolveUsername(firebaseUser, fallbackUsername = "") {
      if (fallbackUsername) return fallbackUsername;

      try {
        const token = await firebaseUser.getIdTokenResult();
        if (token?.claims?.username) return String(token.claims.username);
      } catch (_) {
        /* ignore */
      }

      try {
        if (firebaseUser.email) {
          const roleSnap = await getDoc(doc(db, "userRoles", firebaseUser.email));
          if (roleSnap.exists()) {
            const data = roleSnap.data() || {};
            if (data.username) return String(data.username);
          }
        }
      } catch (_) {
        /* ignore */
      }

      return "";
    },

    async loadAccessProfile(firebaseUser, fallbackUsername = "") {
      const username = await this.resolveUsername(firebaseUser, fallbackUsername || this.user?.username || "");
      if (this.user) this.user.username = username || this.user.username || "";

      if (!username) {
        this.accessPages = buildUserAccessMap(null, this.userRole || "staf");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", username));
        if (snap.exists()) {
          const userData = snap.data() || {};
          this.accessPages = buildUserAccessMap(userData, this.userRole || userData.role || "staf");
          if (this.user && !this.user.displayName) {
            this.user.displayName = userData.displayName || username;
          }
          return;
        }
      } catch (_) {
        /* ignore */
      }

      this.accessPages = buildUserAccessMap(null, this.userRole || "staf");
    },

    // ── Dipanggil sekali saat app mount (main.js) ───────────────────────────
    init() {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          unsubscribe();
          const sessionRaw = sessionStorage.getItem("currentUser");
          const sessionUser = sessionRaw ? JSON.parse(sessionRaw) : null;

          if (firebaseUser) {
            if (sessionUser?.authMode === "legacy") {
              this.user = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || sessionUser.email || null,
                username: sessionUser.username || "",
                displayName: sessionUser.displayName || sessionUser.username || firebaseUser.displayName,
              };
              this.userRole = sessionUser.role || "staf";
              await this.loadAccessProfile(firebaseUser, sessionUser.username || "");
            } else {
              const token = await firebaseUser.getIdTokenResult();
              this.user = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                username: token?.claims?.username ? String(token.claims.username) : "",
                displayName: firebaseUser.displayName,
              };
              this.userRole = await this.fetchRole(firebaseUser);
              await this.loadAccessProfile(firebaseUser, this.user.username || "");
            }
          } else {
            // Fallback: cek sessionStorage (kompatibilitas sistem lama)
            if (sessionUser) {
              this.user = sessionUser;
              this.userRole = sessionUser.role || "staf";
              this.accessPages = buildUserAccessMap(null, this.userRole);
            } else {
              this.user = null;
              this.userRole = null;
              this.accessPages = {};
            }
          }
          this.initialized = true;
          resolve();
        });
      });
    },

    async loginWithUsername(username, password) {
      try {
        const callable = httpsCallable(functions, "loginWithUsername");
        const result = await callable({ username, password });
        const payload = result?.data || {};

        if (!payload.customToken) {
          const err = new Error("Login username gagal: custom token tidak tersedia.");
          err.code = "auth/invalid-credential";
          throw err;
        }

        const credential = await signInWithCustomToken(auth, payload.customToken);
        const firebaseUser = credential.user;

        this.user = {
          uid: firebaseUser.uid,
          email: payload.email || firebaseUser.email || null,
          username: payload.username || username,
          displayName: payload.displayName || payload.username || username,
        };
        this.userRole = payload.role || "staf";
        await this.loadAccessProfile(firebaseUser, this.user.username || username);

        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            uid: this.user.uid,
            email: this.user.email,
            username: this.user.username,
            displayName: this.user.displayName,
            role: this.userRole,
            authMode: "legacy",
          }),
        );
      } catch (err) {
        throw mapUsernameLoginError(err);
      }
    },

    // ── Login ────────────────────────────────────────────────────────────────
    async login(identifier, password) {
      const normalized = String(identifier || "").trim();

      if (!normalized) {
        const err = new Error("Email/username wajib diisi.");
        err.code = "auth/invalid-credential";
        throw err;
      }

      if (!normalized.includes("@")) {
        await this.loginWithUsername(normalized, password);
        return;
      }

      const credential = await signInWithEmailAndPassword(auth, normalized, password);
      const firebaseUser = credential.user;
      this.user = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        username: "",
        displayName: firebaseUser.displayName,
      };
      this.userRole = await this.fetchRole(firebaseUser);
      await this.loadAccessProfile(firebaseUser, this.user.username || "");
      // Simpan ke sessionStorage untuk kompatibilitas modul lama
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          uid: this.user.uid,
          email: this.user.email,
          role: this.userRole,
          authMode: "firebase",
        }),
      );
    },

    // ── Logout ───────────────────────────────────────────────────────────────
    async logout() {
      await signOut(auth);
      sessionStorage.removeItem("currentUser");
      this.user = null;
      this.userRole = null;
      this.accessPages = {};
    },

    // ── Cek role helper ──────────────────────────────────────────────────────
    hasRole(roles) {
      return Array.isArray(roles) ? roles.includes(this.userRole) : this.userRole === roles;
    },
  },
});
