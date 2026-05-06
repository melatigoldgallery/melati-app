import { defineStore } from "pinia";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { auth, db, functions } from "@/config/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { floorCollection, floorDoc } from "@/services/floor-scope";
import { httpsCallable } from "firebase/functions";
import {
  buildUserAccessMap,
  createDefaultAccessMap,
  getDefaultPageAccess,
  normalizeUserRole,
} from "@/config/access-control";
import {
  buildFloorUserDocId,
  clearActiveFloor,
  getActiveFloor,
  normalizeFloorId,
  parseFloorFromUserDocId,
  setActiveFloor,
} from "@/config/floor-config";
import { resetThemeAppearanceToDefault } from "@/services/theme-settings-service";

function normalizeRoleForCompare(role) {
  const raw = String(role || "")
    .trim()
    .toLowerCase();
  if (raw === "staf") return "staff";
  return raw;
}

function mapUsernameLoginError(err) {
  const code = err?.code || "";
  const message = String(err?.message || "");

  if (code === "functions/not-found") {
    const mapped = new Error("Username tidak ditemukan.");
    mapped.code = "auth/username-not-found";
    return mapped;
  }

  if (code === "functions/permission-denied") {
    if (message.toLowerCase().includes("lantai")) {
      const mapped = new Error("Akun tidak terdaftar untuk lantai yang dipilih.");
      mapped.code = "auth/floor-user-mismatch";
      return mapped;
    }
    const mapped = new Error("Password salah.");
    mapped.code = "auth/wrong-password";
    return mapped;
  }

  if (code === "functions/failed-precondition") {
    if (message.toLowerCase().includes("tidak diizinkan")) {
      const mapped = new Error("Role akun tidak diizinkan untuk lantai yang dipilih.");
      mapped.code = "auth/floor-role-not-allowed";
      return mapped;
    }
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

function createNoAccessMap(role = "staff") {
  const normalizedRole = normalizeUserRole(role, "staff");
  const map = createDefaultAccessMap(normalizedRole);
  Object.keys(map).forEach((key) => {
    map[key] = false;
  });
  return map;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null, // Firebase Auth user object
    userRole: null, // 'admin' | 'supervisor' | 'staff' | 'hrd' | 'admin_custom'
    activeFloor: getActiveFloor(),
    accessPages: {}, // pageKey -> boolean
    initialized: false, // true setelah onAuthStateChanged pertama kali resolve
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    currentUser: (state) => state.user,
    canAccessPage: (state) => (pageKey) => {
      if (!pageKey) return true;
      const role = normalizeUserRole(state.userRole, "staff");
      if (role === "supervisor") return true;
      if (typeof state.accessPages?.[pageKey] === "boolean") return state.accessPages[pageKey];
      return getDefaultPageAccess(pageKey, role);
    },
  },

  actions: {
    // ── Ambil role dari Firestore userRoles/{email}, fallback ke displayName ─
    async fetchRole(firebaseUser) {
      try {
        const token = await firebaseUser.getIdTokenResult();
        if (token?.claims?.role) return normalizeUserRole(token.claims.role, "staff");
      } catch (_) {
        /* ignore token read errors */
      }

      try {
        if (firebaseUser.email) {
          const snap = await getDoc(
            floorDoc(db, "userRoles", firebaseUser.email, this.activeFloor || getActiveFloor()),
          );
          if (snap.exists()) return normalizeUserRole(snap.data().role, "staff");
        }
      } catch (_) {
        /* jaringan/permission error — gunakan fallback */
      }
      return normalizeUserRole(firebaseUser.displayName, "staff");
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
          const roleSnap = await getDoc(
            floorDoc(db, "userRoles", firebaseUser.email, this.activeFloor || getActiveFloor()),
          );
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

    setFloorSelection(floorId) {
      this.activeFloor = setActiveFloor(floorId);
      return this.activeFloor;
    },

    resolveUserDocCandidates(username, floorId) {
      const normalizedUsername = String(username || "").trim();
      const normalizedUsernameLower = normalizedUsername.toLowerCase();
      const normalizedFloor = normalizeFloorId(floorId);
      if (!normalizedUsername) return [];

      const candidates = [];
      if (normalizedFloor) candidates.push(buildFloorUserDocId(normalizedFloor, normalizedUsername));
      if (normalizedFloor) candidates.push(`${normalizedFloor}_${normalizedUsernameLower}`);
      candidates.push(normalizedUsername);

      if (normalizedUsername !== normalizedUsernameLower) {
        if (normalizedFloor) candidates.push(`${normalizedFloor}_${normalizedUsername}`);
        candidates.push(normalizedUsernameLower);
      }

      return [...new Set(candidates)];
    },

    async findUserProfileByDocIds(candidateIds) {
      for (const userDocId of candidateIds) {
        try {
          const snap = await getDoc(floorDoc(db, "users", userDocId, this.activeFloor || getActiveFloor()));
          if (snap.exists()) {
            return { id: snap.id, data: snap.data() || {} };
          }
        } catch (_) {
          // ignore
        }
      }
      return null;
    },

    async findUserProfileByEmail(email, floorId) {
      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();
      const normalizedFloor = normalizeFloorId(floorId);
      if (!normalizedEmail || !normalizedFloor) return null;

      try {
        const snap = await getDocs(floorCollection(db, "users", normalizedFloor));
        const match = snap.docs.find((d) => {
          const data = d.data() || {};
          const userEmail = String(data.email || "")
            .trim()
            .toLowerCase();
          if (!userEmail || userEmail !== normalizedEmail) return false;

          const floorFromData = normalizeFloorId(data.floorId);
          const floorFromDoc = parseFloorFromUserDocId(d.id);
          const effectiveFloor = floorFromData || floorFromDoc || "L1";
          return effectiveFloor === normalizedFloor;
        });

        if (match) {
          return { id: match.id, data: match.data() || {} };
        }
      } catch (_) {
        // ignore
      }

      return null;
    },

    async findLegacyUserProfileByDocIds(candidateIds) {
      for (const userDocId of candidateIds) {
        try {
          const snap = await getDoc(doc(db, "users", userDocId));
          if (snap.exists()) {
            return { id: snap.id, data: snap.data() || {} };
          }
        } catch (_) {
          // ignore
        }
      }
      return null;
    },

    async findLegacyUserProfileByEmail(email) {
      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();
      if (!normalizedEmail) return null;

      try {
        const snap = await getDocs(collection(db, "users"));
        const match = snap.docs.find((d) => {
          const data = d.data() || {};
          const userEmail = String(data.email || "")
            .trim()
            .toLowerCase();
          return userEmail && userEmail === normalizedEmail;
        });

        if (match) {
          return { id: match.id, data: match.data() || {} };
        }
      } catch (_) {
        // ignore
      }

      return null;
    },

    async loadAccessProfile(firebaseUser, fallbackUsername = "", floorId = "") {
      const selectedFloor = normalizeFloorId(floorId || this.activeFloor || getActiveFloor());
      if (selectedFloor) {
        this.activeFloor = setActiveFloor(selectedFloor);
      }

      const username = await this.resolveUsername(firebaseUser, fallbackUsername || this.user?.username || "");
      if (this.user) this.user.username = username || this.user.username || "";

      const candidateIds = this.resolveUserDocCandidates(username, selectedFloor);
      let userProfile = await this.findUserProfileByDocIds(candidateIds);

      if (!userProfile && firebaseUser?.email) {
        userProfile = await this.findUserProfileByEmail(firebaseUser.email, selectedFloor);
      }

      if (!userProfile && selectedFloor === "L1") {
        userProfile = await this.findLegacyUserProfileByDocIds(candidateIds);

        if (!userProfile && firebaseUser?.email) {
          userProfile = await this.findLegacyUserProfileByEmail(firebaseUser.email);
        }
      }

      if (userProfile) {
        const userData = userProfile.data || {};
        if (this.user) {
          this.user.username = userData.username || username || this.user.username || "";
          this.user.displayName = userData.displayName || this.user.displayName || this.user.username || "";
        }

        this.userRole = normalizeUserRole(userData.role, this.userRole || "staff");
        this.accessPages = buildUserAccessMap(userData, this.userRole || "staff");
        return { found: true, userData, userDocId: userProfile.id };
      }

      this.accessPages = createNoAccessMap(this.userRole || "staff");
      return { found: false };
    },

    // ── Dipanggil sekali saat app mount (main.js) ───────────────────────────
    init() {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          unsubscribe();

          try {
            const sessionRaw = sessionStorage.getItem("currentUser");
            let sessionUser = null;

            if (sessionRaw) {
              try {
                sessionUser = JSON.parse(sessionRaw);
              } catch (_) {
                sessionStorage.removeItem("currentUser");
              }
            }

            if (firebaseUser) {
              if (sessionUser?.authMode === "legacy") {
                this.user = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || sessionUser.email || null,
                  username: sessionUser.username || "",
                  displayName: sessionUser.displayName || sessionUser.username || firebaseUser.displayName,
                };
                this.userRole = normalizeUserRole(sessionUser.role, "staff");
                const floor = normalizeFloorId(sessionUser.floorId || this.activeFloor || getActiveFloor());
                this.activeFloor = floor || this.activeFloor;
                if (this.activeFloor) setActiveFloor(this.activeFloor);
                await this.loadAccessProfile(firebaseUser, sessionUser.username || "", this.activeFloor);
              } else {
                const token = await firebaseUser.getIdTokenResult();
                this.user = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  username: token?.claims?.username ? String(token.claims.username) : "",
                  displayName: firebaseUser.displayName,
                };
                this.userRole = await this.fetchRole(firebaseUser);
                const floor = normalizeFloorId(token?.claims?.floorId || this.activeFloor || getActiveFloor());
                this.activeFloor = floor || this.activeFloor;
                if (this.activeFloor) setActiveFloor(this.activeFloor);
                await this.loadAccessProfile(firebaseUser, this.user.username || "", this.activeFloor);
              }
            } else {
              // Fallback: cek sessionStorage (kompatibilitas sistem lama)
              if (sessionUser) {
                this.user = {
                  ...sessionUser,
                  role: normalizeUserRole(sessionUser.role, "staff"),
                };
                this.userRole = normalizeUserRole(sessionUser.role, "staff");
                this.activeFloor = normalizeFloorId(sessionUser.floorId || this.activeFloor || getActiveFloor()) || "";
                if (this.activeFloor) setActiveFloor(this.activeFloor);
                const sessionAccessProfile = {
                  pagesAccess: sessionUser.pagesAccess,
                  permissions: sessionUser.permissions,
                };
                this.accessPages = buildUserAccessMap(sessionAccessProfile, this.userRole || "staff");
              } else {
                this.user = null;
                this.userRole = null;
                this.activeFloor = getActiveFloor();
                this.accessPages = {};
              }
            }
          } catch (_) {
            // Prevent first navigation from hanging if auth/session parsing fails.
            this.user = null;
            this.userRole = null;
            this.accessPages = {};
          } finally {
            this.initialized = true;
            resolve();
          }
        });
      });
    },

    async loginWithUsername(username, password) {
      const selectedFloor = normalizeFloorId(this.activeFloor || getActiveFloor());
      if (!selectedFloor) {
        const err = new Error("Silakan pilih lantai terlebih dahulu.");
        err.code = "auth/floor-required";
        throw err;
      }

      try {
        const callable = httpsCallable(functions, "loginWithUsername");
        const result = await callable({ username, password, floorId: selectedFloor });
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
        this.activeFloor = setActiveFloor(payload.floorId || selectedFloor);
        this.userRole = normalizeUserRole(payload.role, "staff");
        const accessProfile = await this.loadAccessProfile(
          firebaseUser,
          this.user.username || username,
          this.activeFloor,
        );
        if (!accessProfile?.found) {
          const mismatchErr = new Error("Akun tidak terdaftar untuk lantai yang dipilih.");
          mismatchErr.code = "auth/floor-user-mismatch";
          throw mismatchErr;
        }

        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            uid: this.user.uid,
            email: this.user.email,
            username: this.user.username,
            displayName: this.user.displayName,
            role: this.userRole,
            floorId: this.activeFloor,
            pagesAccess: this.accessPages,
            authMode: "legacy",
          }),
        );
      } catch (err) {
        throw mapUsernameLoginError(err);
      }
    },

    // ── Login ────────────────────────────────────────────────────────────────
    async login(identifier, password, floorId = "") {
      const selectedFloor = normalizeFloorId(floorId || this.activeFloor || getActiveFloor());
      if (!selectedFloor) {
        const err = new Error("Silakan pilih lantai terlebih dahulu.");
        err.code = "auth/floor-required";
        throw err;
      }
      this.activeFloor = setActiveFloor(selectedFloor);

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
      const accessProfile = await this.loadAccessProfile(firebaseUser, this.user.username || "", this.activeFloor);
      if (!accessProfile?.found) {
        await signOut(auth);
        sessionStorage.removeItem("currentUser");
        const err = new Error("Akun tidak terdaftar untuk lantai yang dipilih.");
        err.code = "auth/floor-user-mismatch";
        throw err;
      }
      // Simpan ke sessionStorage untuk kompatibilitas modul lama
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          uid: this.user.uid,
          email: this.user.email,
          username: this.user.username,
          displayName: this.user.displayName,
          role: this.userRole,
          floorId: this.activeFloor,
          pagesAccess: this.accessPages,
          authMode: "firebase",
        }),
      );
    },

    // ── Logout ───────────────────────────────────────────────────────────────
    async logout() {
      await signOut(auth);
      sessionStorage.removeItem("currentUser");
      clearActiveFloor();
      // Reset theme CSS variables to default when logging out
      resetThemeAppearanceToDefault();
      this.user = null;
      this.userRole = null;
      this.activeFloor = "";
      this.accessPages = {};
    },

    // ── Cek role helper ──────────────────────────────────────────────────────
    hasRole(roles) {
      const currentRole = normalizeRoleForCompare(this.userRole);
      if (Array.isArray(roles)) {
        return roles.some((role) => normalizeRoleForCompare(role) === currentRole);
      }
      return normalizeRoleForCompare(roles) === currentRole;
    },
  },
});
