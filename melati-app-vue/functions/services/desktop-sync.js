import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db, admin } from "../config.js";
import { executeMutationLogic } from "../helpers/barcode-helpers.js";

export const parseDateSafe = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === "number" || !isNaN(dateStr)) {
    const num = Number(dateStr);
    if (!isNaN(num)) return new Date(num);
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  const clean = String(dateStr).replace(' ', 'T');
  const d2 = new Date(clean);
  if (!isNaN(d2.getTime())) return d2;
  
  return new Date();
};

export const syncDesktopSales = onRequest(
  { region: "asia-southeast2", memory: "512MiB" },
  async (req, res) => {
    // 1. Validasi API Key
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;
    const EXPECTED_API_KEY = "MelatiSecretToken123";
    if (apiKey !== EXPECTED_API_KEY) {
      logger.warn("Unauthorized sync request - invalid API key");
      res.status(403).send("Forbidden: Invalid API Key");
      return;
    }

    // 2. Parse payload
    const { store_id, sales_data = [] } = req.body || {};
    if (!store_id || !Array.isArray(sales_data) || sales_data.length === 0) {
      res.status(400).send("Bad Request: store_id and non-empty sales_data array are required");
      return;
    }

    // Map store_id to floorId
    const floorId = store_id === "MELATI-ATAS" ? "L2" : "L1";
    logger.info(`Processing ${sales_data.length} sales barcodes for store ${store_id} / floor ${floorId}`);

    try {
      const uniqueBarcodes = [...new Set(sales_data.map(item => item.barcode.trim().toUpperCase()))].filter(Boolean);
      if (uniqueBarcodes.length === 0) {
        res.status(200).json({ success: true, message: "No valid barcodes" });
        return;
      }

      // Batch query status barcodes saat ini di Firestore
      const dbFloorRef = db.collection("floors").doc(floorId);
      const barcodeRefs = uniqueBarcodes.map(bc => dbFloorRef.collection("barcodes").doc(bc));
      const snaps = await db.getAll(...barcodeRefs);

      const barcodeStateMap = {};
      snaps.forEach((snap, idx) => {
        barcodeStateMap[uniqueBarcodes[idx]] = snap.exists ? snap.data() : null;
      });

      // Kelompokkan data untuk proses
      const matchBarcodes = [];
      const discrepancyBarcodes = [];
      const ignoredBarcodes = [];

      sales_data.forEach(item => {
        const bc = item.barcode.trim().toUpperCase();
        const state = barcodeStateMap[bc];

        if (!state) {
          ignoredBarcodes.push({ barcode: bc, reason: "unregistered" });
        } else if (state.location === "laku") {
          ignoredBarcodes.push({ barcode: bc, reason: "already sold" });
        } else if (state.location === "barang-display") {
          matchBarcodes.push(item);
        } else {
          discrepancyBarcodes.push({
            item,
            currentLocation: state.location || "unknown"
          });
        }
      });

      logger.info(`Sales Sync breakdown: match=${matchBarcodes.length}, discrepancy=${discrepancyBarcodes.length}, ignored=${ignoredBarcodes.length}`);

      // 3. Jalankan Transaksi Mutasi untuk data yang MATCH
      if (matchBarcodes.length > 0) {
        const mutateItems = matchBarcodes.map(item => ({
          barcode: item.barcode,
          detailType: barcodeStateMap[item.barcode]?.detailType || "",
          category: barcodeStateMap[item.barcode]?.category || ""
        }));

        await db.runTransaction(async (t) => {
          const notesText = `Auto-Sync Penjualan Kasir Desktop. No Faktur: ${matchBarcodes.map(i => i.invoice_no).join(", ")}`;
          await executeMutationLogic(
            t, 
            dbFloorRef, 
            mutateItems, 
            "laku", 
            "Sync Agent Sales", 
            notesText, 
            "barang-display",
            "",
            "",
            false,
            false,
            "desktopSyncLogs"
          );
        });
      }

      // 4. Jalankan Transaksi/Batch write untuk discrepancy docs
      if (discrepancyBarcodes.length > 0) {
        const batch = db.batch();
        discrepancyBarcodes.forEach(({ item, currentLocation }) => {
          const discId = `DISC_${item.barcode}_${item.desktop_item_id}`;
          const discRef = dbFloorRef.collection("barcodeDiscrepancies").doc(discId);
          batch.set(discRef, {
            id: discId,
            barcode: item.barcode,
            invoice_no: item.invoice_no,
            tanggalPenjualan: admin.firestore.Timestamp.fromDate(parseDateSafe(item.tanggal_penjualan)),
            namaSales: item.nama_sales,
            webLocation: currentLocation,
            detectedAt: admin.firestore.FieldValue.serverTimestamp(),
            resolved: false,
            resolvedAt: null,
            resolvedBy: null,
            resolutionNote: null
          }, { merge: true });
        });
        await batch.commit();
      }

      // 5. Update Daily Sync Stats (grouped by transaction date)
      const dataByDate = {};
      sales_data.forEach(item => {
        let datePart = "";
        if (item.tanggal_penjualan) {
          datePart = String(item.tanggal_penjualan).split("T")[0];
        }
        if (!datePart) {
          datePart = new Date().toISOString().split("T")[0];
        }
        if (!dataByDate[datePart]) {
          dataByDate[datePart] = { matched: 0, discrepancy: 0, ignored: 0 };
        }
      });

      matchBarcodes.forEach(i => {
        const d = String(i.tanggal_penjualan || "").split("T")[0] || new Date().toISOString().split("T")[0];
        if (dataByDate[d]) dataByDate[d].matched++;
      });
      discrepancyBarcodes.forEach(({ item }) => {
        const d = String(item.tanggal_penjualan || "").split("T")[0] || new Date().toISOString().split("T")[0];
        if (dataByDate[d]) dataByDate[d].discrepancy++;
      });
      ignoredBarcodes.forEach(({ barcode }) => {
        const orig = sales_data.find(s => s.barcode.trim().toUpperCase() === barcode);
        const d = String(orig?.tanggal_penjualan || "").split("T")[0] || new Date().toISOString().split("T")[0];
        if (dataByDate[d]) dataByDate[d].ignored++;
      });

      const statsBatch = db.batch();
      Object.keys(dataByDate).forEach(dateStr => {
        const statsRef = dbFloorRef.collection("barcodeSyncStats").doc(dateStr);
        const counts = dataByDate[dateStr];
        statsBatch.set(statsRef, {
          date: dateStr,
          totalSalesReceived: admin.firestore.FieldValue.increment(counts.matched + counts.discrepancy + counts.ignored),
          matchCount: admin.firestore.FieldValue.increment(counts.matched),
          discrepancyCount: admin.firestore.FieldValue.increment(counts.discrepancy),
          ignoredCount: admin.firestore.FieldValue.increment(counts.ignored),
          lastSyncAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
      await statsBatch.commit();

      res.status(200).json({
        success: true,
        stats: {
          total: sales_data.length,
          matched: matchBarcodes.length,
          discrepancy: discrepancyBarcodes.length,
          ignored: ignoredBarcodes.length
        }
      });
    } catch (error) {
      logger.error("Error in syncDesktopSales:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export const syncDesktopVoid = onRequest(
  { region: "asia-southeast2", memory: "512MiB" },
  async (req, res) => {
    // 1. Validasi API Key
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;
    const EXPECTED_API_KEY = "MelatiSecretToken123";
    if (apiKey !== EXPECTED_API_KEY) {
      logger.warn("Unauthorized sync void request - invalid API key");
      res.status(403).send("Forbidden: Invalid API Key");
      return;
    }

    // 2. Parse payload
    const { store_id, void_data = [] } = req.body || {};
    if (!store_id || !Array.isArray(void_data) || void_data.length === 0) {
      res.status(400).send("Bad Request: store_id and non-empty void_data array are required");
      return;
    }

    // Map store_id to floorId
    const floorId = store_id === "MELATI-ATAS" ? "L2" : "L1";
    logger.info(`Processing ${void_data.length} void barcodes for store ${store_id} / floor ${floorId}`);

    try {
      const dbFloorRef = db.collection("floors").doc(floorId);

      const processedResults = [];

      for (const voidItem of void_data) {
        const bc = voidItem.barcode.trim().toUpperCase();

        const statusResult = await db.runTransaction(async (t) => {
          // 1. READ: Cari log mutasi terakhir barcode ini sebelum ia dijual (destination === 'laku')
          const syncLogsQuery = dbFloorRef.collection("desktopSyncLogs")
            .where("barcodeIds", "array-contains", bc);
          const mutationLogsQuery = dbFloorRef.collection("barcodeMutationLogs")
            .where("barcodeIds", "array-contains", bc);
          const [syncLogsSnap, mutationLogsSnap] = await Promise.all([
            t.get(syncLogsQuery),
            t.get(mutationLogsQuery)
          ]);
          
          // 2. READ: Baca status barcode terkini di Firestore
          const barcodeRef = dbFloorRef.collection("barcodes").doc(bc);
          const barcodeSnap = await t.get(barcodeRef);

          // 3. READ: Cari laporan discrepancy yang berasosiasi dengan barcode ini
          const discrepanciesQuery = dbFloorRef.collection("barcodeDiscrepancies")
            .where("barcode", "==", bc)
            .where("resolved", "==", false)
            .limit(10);
          const discrepanciesSnap = await t.get(discrepanciesQuery);

          // Evaluasi data barcode
          if (!barcodeSnap.exists) {
            logger.warn(`Void failed: Barcode ${bc} does not exist in active barcodes`);
            return { status: "ignored", reason: "unregistered" };
          }

          const barcodeData = barcodeSnap.data();
          if (barcodeData.location !== "laku") {
            logger.warn(`Void bypass: Barcode ${bc} is currently at location ${barcodeData.location}, not 'laku'`);
            return { status: "ignored", reason: `already ${barcodeData.location}` };
          }

          let previousOrigin = "barang-display"; // default fallback
          const combinedDocs = [...syncLogsSnap.docs, ...mutationLogsSnap.docs];
          if (combinedDocs.length > 0) {
            const sortedLogs = combinedDocs
              .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
              .filter(log => log.destination === "laku" && log.timestamp)
              .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

            if (sortedLogs.length > 0) {
              const lastLog = sortedLogs[0];
              const itemInLog = (lastLog.barcodes || []).find(b => b.barcode === bc);
              if (itemInLog && itemInLog.origin) {
                previousOrigin = itemInLog.origin;
              }
            }
          }

          // 4. WRITE: Kembalikan lokasi barcode ke asal secara transaksional
          const mutateItems = [{
            barcode: bc,
            detailType: barcodeData.detailType || "",
            category: barcodeData.category || ""
          }];

          const notesText = `Pembatalan Transaksi Kasir Desktop (Void). No Faktur: ${voidItem.invoice_no}. Dihapus Oleh: ${voidItem.dihapus_oleh}`;
          
          await executeMutationLogic(
            t,
            dbFloorRef,
            mutateItems,
            previousOrigin,
            "Sync Agent Void",
            notesText,
            "laku",
            "",
            "",
            false,
            true,
            "desktopSyncLogs"
          );

          // 5. WRITE: Selesaikan laporan discrepancy yang berasosiasi dengan barcode ini
          discrepanciesSnap.forEach(docSnap => {
            t.update(docSnap.ref, {
              resolved: true,
              resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
              resolvedBy: "System (Void Sync)",
              resolutionNote: `Pembatalan Transaksi Kasir Desktop (Void Faktur: ${voidItem.invoice_no})`
            });
          });

          return { status: "voided" };
        });

        const finalStatus = statusResult || { status: "ignored", reason: "failed transaction" };
        processedResults.push({
          id: voidItem.void_item_id || "",
          invoice_no: voidItem.invoice_no || "",
          barcode: bc,
          timestamp: voidItem.tanggal_void || "",
          status: finalStatus.status,
          reason: finalStatus.reason || null
        });
      }

      // Update Daily Sync Stats for Void
      const dateStr = new Date().toISOString().split("T")[0];
      const statsRef = dbFloorRef.collection("barcodeSyncStats").doc(dateStr);
      await statsRef.set({
        date: dateStr,
        totalVoidReceived: admin.firestore.FieldValue.increment(processedResults.length),
        voidSuccessCount: admin.firestore.FieldValue.increment(processedResults.filter(r => r.status === "voided").length),
        lastVoidSyncAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      res.status(200).json({
        success: true,
        stats: {
          total: void_data.length,
          voided: processedResults.filter(r => r.status === "voided").length,
          ignored: processedResults.filter(r => r.status === "ignored").length
        },
        results: processedResults
      });
    } catch (error) {
      logger.error("Error in syncDesktopVoid:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
