<template>
  <div class="card border-0 shadow-sm rounded-3 feature-updates-widget h-100 flex-grow-1">
    <!-- Header -->
    <div class="bg-white border-bottom py-3 px-3 d-flex align-items-center gap-2">
      <div class="icon-box bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center">
        <i class="bi bi-clock-history fs-5"></i>
      </div>
      <div>
        <h6 class="mb-0 fw-bold text-dark widget-title">Update Fitur Terbaru</h6>
        <small class="text-muted widget-subtitle">Catatan Rilis & Pembaruan Sistem</small>
      </div>
    </div>

    <!-- Body / Timeline List -->
    <div class="card-body p-3 overflow-auto widget-scroll-container">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
        <p class="small text-muted mt-2 mb-0">Memuat catatan update...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="updates.length === 0" class="text-center py-5 text-muted">
        <i class="bi bi-journal-text fs-2 d-block text-secondary mb-2"></i>
        <p class="small mb-0">Belum ada catatan update fitur.</p>
      </div>

      <!-- Timeline Items -->
      <div v-else class="timeline-widget-list d-flex flex-column gap-3">
        <article
          v-for="(item, idx) in updates"
          :key="item.id || idx"
          class="update-item-card p-3 rounded-3 bg-white"
        >
          <!-- Date Badge & Category Tag -->
          <div class="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
            <span class="badge date-badge text-primary bg-primary-subtle border border-primary-subtle px-2.5 py-1 rounded-pill">
              <i class="bi bi-calendar-event me-1"></i>
              {{ formatDisplayDate(item.date) }}
            </span>
            <span v-if="item.category" class="badge category-badge bg-light text-secondary border px-2 py-1 rounded-pill">
              {{ item.category }}
            </span>
          </div>

          <!-- Feature Title -->
          <h6 class="fw-bold text-dark item-title mb-2">
            {{ item.title }}
          </h6>

          <!-- Feature Description with clear margin and padding -->
          <div class="item-description-box p-2.5 rounded-2 bg-light-subtle">
            <p class="text-secondary item-description mb-0">
              {{ item.description }}
            </p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { 
  DEFAULT_FEATURE_UPDATES,
  subscribeFeatureUpdates 
} from "@/services/feature-update-service";

const updates = ref([...DEFAULT_FEATURE_UPDATES]);
const loading = ref(true);

let unsubscribe = null;

function formatDisplayDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const parts = String(dateStr).split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
      ];
      return `${day} ${months[monthIdx] || parts[1]} ${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    }
  } catch (e) {
    console.error("Format date error:", e);
  }
  return dateStr;
}

onMounted(() => {
  unsubscribe = subscribeFeatureUpdates((data) => {
    updates.value = data;
    loading.value = false;
  }, (err) => {
    console.error("Widget feature updates subscription error:", err);
    loading.value = false;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<style scoped>
.feature-updates-widget {
  display: flex;
  flex-direction: column;
  height: 100% !important;
  width: 100%;
  flex: 1 1 auto;
}

.icon-box {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
}

.widget-title {
  font-size: 0.95rem;
  letter-spacing: -0.01em;
}

.widget-subtitle {
  font-size: 0.75rem;
}

.widget-scroll-container {
  flex: 1 1 0;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(13, 110, 253, 0.25) transparent;
}

.widget-scroll-container::-webkit-scrollbar {
  width: 6px;
}
.widget-scroll-container::-webkit-scrollbar-thumb {
  background-color: rgba(13, 110, 253, 0.25);
  border-radius: 4px;
}
.widget-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(13, 110, 253, 0.4);
}

.update-item-card {
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.update-item-card:hover {
  box-shadow: 0 8px 20px -4px rgba(13, 110, 253, 0.09), 0 4px 8px -2px rgba(15, 23, 42, 0.03);
  border-color: #93c5fd;
  transform: translateY(-2px);
}

.date-badge {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  background-color: #eff6ff !important;
  color: #1d4ed8 !important;
  border-color: #dbeafe !important;
}

.category-badge {
  font-size: 0.72rem;
  font-weight: 500;
  background-color: #f8fafc !important;
  color: #475569 !important;
  border-color: #e2e8f0 !important;
}

.item-title {
  font-size: 0.92rem;
  line-height: 1.4;
  color: #0f172a !important;
  font-weight: 700;
}

.item-description-box {
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
  padding: 0.7rem 0.85rem !important;
  margin-top: 0.35rem;
  border-radius: 8px;
}

.item-description {
  font-size: 0.82rem;
  line-height: 1.55;
  color: #475569 !important;
  white-space: pre-line;
  word-break: break-word;
}
</style>
