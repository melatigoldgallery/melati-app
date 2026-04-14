const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

export function isSha256Hex(value) {
  return typeof value === "string" && SHA256_HEX_REGEX.test(value.trim());
}

export async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Browser tidak mendukung Web Crypto API.");
  }

  const normalized = String(value ?? "");
  const bytes = new TextEncoder().encode(normalized);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashSecret(value) {
  return sha256Hex(value);
}

function toBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value ?? ""));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export async function verifyStoredSecret(inputSecret, storedValue, { allowLegacyBase64 = false } = {}) {
  if (!storedValue) return false;

  const input = String(inputSecret ?? "");
  const stored = String(storedValue ?? "").trim();

  if (isSha256Hex(stored)) {
    const hashedInput = await sha256Hex(input);
    return hashedInput.toLowerCase() === stored.toLowerCase();
  }

  if (allowLegacyBase64 && toBase64Utf8(input) === stored) {
    return true;
  }

  return input === stored;
}
