import { ref, computed } from "vue";
import { subscribeBarcodeDiscrepancies } from "@/services/inventory-service";

const discrepancies = ref([]);
const loading = ref(false);
const currentFloorId = ref("");
let unsubFunc = null;

export function useBarcodeDiscrepancies() {
  function initSubscription(floorId) {
    if (!floorId) {
      discrepancies.value = [];
      loading.value = false;
      return;
    }

    if (currentFloorId.value === floorId && unsubFunc) {
      // Subskripsi sudah berjalan untuk floorId ini
      return;
    }

    if (unsubFunc) {
      unsubFunc();
      unsubFunc = null;
    }

    currentFloorId.value = floorId;
    loading.value = true;

    unsubFunc = subscribeBarcodeDiscrepancies(
      floorId,
      (list) => {
        discrepancies.value = list || [];
        loading.value = false;
      },
      (err) => {
        console.error("Gagal mendengarkan data selisih barcode:", err);
        loading.value = false;
      }
    );
  }

  function stopSubscription() {
    if (unsubFunc) {
      unsubFunc();
      unsubFunc = null;
    }
    currentFloorId.value = "";
    discrepancies.value = [];
  }

  const unresolvedCount = computed(() => {
    return discrepancies.value.filter((item) => !item.resolved).length;
  });

  return {
    discrepancies,
    loading,
    unresolvedCount,
    initSubscription,
    stopSubscription,
  };
}
