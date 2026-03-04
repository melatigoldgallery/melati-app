import { storage, auth } from "../configFirebase.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

function sanitizeFileName(fileName) {
  return String(fileName || "promotion_file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getExtensionFromName(fileName) {
  const parts = String(fileName || "").split(".");
  if (parts.length > 1) return parts.pop().toLowerCase();
  return "";
}

function buildStoragePath(fileName, contentType = "file") {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const timestamp = Date.now();
  const safeContentType = String(contentType || "file").toLowerCase();
  const safeFileName = sanitizeFileName(fileName || "promotion_file");

  const extFromName = getExtensionFromName(safeFileName);
  const baseName = extFromName ? safeFileName.replace(new RegExp(`\\.${extFromName}$`), "") : safeFileName;
  const finalName = `${baseName}_${timestamp}${extFromName ? `.${extFromName}` : ""}`;

  return {
    fileName: finalName,
    path: `promotions/${year}/${month}/${safeContentType}/${finalName}`,
  };
}

export async function uploadPromotionFile(file, contentType = "file") {
  if (!file) {
    throw new Error("File tidak ditemukan");
  }

  const { path, fileName } = buildStoragePath(file.name, contentType);
  const storageRef = ref(storage, path);
  const currentUid = auth.currentUser?.uid || "anonymous";

  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      uploadedBy: currentUid,
      contentType: String(contentType || "file"),
    },
  });

  const downloadURL = await getDownloadURL(storageRef);

  return {
    url: downloadURL,
    path,
    fileName,
    fileSize: file.size || 0,
    fileType: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
  };
}

export async function deletePromotionFile(storagePath) {
  if (!storagePath) return false;
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
  return true;
}
