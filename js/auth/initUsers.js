/**
 * initUsers.js - DEPRECATED
 * This file is kept for backward compatibility only.
 * New authentication system uses Firestore with hashed passwords.
 * See: js/auth/passwordHelper.js and js/login.js
 */

import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { verifyPassword } from "./passwordHelper.js";

/**
 * @deprecated Use Firestore authentication instead
 */
export async function initializeUsers() {
  console.warn("initializeUsers is deprecated. Users are now managed in Firestore.");
  return true;
}

/**
 * @deprecated Use loginWithFirestore in login.js instead
 */
export async function loginUser(username, password) {
  console.warn("loginUser from initUsers.js is deprecated. Use Firestore authentication.");

  try {
    const db = getFirestore();
    const userDocRef = doc(db, "users", username);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return { success: false, message: "Username tidak ditemukan" };
    }

    const userData = userDocSnap.data();
    const isPasswordValid = await verifyPassword(password, userData.passwordHash);

    if (!isPasswordValid) {
      return { success: false, message: "Password salah" };
    }

    return {
      success: true,
      username: userData.username,
      role: userData.role,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Terjadi kesalahan saat login" };
  }
}
