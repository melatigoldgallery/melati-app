import { storage } from "../configFirebase.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

/**
 * Validate image file before upload
 * @param {File} file - Image file to validate
 * @throws {Error} - If file is invalid
 */
export function validateImageFile(file) {
  if (!file) {
    throw new Error("File tidak boleh kosong");
  }

  // Check file type
  const validTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Format file harus JPG atau PNG");
  }

  // Check file size (max 10MB before compression)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("Ukuran file maksimal 10MB");
  }

  return true;
}

/**
 * Compress image file
 * @param {File} file - Image file to compress
 * @returns {Promise<File>} - Compressed file
 */
export async function compressImage(file) {
  try {
    const options = {
      maxSizeMB: 0.5, // 500KB
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/jpeg",
    };

    const compressedFile = await window.imageCompression(file, options);
    console.log("Image compressed from", formatFileSize(file.size), "to", formatFileSize(compressedFile.size));
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    throw new Error("Gagal mengkompres gambar: " + error.message);
  }
}

/**
 * Upload bukti pengambilan ke Firebase Storage
 * @param {File} file - Image file to upload (already compressed)
 * @param {string} servisId - ID servis untuk naming
 * @returns {Promise<Object>} - Object dengan url, fileName, fileSize, storagePath
 */
export async function uploadBuktiPengambilan(file, servisId) {
  try {
    // File should already be compressed, but validate again
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      throw new Error("Format file harus JPG atau PNG");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `servis_${servisId}_${timestamp}.jpg`;

    // Create storage reference
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const storagePath = `bukti-pengambilan/${year}/${month}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    console.log("Uploading to:", storagePath);
    await uploadBytes(storageRef, file, {
      contentType: "image/jpeg",
    });

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    console.log("Upload successful:", downloadURL);

    return {
      url: downloadURL,
      path: storagePath,
      fileName: fileName,
      fileSize: file.size,
    };
  } catch (error) {
    console.error("Error uploading bukti pengambilan:", error);
    throw new Error("Gagal mengupload foto: " + error.message);
  }
}

/**
 * Delete bukti pengambilan dari Firebase Storage
 * @param {string} storagePath - Path file di storage
 */
export async function deleteBuktiPengambilan(storagePath) {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error("Error deleting bukti pengambilan:", error);
    throw error;
  }
}

/**
 * Format file size ke readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size (e.g., "245 KB")
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
