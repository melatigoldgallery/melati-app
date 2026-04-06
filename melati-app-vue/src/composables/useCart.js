import { ref, computed } from "vue";

/**
 * useCart — manages the sale cart state.
 * Completely reactive; no DOM reads for row numbers.
 */
export function useCart() {
  const items = ref([]);

  /** Formatted grand total */
  const total = computed(() => items.value.reduce((sum, item) => sum + (item.subtotal ?? 0), 0));

  /**
   * Add an item to the cart.
   * @param {Object} item - { kode, kodeText, namaBarang, qty, harga, subtotal, tipe, ...rest }
   */
  function addItem(item) {
    // Merge if same kode & tipe (increment qty)
    const existing = items.value.find((i) => i.kode === item.kode && i.tipe === item.tipe);
    if (existing && item.tipe === "aksesoris") {
      existing.qty += item.qty;
      existing.subtotal = existing.qty * existing.harga;
    } else {
      items.value.push({ ...item });
    }
  }

  /**
   * Remove item by index from the cart.
   * @param {number} index
   */
  function removeItem(index) {
    items.value.splice(index, 1);
  }

  /**
   * Update a field of an existing cart item (e.g., qty or harga).
   * @param {number} index
   * @param {Object} updates - partial object to merge
   */
  function updateItem(index, updates) {
    const item = items.value[index];
    if (!item) return;
    Object.assign(item, updates);
    // Recalculate subtotal if qty or harga changed
    if ("qty" in updates || "harga" in updates) {
      item.subtotal = (item.qty ?? 1) * (item.harga ?? 0);
    }
    // Silver: subtotal from berat * jumlah * hargaPerGram
    if (item.tipe === "silver" && ("berat" in updates || "hargaPerGram" in updates || "qty" in updates)) {
      const totalBerat = (item.berat ?? 0) * (item.qty ?? 1);
      item.totalBerat = totalBerat;
      item.subtotal = totalBerat * (item.hargaPerGram ?? 0);
    }
  }

  /** Clear all cart items. */
  function clearCart() {
    items.value = [];
  }

  /** Build the items array for Firestore (serialize) */
  function serializeItems() {
    return items.value.map((item) => {
      const base = {
        tipe: item.tipe,
        kode: item.kode ?? item.kodeText ?? "",
        kodeText: item.kodeText ?? item.kode ?? "",
        namaBarang: item.namaBarang ?? item.nama ?? "",
        qty: item.qty ?? 1,
        harga: item.harga ?? 0,
        subtotal: item.subtotal ?? 0,
      };
      // Silver extras
      if (item.tipe === "silver") {
        base.kadar = item.kadar ?? "";
        base.berat = item.berat ?? 0;
        base.totalBerat = item.totalBerat ?? 0;
        base.hargaPerGram = item.hargaPerGram ?? 0;
      }
      // Manual extras
      if (item.tipe === "manual") {
        base.kodeLock = item.kodeLock ?? null;
        base.kadar = item.kadar ?? "";
        base.berat = item.berat ?? 0;
        base.keterangan = item.keterangan ?? "";
      }
      return base;
    });
  }

  return {
    items,
    total,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    serializeItems,
  };
}
