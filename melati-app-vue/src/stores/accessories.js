import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { db } from "@/config/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import {
  fetchCatalog,
  fetchStockItem,
  fetchTransactions,
  processSale,
  deleteSale,
  verifySupervisorPassword,
} from "@/services/stock-service";

export const useAccessoriesStore = defineStore("accessories", () => {
  // ─── State ───────────────────────────────────────────────────────────────
  const catalog = ref([]); // stokAksesoris master (cache-first)
  const catalogLoadedAt = ref(null); // timestamp last full load
  const transactions = ref([]); // current view transactions
  const lastTransactionDoc = ref(null);
  const hasMoreTransactions = ref(false);
  const todayListener = ref(null); // onSnapshot unsubscribe fn
  const isLoading = ref(false);

  // ─── Getters ─────────────────────────────────────────────────────────────
  const activeItems = computed(() => catalog.value.filter((c) => c.isActive !== false));

  const getStockByKode = computed(() => (kode) => {
    const item = catalog.value.find((c) => c.kode === kode);
    return item ? (item.stok ?? 0) : 0;
  });

  // ─── Catalog actions ──────────────────────────────────────────────────────

  /** Load catalog from Firestore (cache-first: skip if already loaded) */
  async function loadCatalog(force = false) {
    if (!force && catalog.value.length > 0) return;
    isLoading.value = true;
    try {
      catalog.value = await fetchCatalog();
      catalogLoadedAt.value = Date.now();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Refresh one stock item after a sale/return (targeted single getDoc).
   * Cross-tab: called from handleStockSync event listener.
   * @param {string} kode
   */
  async function refreshSingleStock(kode) {
    const fresh = await fetchStockItem(kode);
    if (!fresh) return;
    const idx = catalog.value.findIndex((c) => c.kode === kode);
    if (idx !== -1) catalog.value[idx] = fresh;
    else catalog.value.push(fresh);
  }

  // ─── Transaction actions ─────────────────────────────────────────────────

  /**
   * Subscribe to today's transactions via onSnapshot.
   * Use this in DataPenjualanView for live updates.
   */
  function startTodayListener() {
    stopTodayListener();
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const q = query(
      collection(db, "penjualanAksesoris"),
      where("tanggal", "==", dateStr),
      orderBy("createdAt", "desc"),
      limit(200),
    );

    todayListener.value = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        if (change.type === "added") {
          const exists = transactions.value.find((t) => t.id === data.id);
          if (!exists) transactions.value.unshift(data);
        } else if (change.type === "modified") {
          const idx = transactions.value.findIndex((t) => t.id === data.id);
          if (idx !== -1) transactions.value[idx] = data;
        } else if (change.type === "removed") {
          transactions.value = transactions.value.filter((t) => t.id !== data.id);
        }
      });
    });
  }

  function stopTodayListener() {
    if (todayListener.value) {
      todayListener.value();
      todayListener.value = null;
    }
  }

  /**
   * Load transactions for a date range (getDocs one-shot, for reports/filter).
   * @param {string} startDate YYYY-MM-DD
   * @param {string} endDate   YYYY-MM-DD
   * @param {boolean} append   If true, append to existing (load more)
   */
  async function loadTransactions(startDate, endDate, append = false) {
    isLoading.value = true;
    try {
      const cursor = append ? lastTransactionDoc.value : null;
      const result = await fetchTransactions(startDate, endDate, 200, cursor);
      if (append) {
        transactions.value = [...transactions.value, ...result.docs];
      } else {
        transactions.value = result.docs;
      }
      lastTransactionDoc.value = result.lastDoc;
      hasMoreTransactions.value = result.hasMore;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Save a new sale transaction atomically.
   * @param {Array}  cartItems      cart items
   * @param {Object} transactionData header fields
   * @returns {string} new sale ID
   */
  async function saveTransaction(cartItems, transactionData) {
    const saleId = await processSale(cartItems, transactionData);

    // Targeted stock refresh — only affected kodes
    const affectedKodes = [
      ...cartItems.filter((i) => i.tipe !== "manual" && i.kode).map((i) => i.kode),
      ...cartItems.filter((i) => i.tipe === "manual" && i.kodeLock).map((i) => i.kodeLock),
    ];
    await Promise.all(affectedKodes.map((k) => refreshSingleStock(k)));

    // Notify cross-tab
    notifyStockChanged(affectedKodes);

    return saleId;
  }

  /**
   * Delete a sale and restore stock atomically.
   * @param {string} saleId
   * @param {Object} saleData
   */
  async function removeTransaction(saleId, saleData) {
    await deleteSale(saleId, saleData);

    const affectedKodes = [
      ...(saleData.items ?? []).filter((i) => i.tipe !== "manual" && i.kode).map((i) => i.kode),
      ...(saleData.items ?? []).filter((i) => i.tipe === "manual" && i.kodeLock).map((i) => i.kodeLock),
    ];
    await Promise.all(affectedKodes.map((k) => refreshSingleStock(k)));
    notifyStockChanged(affectedKodes);
  }

  /**
   * Verify supervisor password.
   * @param {string} password
   * @returns {boolean}
   */
  async function verifySupervisor(password) {
    return verifySupervisorPassword(password);
  }

  // ─── Cross-tab sync ──────────────────────────────────────────────────────

  function notifyStockChanged(kodes) {
    try {
      localStorage.setItem("stokAksesorisChanged", JSON.stringify({ kodes, ts: Date.now() }));
    } catch (_) {
      /* silent */
    }
  }

  return {
    // State
    catalog,
    catalogLoadedAt,
    transactions,
    lastTransactionDoc,
    hasMoreTransactions,
    isLoading,
    // Getters
    activeItems,
    getStockByKode,
    // Actions
    loadCatalog,
    refreshSingleStock,
    startTodayListener,
    stopTodayListener,
    loadTransactions,
    saveTransaction,
    removeTransaction,
    verifySupervisor,
    notifyStockChanged,
  };
});
