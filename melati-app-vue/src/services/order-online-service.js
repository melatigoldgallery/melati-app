import {
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { floorCollection, floorDoc, scopeStoragePath } from "@/services/floor-scope";
import { normalizeFloorId } from "@/config/floor-config";

const COLLECTION_NAME = "order_online";

function getOrderCollection(floorId = "") {
  return floorCollection(db, COLLECTION_NAME, floorId);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

async function compressImageFile(file, options = {}) {
  const maxSide = options.maxSide ?? 1280;
  const quality = options.quality ?? 0.78;

  if (!file?.type?.startsWith("image/")) return file;

  const image = await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca gambar untuk kompresi"));
    };
    img.src = objectUrl;
  });

  const srcW = image.naturalWidth || image.width || 1;
  const srcH = image.naturalHeight || image.height || 1;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, targetW, targetH);

  const compressedBlob = await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), "image/jpeg", quality);
  });
  if (!compressedBlob || compressedBlob.size >= file.size) return file;

  return new File([compressedBlob], file.name.replace(/\.[^./\\]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function formatOrderDateTime(tanggal, jam) {
  if (!tanggal) return "-";
  const datePart = String(tanggal).slice(0, 10);
  const timePart = jam ? String(jam).slice(0, 5) : "--:--";
  return `${datePart} ${timePart}`;
}

export function buildOrderNo(now = new Date()) {
  const year = now.getFullYear();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const hours = pad2(now.getHours());
  const minutes = pad2(now.getMinutes());
  const seconds = pad2(now.getSeconds());
  const random = Math.floor(Math.random() * 900 + 100);
  return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

export function normalizeOrderRows(rows = []) {
  return rows
    .map((row) => ({
      jml: toNumber(row.jml),
      namaBarang: normalizeText(row.namaBarang),
      berat: toNumber(row.berat),
      karat: normalizeText(row.karat),
      harga: toNumber(row.harga),
    }))
    .filter(
      (row) => row.namaBarang && Number.isFinite(row.jml) && Number.isFinite(row.berat) && Number.isFinite(row.harga),
    );
}

export async function saveOrderOnline(payload, floorId = "") {
  const normalizedFloorId = normalizeFloorId(floorId, "L1");
  const rows = normalizeOrderRows(payload.detailBarang || []);
  if (!rows.length) throw new Error("Minimal satu detail barang harus diisi");

  const tanggal = normalizeText(payload.tanggal);
  const namaAdmin = normalizeText(payload.namaAdmin || payload.namaSales);
  const namaCustomer = normalizeText(payload.namaCustomer);
  const kontak = normalizeText(payload.kontak);

  if (!tanggal || !namaAdmin || !namaCustomer || !kontak) {
    throw new Error("Tanggal, nama admin, nama customer, dan kontak wajib diisi");
  }

  const now = new Date();
  const orderNo = normalizeText(payload.orderNo) || buildOrderNo(now);
  const createdBy = normalizeText(payload.createdBy || namaAdmin);
  const timestamp = Timestamp.now();
  const jam = normalizeText(payload.jam) || `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  const batch = writeBatch(db);
  rows.forEach((row) => {
    const rowRef = doc(getOrderCollection(normalizedFloorId));
    batch.set(rowRef, {
      orderNo,
      tanggal,
      jam,
      namaAdmin,
      namaSales: namaAdmin,
      namaCustomer,
      kontak,
      jml: row.jml,
      namaBarang: row.namaBarang,
      berat: row.berat,
      karat: row.karat,
      harga: row.harga,
      statusPengambilan: "BELUM_DIAMBIL",
      namaStafHandle: "",
      waktuPengambilan: "",
      buktiPengambilanUrl: "",
      buktiPengambilanPath: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy,
      updatedBy: createdBy,
    });
  });

  await batch.commit();
  return { orderNo, savedCount: rows.length };
}

export async function fetchOrderOnlineByRange(startDate, endDate, statusPengambilan = "", floorId = "") {
  const start = normalizeText(startDate);
  const end = normalizeText(endDate);
  if (!start || !end) return [];

  const conditions = [where("tanggal", ">=", start), where("tanggal", "<=", end)];

  if (statusPengambilan) {
    conditions.push(where("statusPengambilan", "==", statusPengambilan));
  }

  conditions.push(orderBy("tanggal", "desc"));

  const snap = await getDocs(query(getOrderCollection(floorId), ...conditions, limit(1000)));
  const data = snap.docs;

  return data
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => {
      const leftKey = `${left.tanggal || ""} ${left.jam || ""}`;
      const rightKey = `${right.tanggal || ""} ${right.jam || ""}`;
      return rightKey.localeCompare(leftKey);
    });
}

export async function fetchOrderOnlineByRangeForManagement(startDate, endDate, statusPengambilan = "", floorId = "") {
  const start = normalizeText(startDate);
  const end = normalizeText(endDate);
  if (!start || !end) return [];

  const conditions = [where("tanggal", ">=", start), where("tanggal", "<=", end)];

  if (statusPengambilan) {
    conditions.push(where("statusPengambilan", "==", statusPengambilan));
  }

  conditions.push(orderBy("tanggal", "desc"));

  const snap = await getDocs(query(getOrderCollection(floorId), ...conditions));
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => {
      const leftKey = `${left.tanggal || ""} ${left.jam || ""}`;
      const rightKey = `${right.tanggal || ""} ${right.jam || ""}`;
      return rightKey.localeCompare(leftKey);
    });
}

export async function updateOrderOnlineData(id, payload, floorId = "") {
  const floorRef = floorDoc(db, COLLECTION_NAME, id, floorId);
  await updateDoc(floorRef, {
    tanggal: normalizeText(payload.tanggal),
    namaAdmin: normalizeText(payload.namaAdmin || payload.namaSales),
    namaSales: normalizeText(payload.namaAdmin || payload.namaSales),
    namaCustomer: normalizeText(payload.namaCustomer),
    kontak: normalizeText(payload.kontak),
    jml: toNumber(payload.jml),
    namaBarang: normalizeText(payload.namaBarang),
    berat: toNumber(payload.berat),
    karat: normalizeText(payload.karat),
    harga: toNumber(payload.harga),
    updatedAt: Timestamp.now(),
    updatedBy: normalizeText(payload.updatedBy || payload.namaAdmin || payload.namaSales),
  });
}

export async function uploadOrderProof(file, { orderNo, docId, floorId = "" } = {}) {
  if (!file) throw new Error("File bukti pengambilan wajib dipilih");
  const optimizedFile = await compressImageFile(file);
  const safeName = String(optimizedFile.name || file.name || "bukti").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = scopeStoragePath(
    `order-online/proof/${normalizeText(orderNo) || "unknown"}/${normalizeText(docId) || "item"}/${Date.now()}-${safeName}`,
    floorId,
  );
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, optimizedFile, {
    contentType: optimizedFile.type || file.type || "application/octet-stream",
  });
  const url = await getDownloadURL(fileRef);
  return { url, path };
}

export async function updateOrderPickup(id, payload, floorId = "") {
  const floorRef = floorDoc(db, COLLECTION_NAME, id, floorId);
  await updateDoc(floorRef, {
    statusPengambilan: payload.statusPengambilan || "BELUM_DIAMBIL",
    namaStafHandle: normalizeText(payload.namaStafHandle || ""),
    waktuPengambilan: normalizeText(payload.waktuPengambilan || ""),
    buktiPengambilanUrl: normalizeText(payload.buktiPengambilanUrl || ""),
    buktiPengambilanPath: normalizeText(payload.buktiPengambilanPath || ""),
    updatedAt: Timestamp.now(),
    updatedBy: normalizeText(payload.updatedBy || payload.namaStafHandle || payload.namaAdmin || ""),
  });
}

export async function updateOrderContactStatus(id, payload, floorId = "") {
  const floorRef = floorDoc(db, COLLECTION_NAME, id, floorId);
  await updateDoc(floorRef, {
    waktuDihubungiTerakhir: normalizeText(payload.waktuDihubungiTerakhir || ""),
    metodeKontakTerakhir: normalizeText(payload.metodeKontakTerakhir || "manual"),
    dihubungiOleh: normalizeText(payload.dihubungiOleh || ""),
    updatedAt: Timestamp.now(),
    updatedBy: normalizeText(payload.updatedBy || payload.dihubungiOleh || ""),
  });
}

export async function deleteOrderOnline(id, floorId = "") {
  const floorRef = floorDoc(db, COLLECTION_NAME, id, floorId);
  await deleteDoc(floorRef);
}
