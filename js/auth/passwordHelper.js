/**
 * Password Helper Module
 * Uses Web Crypto API (SHA-256) for password hashing
 * No external dependencies required
 */

/**
 * Hash password using SHA-256
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password in hex format
 */
export async function hashPassword(password) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
}

/**
 * Verify password against stored hash
 * @param {string} inputPassword - Password to verify
 * @param {string} storedHash - Stored hash from database
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(inputPassword, storedHash) {
  try {
    const inputHash = await hashPassword(inputPassword);
    return inputHash === storedHash;
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

/**
 * Generate random salt (for future use if needed)
 * @param {number} length - Length of salt
 * @returns {string} Random salt in hex format
 */
export function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
