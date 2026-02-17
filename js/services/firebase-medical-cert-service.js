/**
 * Firebase Medical Certificate Upload Service
 * Handles uploading medical certificates to Firebase Storage
 * Replaces cloudinary-service.js functionality
 */

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

/**
 * Upload medical certificate to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} employeeId - Employee ID for file organization
 * @param {Function} onProgress - Callback for progress updates (optional)
 * @returns {Promise<Object>} Upload result with url, path, name, type, size, uploadedAt
 */
export async function uploadMedicalCertificate(file, employeeId, onProgress = null) {
  try {
    // Validate file before upload
    const validation = validateMedicalCertFile(file);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const storage = getStorage();

    // Generate file path structure: medical-certificates/{year}/{month}/{filename}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const timestamp = Date.now();
    const uuid = generateUUID();
    const extension = file.name.split(".").pop();

    const fileName = `${employeeId}_${timestamp}_${uuid}.${extension}`;
    const storagePath = `medical-certificates/${year}/${month}/${fileName}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Start resumable upload
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return promise that handles upload events
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        // Progress callback
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({
              progress: progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: snapshot.state,
            });
          }
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        },
        // Error callback
        (error) => {
          console.error("Upload error:", error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        // Success callback
        async () => {
          try {
            // Get download URL after successful upload
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            const uploadMetadata = {
              url: downloadURL,
              path: storagePath,
              name: file.name,
              type: file.type,
              size: file.size,
              uploadedAt: new Date().toISOString(),
            };

            console.log("Medical certificate uploaded successfully:", uploadMetadata);
            resolve(uploadMetadata);
          } catch (error) {
            console.error("Error getting download URL:", error);
            reject(new Error(`Failed to get download URL: ${error.message}`));
          }
        },
      );
    });
  } catch (error) {
    console.error("Error in uploadMedicalCertificate:", error);
    throw error;
  }
}

/**
 * Validate medical certificate file
 * @param {File} file - The file to validate
 * @returns {Object} Validation result with valid flag and message
 */
function validateMedicalCertFile(file) {
  const maxSize = 2 * 1024 * 1024; // 2MB
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

  if (!file) {
    return { valid: false, message: "File tidak ditemukan" };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      message: `Ukuran file melebihi 2MB. Ukuran file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: "Format file tidak didukung. Gunakan JPG, PNG, atau PDF" };
  }

  return { valid: true };
}

/**
 * Generate UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Delete medical certificate from Firebase Storage
 * @param {string} filePath - The file path in storage
 * @returns {Promise<void>}
 */
export async function deleteMedicalCertificate(filePath) {
  try {
    const storage = getStorage();
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log("Medical certificate deleted successfully:", filePath);
  } catch (error) {
    console.error("Error deleting medical certificate:", error);
    throw error;
  }
}

/**
 * Compress image before upload
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} quality - Compression quality (0-1)
 * @returns {Promise<File>} Compressed image file
 */
export async function compressMedicalCertImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file); // Return original if not an image
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, { type: file.type, lastModified: Date.now() });
            resolve(compressedFile);
          },
          file.type,
          quality,
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for compression"));
      };
    };

    reader.onerror = (error) => {
      reject(new Error(`Failed to read file: ${error}`));
    };
  });
}
