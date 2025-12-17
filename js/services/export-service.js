import { db } from "../configFirebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { deleteBuktiPengambilan } from "./storage-service.js";

const SERVIS_COLLECTION = "dataServis";

/**
 * Get servis data by date range with bukti pengambilan
 */
export async function getServisDataForExport(startDate, endDate) {
  try {
    const startTimestamp = Timestamp.fromDate(new Date(startDate));
    const endTimestamp = Timestamp.fromDate(new Date(endDate + "T23:59:59"));

    const q = query(
      collection(db, SERVIS_COLLECTION),
      where("tanggal", ">=", startTimestamp),
      where("tanggal", "<=", endTimestamp),
      where("statusPengambilan", "==", "Sudah Diambil")
    );

    const snapshot = await getDocs(q);
    const data = [];

    snapshot.forEach((doc) => {
      const item = { id: doc.id, ...doc.data() };
      // Only include items with photos
      if (item.buktiPengambilanUrl) {
        data.push(item);
      }
    });

    return data;
  } catch (error) {
    console.error("Error fetching export data:", error);
    throw error;
  }
}

/**
 * Export data to Excel
 */
export async function exportToExcel(data, filename = "export-bukti-pengambilan.xlsx") {
  try {
    // Prepare data for Excel
    const excelData = data.map((item, index) => ({
      No: index + 1,
      Tanggal: new Date(item.tanggal.toDate()).toLocaleDateString("id-ID"),
      Sales: item.sales || "-",
      "Nama Customer": item.namaCustomer,
      "No HP": item.noHp,
      "Nama Barang": item.namaBarang,
      "Status Servis": item.statusServis,
      "Status Pengambilan": item.statusPengambilan,
      "Staf Handle": item.stafHandle || "-",
      "Waktu Pengambilan": item.waktuPengambilan
        ? new Date(item.waktuPengambilan.toDate()).toLocaleString("id-ID")
        : "-",
      "Link Foto": item.buktiPengambilanUrl || "-",
      "ID Dokumen": item.id,
    }));

    // Create workbook
    const ws = window.XLSX.utils.json_to_sheet(excelData);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Data Export");

    // Auto-size columns
    const colWidths = [
      { wch: 5 }, // No
      { wch: 12 }, // Tanggal
      { wch: 15 }, // Sales
      { wch: 20 }, // Nama Customer
      { wch: 15 }, // No HP
      { wch: 25 }, // Nama Barang
      { wch: 15 }, // Status Servis
      { wch: 18 }, // Status Pengambilan
      { wch: 15 }, // Staf Handle
      { wch: 20 }, // Waktu Pengambilan
      { wch: 60 }, // Link Foto
      { wch: 25 }, // ID Dokumen
    ];
    ws["!cols"] = colWidths;

    // Generate file
    window.XLSX.writeFile(wb, filename);

    return true;
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Gagal export ke Excel: " + error.message);
  }
}

/**
 * Download photos as ZIP
 */
export async function downloadPhotosAsZip(data, filename = "bukti-pengambilan.zip", progressCallback) {
  try {
    const zip = new JSZip();
    const folder = zip.folder("bukti-pengambilan");

    let completed = 0;
    const total = data.length;

    for (const item of data) {
      if (item.buktiPengambilanUrl) {
        try {
          // Fetch image
          const response = await fetch(item.buktiPengambilanUrl);
          const blob = await response.blob();

          // Generate filename
          const timestamp = new Date(item.tanggal.toDate()).toISOString().split("T")[0];
          const imageName = `${timestamp}_${item.namaCustomer.replace(/[^a-zA-Z0-9]/g, "_")}_${item.id}.jpg`;

          folder.file(imageName, blob);

          completed++;
          if (progressCallback) {
            progressCallback(completed, total);
          }
        } catch (error) {
          console.error(`Failed to download photo for ${item.id}:`, error);
        }
      }
    }

    // Generate ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Download using FileSaver
    saveAs(zipBlob, filename);

    return true;
  } catch (error) {
    console.error("Error creating ZIP:", error);
    throw new Error("Gagal membuat ZIP: " + error.message);
  }
}

/**
 * Batch delete data from Firestore and Storage
 */
export async function batchDeleteData(dataIds, progressCallback) {
  try {
    const total = dataIds.length;
    let completed = 0;
    let deletedPhotos = 0;
    let failedDeletes = [];

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;

    for (let i = 0; i < dataIds.length; i += batchSize) {
      const batchIds = dataIds.slice(i, i + batchSize);
      const batch = writeBatch(db);

      // Get documents to find storage paths
      const promises = batchIds.map(async (id) => {
        try {
          const docRef = collection(db, SERVIS_COLLECTION);
          const q = query(docRef, where("__name__", "==", id));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();

            // Delete photo from Storage if exists
            if (data.buktiPengambilanPath) {
              try {
                await deleteBuktiPengambilan(data.buktiPengambilanPath);
                deletedPhotos++;
              } catch (storageError) {
                console.warn(`Failed to delete photo for ${id}:`, storageError);
              }
            }

            // Add to Firestore batch delete
            batch.delete(doc.ref);
          }

          completed++;
          if (progressCallback) {
            progressCallback(completed, total);
          }
        } catch (error) {
          failedDeletes.push({ id, error: error.message });
          console.error(`Failed to process ${id}:`, error);
        }
      });

      await Promise.all(promises);

      // Commit Firestore batch
      await batch.commit();
    }

    return {
      success: true,
      deleted: completed,
      deletedPhotos,
      failed: failedDeletes.length,
      failedItems: failedDeletes,
    };
  } catch (error) {
    console.error("Error in batch delete:", error);
    throw new Error("Gagal menghapus data: " + error.message);
  }
}

/**
 * Get storage usage estimate
 */
export function getStorageEstimate(data) {
  let totalSize = 0;
  let photoCount = 0;

  data.forEach((item) => {
    if (item.buktiPengambilanUrl) {
      // Estimate ~400KB per photo
      totalSize += 400 * 1024;
      photoCount++;
    }
  });

  return {
    photoCount,
    estimatedSize: totalSize,
    formattedSize: formatBytes(totalSize),
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
