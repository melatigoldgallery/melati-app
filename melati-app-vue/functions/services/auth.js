import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db, admin } from "../config.js";
import {
  verifyPasswordHash,
  buildLegacyUid,
  buildFloorUserDocId,
  normalizeUserRole,
  isRoleAllowedForFloor,
} from "../helpers/auth-helpers.js";

export const loginWithUsername = onCall(
  {
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async (request) => {
    const username = String(request.data?.username || "").trim();
    const password = String(request.data?.password || "");
    const floorIdRaw = String(request.data?.floorId || "")
      .trim()
      .toUpperCase();
    const floorId = ["L1", "L2"].includes(floorIdRaw) ? floorIdRaw : "L1";

    if (!username || !password) {
      throw new HttpsError("invalid-argument", "Username dan password wajib diisi.");
    }

    const usernameLower = username.toLowerCase();
    const candidateDocIds = [buildFloorUserDocId(floorId, username), `${floorId}_${usernameLower}`, username];
    if (username !== usernameLower) {
      candidateDocIds.push(`${floorId}_${username}`);
      candidateDocIds.push(usernameLower);
    }
    const usernameCandidates = [...new Set([username, usernameLower])];

    const floorUsersRef = db.collection("floors").doc(floorId).collection("users");

    let userSnap = null;
    let userSource = "floor";
    for (const userDocId of [...new Set(candidateDocIds)]) {
      // eslint-disable-next-line no-await-in-loop
      const candidate = await floorUsersRef.doc(userDocId).get();
      if (candidate.exists) {
        userSnap = candidate;
        break;
      }
    }

    if (!userSnap?.exists) {
      for (const candidateUsername of usernameCandidates) {
        // eslint-disable-next-line no-await-in-loop
        const querySnap = await floorUsersRef.where("username", "==", candidateUsername).limit(1).get();
        if (!querySnap.empty) {
          userSnap = querySnap.docs[0];
          break;
        }
      }
    }

    if (!userSnap?.exists) {
      const querySnap = await floorUsersRef.where("usernameLower", "==", usernameLower).limit(1).get();
      if (!querySnap.empty) {
        userSnap = querySnap.docs[0];
      }
    }

    // Backward-compat for legacy users collection (pre-floor deployment).
    // Kept for L1 so akun lama tetap bisa login tanpa mengganggu isolasi L2.
    if (!userSnap?.exists && floorId === "L1") {
      const legacyUsersRef = db.collection("users");

      for (const userDocId of [...new Set(candidateDocIds)]) {
        // eslint-disable-next-line no-await-in-loop
        const candidate = await legacyUsersRef.doc(userDocId).get();
        if (candidate.exists) {
          userSnap = candidate;
          userSource = "legacy-global";
          break;
        }
      }

      if (!userSnap?.exists) {
        for (const candidateUsername of usernameCandidates) {
          // eslint-disable-next-line no-await-in-loop
          const queryByUsername = await legacyUsersRef.where("username", "==", candidateUsername).limit(1).get();
          if (!queryByUsername.empty) {
            userSnap = queryByUsername.docs[0];
            userSource = "legacy-global";
            break;
          }
        }
      }

      if (!userSnap?.exists) {
        const queryByUsernameLower = await legacyUsersRef.where("usernameLower", "==", usernameLower).limit(1).get();
        if (!queryByUsernameLower.empty) {
          userSnap = queryByUsernameLower.docs[0];
          userSource = "legacy-global";
        }
      }
    }

    if (!userSnap?.exists) {
      throw new HttpsError("not-found", "Username tidak ditemukan.");
    }

    const userData = userSnap.data() || {};
    const userFloorIdRaw = String(userData.floorId || "")
      .trim()
      .toUpperCase();
    const userFloorId = ["L1", "L2"].includes(userFloorIdRaw)
      ? userFloorIdRaw
      : userSource === "legacy-global"
        ? "L1"
        : floorId;

    if (userFloorId !== floorId) {
      throw new HttpsError("permission-denied", "Akun tidak terdaftar untuk lantai yang dipilih.");
    }

    const status = String(userData.status || "active").toLowerCase();
    if (status !== "active") {
      throw new HttpsError("failed-precondition", "Akun tidak aktif.");
    }

    if (!verifyPasswordHash(password, userData.passwordHash)) {
      throw new HttpsError("permission-denied", "Password salah.");
    }

    const usernameValue = String(userData.username || userSnap.id);
    const role = normalizeUserRole(userData.role, "staff");
    if (!isRoleAllowedForFloor(role, floorId)) {
      throw new HttpsError("failed-precondition", `Role ${role} tidak diizinkan untuk ${floorId}.`);
    }
    const displayName = String(userData.displayName || usernameValue);
    const email = userData.email ? String(userData.email) : null;
    const uid = userData.uid ? String(userData.uid) : buildLegacyUid(usernameValue);

    let customToken;
    try {
      const floorRoles = { [floorId]: role };
      customToken = await admin.auth().createCustomToken(uid, {
        role,
        username: usernameValue,
        floorId,
        allowedFloors: [floorId],
        floorRoles,
        authMode: "legacy",
      });
    } catch (error) {
      logger.error("Failed creating custom token", {
        username: usernameValue,
        floorId,
        code: error?.errorInfo?.code || error?.code || "unknown",
        message: error?.message,
      });

      if (error?.errorInfo?.code === "auth/insufficient-permission") {
        throw new HttpsError(
          "failed-precondition",
          "Konfigurasi IAM untuk custom token belum lengkap. Hubungi admin sistem.",
        );
      }

      throw new HttpsError("internal", "Gagal membuat custom token.");
    }

    logger.info("Username login success", { username: usernameValue, role, floorId });

    return {
      customToken,
      username: usernameValue,
      role,
      floorId,
      displayName,
      email,
    };
  },
);
