<template>
  <div class="page-content">
    <!-- Header Page -->
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
      <div>
        <h1 class="page-title d-flex align-items-center gap-2">
          <i class="bi bi-shop text-gold"></i>
          Profil Toko
        </h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Profil Toko</li>
          </ol>
        </nav>
      </div>

      <!-- Info Role Alert Banner -->
      <div class="badge-role-info shadow-sm d-flex align-items-center gap-2 px-3 py-2 rounded-pill d-none d-md-flex">
        <i :class="isSupervisor ? 'bi-shield-check text-success' : 'bi-info-circle text-primary'"></i>
        <span class="small fw-semibold text-secondary">
          Role: <span class="text-uppercase text-dark font-monospace">{{ auth.userRole || 'staff' }}</span>
        </span>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="card border-0 shadow-sm mb-4 overflow-hidden rounded-4">
      <div class="card-body p-2 bg-light rounded-top border-bottom overflow-hidden">
        <div class="tabs-scrollable">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="btn tab-btn px-4 py-2.5 fw-bold d-flex align-items-center gap-2 transition-all text-nowrap"
            :class="activeTab === tab.id ? 'active-tab shadow-sm' : 'text-secondary hover-bg'"
            @click="activeTab = tab.id"
          >
            <i :class="['bi', tab.icon]"></i>
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Main Content Area with Smooth Transitions -->
      <div class="card-body p-4 bg-white rounded-bottom">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-gold text-center d-block mx-auto mb-3" role="status" style="width: 3rem; height: 3rem">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="text-muted">Memuat data profil toko...</p>
        </div>

        <template v-else>
          <transition name="tab-fade" mode="out-in">
            <!-- TAB 1: PROFIL & MISI -->
            <div v-if="activeTab === 'profile'" key="profile" class="tab-pane-content">
              <div class="row g-4">
                <!-- Premium Hero Banner for About -->
                <div class="col-md-12">
                  <div class="store-hero-banner p-4 p-md-5 rounded-4 mb-2 position-relative overflow-hidden shadow border border-gold-subtle text-white">
                    <div class="overlay-glass"></div>
                    <div class="position-relative z-index-2">
                      <div class="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-sm-between gap-3 mb-4">
                        <div class="d-flex align-items-center gap-3">
                          <div class="brand-logo-circle bg-gold-gradient d-flex align-items-center justify-content-center rounded-circle shadow">
                            <i class="bi bi-gem text-white fs-4"></i>
                          </div>
                          <div>
                            <span class="badge bg-gold-light text-white text-uppercase tracking-wider px-3 py-1 rounded-pill mb-1 small fw-bold">Official Store Profile</span>
                            <h2 class="fw-extrabold tracking-tight mb-0 text-gold-glow">{{ brandName }}</h2>
                          </div>
                        </div>
                        <button
                          v-if="isSupervisor"
                          class="btn btn-sm btn-gold-outline px-3 d-flex align-items-center gap-1 shadow-sm btn-edit-responsive d-none d-md-flex"
                          @click="toggleEdit('about')"
                        >
                          <i :class="['bi', editingState.about ? 'bi-eye' : 'bi-pencil-square']"></i>
                          {{ editingState.about ? 'Selesai' : 'Edit' }}
                        </button>
                      </div>

                      <!-- Text Area Editor (Supervisor) -->
                      <div v-if="editingState.about" class="mb-3 p-3 rounded bg-dark-glass">
                        <textarea v-model="form.about" class="form-control bg-dark border-secondary text-white font-monospace mb-2" rows="6"></textarea>
                        <div class="d-flex justify-content-end gap-2">
                          <button class="btn btn-sm btn-outline-light px-3" @click="cancelEdit('about')">Batal</button>
                          <button class="btn btn-sm btn-gold px-3" :disabled="saving" @click="saveSection('about')">
                            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                            Simpan
                          </button>
                        </div>
                      </div>

                      <!-- Display Content -->
                      <p v-else class="store-intro-text leading-relaxed mb-4 text-justify" v-html="parsedAbout"></p>

                      <!-- Info Cards Grid -->
                      <div class="row g-3 mt-2">
                        <div class="col-sm-6 col-md-4">
                          <div class="info-pill-card p-3 rounded-3 d-flex align-items-center gap-3">
                            <div class="icon-circle d-flex align-items-center justify-content-center rounded-circle">
                              <i class="bi bi-geo-alt-fill text-gold fs-5"></i>
                            </div>
                            <div>
                              <div class="small fw-bold">Lokasi Toko</div>
                              <div class="small text-white-80 fw-bold">Jl. Diponegoro No. 116, Bali</div>
                            </div>
                          </div>
                        </div>

                        <div class="col-sm-6 col-md-4">
                          <div class="info-pill-card p-3 rounded-3 d-flex align-items-center gap-3">
                            <div class="icon-circle d-flex align-items-center justify-content-center rounded-circle">
                              <i class="bi bi-clock-fill text-gold fs-5"></i>
                            </div>
                            <div>
                              <div class="small fw-bold">Jam Operasional</div>
                              <div class="small text-white-80 fw-bold">09.00 - 21.00 WITA</div>
                            </div>
                          </div>
                        </div>

                        <div class="col-sm-6 col-md-4">
                          <div class="info-pill-card p-3 rounded-3 d-flex align-items-center gap-3">
                            <div class="icon-circle d-flex align-items-center justify-content-center rounded-circle">
                              <i class="bi bi-calendar3 text-gold fs-5"></i>
                            </div>
                            <div>
                              <div class="small fw-bold">Tahun Beroperasi</div>
                              <div class="small text-white-80 fw-bold">Sejak Tahun 1983</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Mission Section -->
                <div class="col-md-6">
                  <div class="profile-section-card p-4 border rounded-4 h-100 position-relative bg-white interactive-card">
                    <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h5 class="fw-extrabold text-dark d-flex align-items-center gap-2">
                        <i class="bi bi-trophy-fill text-gold"></i>
                        Misi Toko
                      </h5>
                      <button
                        v-if="isSupervisor"
                        class="btn btn-xs btn-outline-gold px-2.5 py-1 d-flex align-items-center gap-1 small"
                        @click="toggleEdit('mission')"
                      >
                        <i :class="['bi', editingState.mission ? 'bi-eye' : 'bi-pencil-square']"></i>
                        {{ editingState.mission ? 'Selesai Edit' : 'Edit' }}
                      </button>
                    </div>

                    <!-- Text Area Editor -->
                    <div v-if="editingState.mission" class="mb-3">
                      <textarea v-model="form.mission" class="form-control font-monospace mb-2" rows="8"></textarea>
                      <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-secondary btn-sm px-3" @click="cancelEdit('mission')">Batal</button>
                        <button class="btn btn-gold btn-sm px-3" :disabled="saving" @click="saveSection('mission')">
                          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                          Simpan
                        </button>
                      </div>
                    </div>

                    <!-- Display Content -->
                    <div v-else class="content-preview lh-lg" v-html="parsedMission"></div>
                  </div>
                </div>

                <!-- Values Section (Styled Grid of Value Cards) -->
                <div class="col-md-6">
                  <div class="profile-section-card p-4 border rounded-4 h-100 position-relative bg-white interactive-card">
                    <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                      <h5 class="fw-extrabold text-dark d-flex align-items-center gap-2">
                        <i class="bi bi-heart-fill text-gold"></i>
                        Nilai & Budaya Perusahaan
                      </h5>
                      <button
                        v-if="isSupervisor"
                        class="btn btn-xs btn-outline-gold px-2.5 py-1 d-flex align-items-center gap-1 small"
                        @click="toggleEdit('values')"
                      >
                        <i :class="['bi', editingState.values ? 'bi-eye' : 'bi-pencil-square']"></i>
                        {{ editingState.values ? 'Selesai Edit' : 'Edit' }}
                      </button>
                    </div>

                    <!-- Text Area Editor -->
                    <div v-if="editingState.values" class="mb-3">
                      <textarea v-model="form.values" class="form-control font-monospace mb-2" rows="8"></textarea>
                      <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-secondary btn-sm px-3" @click="cancelEdit('values')">Batal</button>
                        <button class="btn btn-gold btn-sm px-3" :disabled="saving" @click="saveSection('values')">
                          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                          Simpan
                        </button>
                      </div>
                    </div>

                    <!-- Display Content (Structured Value Cards) -->
                    <div v-else class="content-preview lh-lg" v-html="parsedValues"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: PERAN TIM (Struktur Grid Cards) -->
            <div v-else-if="activeTab === 'team'" key="team" class="tab-pane-content">
              <div class="profile-section-card p-4 border rounded-4 position-relative bg-white">
                <div class="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
                  <h5 class="fw-extrabold text-dark d-flex align-items-center gap-2">
                    <i class="bi bi-people-fill text-gold"></i>
                    Pembagian Peran & Tanggung Jawab Tim Toko
                  </h5>
                  <button
                    v-if="isSupervisor"
                    class="btn btn-sm btn-outline-gold px-3 d-flex align-items-center gap-1 d-none d-md-flex"
                    @click="toggleEdit('team')"
                  >
                    <i :class="['bi', editingState.team ? 'bi-eye' : 'bi-pencil-square']"></i>
                    {{ editingState.team ? 'Selesai Edit' : 'Edit' }}
                  </button>
                </div>

                <!-- Text Area Editor -->
                <div v-if="editingState.team" class="mb-3">
                  <textarea v-model="form.team" class="form-control font-monospace mb-2" rows="12"></textarea>
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-secondary btn-sm px-3" @click="cancelEdit('team')">Batal</button>
                    <button class="btn btn-gold btn-sm px-3" :disabled="saving" @click="saveSection('team')">
                      <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                      Simpan
                    </button>
                  </div>
                </div>

                <!-- Display Content (Rendered as Grid Cards) -->
                <div v-else class="content-preview" v-html="parsedTeam"></div>
              </div>
            </div>

            <!-- TAB 3: HAK & KEWAJIBAN (Split Layout) -->
            <div v-else-if="activeTab === 'rights'" key="rights" class="tab-pane-content">
              <div class="profile-section-card p-4 border rounded-4 position-relative bg-white">
                <div class="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
                  <h5 class="fw-extrabold text-dark d-flex align-items-center gap-2">
                    <i class="bi bi-award-fill text-gold"></i>
                    Hak & Kewajiban Karyawan
                  </h5>
                  <button
                    v-if="isSupervisor"
                    class="btn btn-sm btn-outline-gold px-3 d-flex align-items-center gap-1 d-none d-md-flex"
                    @click="toggleEdit('rightsAndObligations')"
                  >
                    <i :class="['bi', editingState.rightsAndObligations ? 'bi-eye' : 'bi-pencil-square']"></i>
                    {{ editingState.rightsAndObligations ? 'Selesai Edit' : 'Edit' }}
                  </button>
                </div>

                <!-- Text Area Editor -->
                <div v-if="editingState.rightsAndObligations" class="mb-3">
                  <textarea v-model="form.rightsAndObligations" class="form-control font-monospace mb-2" rows="15"></textarea>
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-secondary btn-sm px-3" @click="cancelEdit('rightsAndObligations')">Batal</button>
                    <button class="btn btn-gold btn-sm px-3" :disabled="saving" @click="saveSection('rightsAndObligations')">
                      <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                      Simpan
                    </button>
                  </div>
                </div>

                <!-- Display Content (Split Column Layout) -->
                <div v-else class="content-preview" v-html="parsedRightsAndObligations"></div>
              </div>
            </div>
          </transition>
        </template>
      </div>

      <!-- Footer Info Last Update -->
      <div v-if="!loading && (meta.lastUpdated || meta.updatedBy)" class="card-footer bg-light border-0 py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2 text-muted small">
        <span>Terakhir diperbarui: <strong>{{ formatDateTime(meta.lastUpdated) }}</strong></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { fetchStoreProfile, saveStoreProfile } from "@/services/toko-service";

const auth = useAuthStore();
const { error: showError } = useAlert();

// Reactive States
const loading = ref(true);
const saving = ref(false);
const activeTab = ref("profile");

const tabs = [
  { id: "profile", label: "Profil & Misi", icon: "bi-info-circle-fill" },
  { id: "team", label: "Struktur & Peran Tim", icon: "bi-people-fill" },
  { id: "rights", label: "Hak & Kewajiban", icon: "bi-award-fill" }
];

// Profile Data in Firestore
const profileData = ref({
  about: "",
  mission: "",
  values: "",
  team: "",
  rightsAndObligations: ""
});

// Editing form state
const form = reactive({
  about: "",
  mission: "",
  values: "",
  team: "",
  rightsAndObligations: ""
});

const meta = ref({
  lastUpdated: null,
  updatedBy: ""
});

// Segmented editing switches
const editingState = reactive({
  about: false,
  mission: false,
  values: false,
  team: false,
  rightsAndObligations: false
});

// Roles check
const isSupervisor = computed(() => ["supervisor", "hrd"].includes(auth.userRole));
const brandName = computed(() => (auth.activeFloor === "L2" ? "Melati Gold Young" : "Melati Gold Shop"));

// Markdown simple parser
function parseMarkdown(text) {
  if (!text) return "";
  
  // Basic HTML escape to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  
  // Headers: ### (H5), #### (H6), ## (H4)
  html = html.replace(/^### (.*?)$/gm, '<h5 class="mt-4 mb-2 text-gold fw-bold">$1</h5>');
  html = html.replace(/^#### (.*?)$/gm, '<h6 class="mt-3 mb-1 text-dark fw-bold">$1</h6>');
  html = html.replace(/^## (.*?)$/gm, '<h4 class="mt-4 mb-2 text-dark fw-bold">$1</h4>');
  
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-3 border-secondary-subtle" />');
  
  // Convert bullet lines & list elements
  const lines = html.split(/\r?\n/);
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    
    // Check for bullet characters: ●, ○, -, *, ✔, ✅
    if (trimmed.startsWith("●") || trimmed.startsWith("○") || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("✔") || trimmed.startsWith("✅")) {
      const char = trimmed[0];
      const content = trimmed.slice(1).trim();
      let icon = "bi-dot";
      let colorClass = "text-gold";
      
      if (char === "✔" || char === "✅") {
        icon = "bi-check-circle-fill";
        colorClass = "text-success";
      } else if (char === "○") {
        icon = "bi-circle-fill small-circle";
        colorClass = "text-muted";
      } else if (char === "●") {
        icon = "bi-patch-check-fill";
      } else {
        icon = "bi-arrow-right-short";
      }
      
      return `<div class="d-flex align-items-start gap-2 my-2 ps-2">
        <i class="bi ${icon} mt-1 fs-7 ${colorClass}"></i>
        <span class="flex-grow-1 text-dark-emphasis">${content}</span>
      </div>`;
    }
    
    // Check for numbered lists: 1. Text or a. Text
    const numListMatch = trimmed.match(/^(\d+|[a-zA-Z])\.\s+(.*)$/);
    if (numListMatch) {
      const num = numListMatch[1];
      const content = numListMatch[2];
      return `<div class="d-flex align-items-start gap-2 my-2">
        <span class="badge bg-gold-gradient rounded-pill mt-1" style="font-size: 0.72rem; min-width: 1.6rem; text-shadow: 0 1px 1px rgba(0,0,0,0.1);">${num}</span>
        <span class="flex-grow-1 text-dark-emphasis">${content}</span>
      </div>`;
    }
    
    if (trimmed === "") {
      return '<div class="py-1"></div>';
    }
    
    return `<p class="mb-1 text-justify leading-relaxed">${line}</p>`;
  });
  
  return processedLines.join("\n");
}

// Smart Parser for Team Grid Layout
function parseTeamGrid(text) {
  if (!text) return "";
  const roleBlocks = text.split(/\r?\n(?=\d+\.\s+)/);
  let html = '<div class="row g-4">';
  
  roleBlocks.forEach(block => {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length === 0) return;
    
    const titleLine = lines[0];
    const roleName = titleLine.replace(/^\d+\.\s+/, "").trim();
    const contentLines = lines.slice(1);
    
    let icon = "bi-person-badge";
    if (roleName.toLowerCase().includes("sales")) icon = "bi-gem text-warning";
    else if (roleName.toLowerCase().includes("admin")) icon = "bi-chat-dots-fill text-info";
    else if (roleName.toLowerCase().includes("input")) icon = "bi-box-seam-fill text-primary";
    else if (roleName.toLowerCase().includes("kasir")) icon = "bi-cash-coin text-success";
    
    html += `
      <div class="col-md-6 col-lg-3">
        <div class="team-card h-100 p-4 rounded-4 shadow-sm border border-light position-relative overflow-hidden bg-white interactive-card d-flex flex-column">
          <div class="team-card-badge text-white rounded-circle shadow-sm d-flex align-items-center justify-content-center mb-3">
            <i class="bi ${icon} fs-4"></i>
          </div>
          <h5 class="fw-extrabold text-dark mb-2 pb-1 border-bottom border-light">${roleName}</h5>
          <div class="team-card-content flex-grow-1 small text-secondary-emphasis lh-relaxed">
    `;
    
    contentLines.forEach(line => {
      const trimmed = line.trim();
      const cleanLine = trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      if (trimmed.startsWith("●") || trimmed.startsWith("○") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
        html += `
          <div class="d-flex align-items-start gap-2 my-2">
            <i class="bi bi-circle-fill text-gold mt-1.5" style="font-size: 0.35rem;"></i>
            <span>${cleanLine.slice(1).trim()}</span>
          </div>
        `;
      } else if (trimmed.startsWith("○") || trimmed.startsWith("sub-bullet")) {
        html += `
          <div class="d-flex align-items-start gap-2 my-1 ps-3 text-muted">
            <i class="bi bi-dash mt-1"></i>
            <span>${cleanLine.slice(1).trim()}</span>
          </div>
        `;
      } else if (trimmed !== "") {
        html += `<p class="mb-2 fw-bold text-dark-emphasis mt-2 small-heading">${cleanLine}</p>`;
      }
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

// Smart Parser for Values Grid
function parseValuesGrid(text) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  let description = "";
  const valueBlocks = [];
  let currentBlock = null;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
    
    if (match) {
      if (currentBlock) valueBlocks.push(currentBlock);
      currentBlock = {
        number: match[1],
        title: match[2],
        bullets: []
      };
    } else if (trimmed.startsWith("●") || trimmed.startsWith("○") || trimmed.startsWith("-")) {
      if (currentBlock) {
        currentBlock.bullets.push(trimmed.slice(1).trim());
      }
    } else if (trimmed !== "") {
      if (currentBlock) {
        currentBlock.description = trimmed;
      } else {
        description += `<p class="mb-3 text-muted leading-relaxed text-justify">${trimmed}</p>`;
      }
    }
  });
  if (currentBlock) valueBlocks.push(currentBlock);
  
  let html = `<div class="values-intro text-muted-dark border-bottom border-light pb-2 mb-4">${description.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</div>`;
  html += '<div class="row g-3">';
  
  valueBlocks.forEach(val => {
    let icon = "bi-shield-check";
    if (val.title.toLowerCase().includes("jujur")) icon = "bi-shield-fill-check text-success";
    else if (val.title.toLowerCase().includes("profesional")) icon = "bi-briefcase-fill text-warning";
    else if (val.title.toLowerCase().includes("kerja sama")) icon = "bi-people-fill text-info";
    else if (val.title.toLowerCase().includes("kepuasan")) icon = "bi-emoji-smile-fill text-success";
    else if (val.title.toLowerCase().includes("inovasi")) icon = "bi-lightning-charge-fill text-primary";
    
    html += `
      <div class="col-md-12">
        <div class="value-item-card p-3 rounded-4 border border-light shadow-sm d-flex gap-3 align-items-start interactive-card bg-white">
          <div class="icon-wrapper bg-light rounded-3 p-2.5 d-flex align-items-center justify-content-center shadow-sm">
            <i class="bi ${icon} fs-4"></i>
          </div>
          <div class="flex-grow-1">
            <h6 class="fw-extrabold text-dark mb-1">${val.number}. ${val.title}</h6>
    `;
    
    if (val.description) {
      html += `<p class="small text-muted mb-2 text-justify">${val.description.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    }
    
    val.bullets.forEach(bullet => {
      html += `
        <div class="d-flex align-items-start gap-2 my-1 ps-1 small text-secondary-emphasis">
          <i class="bi bi-check2 text-gold mt-1 fw-bold"></i>
          <span>${bullet.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</span>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

// Smart Parser for Rights & Obligations Split Column
function parseRightsSplit(text) {
  if (!text) return "";
  
  let hakText = "";
  let kewajibanText = "";
  
  if (text.includes("Kewajiban Karyawan")) {
    const parts = text.split(/Kewajiban Karyawan/i);
    hakText = parts[0];
    kewajibanText = parts[1];
  } else {
    hakText = text;
  }
  
  const parseListToCards = (rawText, isRights = true) => {
    const items = rawText.split(/\r?\n(?=\*\*)/);
    let cardsHtml = "";
    
    items.forEach(item => {
      const trimmed = item.trim();
      if (!trimmed) return;
      
      const lines = trimmed.split(/\r?\n/);
      const titleLine = lines[0];
      const title = titleLine.replace(/^\*\*|^\*\*\s*|^\d+\.\s+\*\*|^\*\*|:\*\*|\*\*$/g, "").replace(/\*\*:/, "").trim();
      const contentLines = lines.slice(1);
      
      let icon = isRights ? "bi-gift-fill text-success" : "bi-shield-fill-check text-primary";
      
      cardsHtml += `
        <div class="card border-0 shadow-sm p-3 mb-3 rounded-4 bg-white border-left-highlight ${isRights ? 'border-success-gold' : 'border-primary-gold'}">
          <div class="d-flex align-items-center gap-2 mb-2 border-bottom border-light pb-1">
            <i class="bi ${icon} fs-6"></i>
            <h6 class="fw-bold mb-0 text-dark" style="font-size: 0.92rem;">${title}</h6>
          </div>
          <div class="small text-secondary-emphasis lh-relaxed">
      `;
      
      contentLines.forEach(line => {
        const lineTrim = line.trim();
        const cleanLine = lineTrim.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        if (lineTrim.startsWith("●") || lineTrim.startsWith("○") || lineTrim.startsWith("-") || lineTrim.startsWith("*")) {
          cardsHtml += `
            <div class="d-flex align-items-start gap-2 my-1.5 ps-1">
              <i class="bi bi-circle-fill mt-1.5 text-gold-subtle" style="font-size: 0.3rem;"></i>
              <span>${cleanLine.slice(1).trim()}</span>
            </div>
          `;
        } else if (lineTrim !== "") {
          cardsHtml += `<p class="mb-1 text-muted small">${cleanLine}</p>`;
        }
      });
      
      cardsHtml += `
          </div>
        </div>
      `;
    });
    
    return cardsHtml;
  };
  
  const cleanHak = hakText.replace(/###\s*Hak Karyawan|Hak Karyawan/gi, "").trim();
  const cleanKewajiban = kewajibanText.replace(/###\s*Kewajiban Karyawan|Kewajiban Karyawan/gi, "").trim();
  
  const hakCards = parseListToCards(cleanHak, true);
  const kewajibanCards = parseListToCards(cleanKewajiban, false);
  
  return `
    <div class="row g-4">
      <div class="col-lg-6">
        <div class="rights-column-card p-4 rounded-4 shadow-sm border border-success-subtle h-100 bg-success-light">
          <div class="d-flex align-items-center gap-2 mb-4">
            <div class="icon-circle-bg bg-success text-white rounded-circle d-flex align-items-center justify-content-center">
              <i class="bi bi-award fs-5"></i>
            </div>
            <h5 class="fw-extrabold text-success mb-0">Hak Karyawan</h5>
          </div>
          ${hakCards}
        </div>
      </div>
      <div class="col-lg-6">
        <div class="obligations-column-card p-4 rounded-4 shadow-sm border border-primary-subtle h-100 bg-primary-light">
          <div class="d-flex align-items-center gap-2 mb-4">
            <div class="icon-circle-bg bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
              <i class="bi bi-shield-check fs-5"></i>
            </div>
            <h5 class="fw-extrabold text-primary mb-0">Kewajiban Karyawan</h5>
          </div>
          ${kewajibanCards}
        </div>
      </div>
    </div>
  `;
}

// Parsed HTML Computeds
const parsedAbout = computed(() => parseMarkdown(profileData.value.about));
const parsedMission = computed(() => parseMarkdown(profileData.value.mission));
const parsedValues = computed(() => parseValuesGrid(profileData.value.values));
const parsedTeam = computed(() => parseTeamGrid(profileData.value.team));
const parsedRightsAndObligations = computed(() => parseRightsSplit(profileData.value.rightsAndObligations));

// Load data
async function loadProfile() {
  loading.value = true;
  try {
    const data = await fetchStoreProfile();
    profileData.value = {
      about: data.about || "",
      mission: data.mission || "",
      values: data.values || "",
      team: data.team || "",
      rightsAndObligations: data.rightsAndObligations || ""
    };
    
    // Sync forms
    form.about = profileData.value.about;
    form.mission = profileData.value.mission;
    form.values = profileData.value.values;
    form.team = profileData.value.team;
    form.rightsAndObligations = profileData.value.rightsAndObligations;
    
    meta.value.lastUpdated = data.lastUpdated || null;
    meta.value.updatedBy = data.updatedBy || "System";
  } catch (err) {
    showError("Gagal Memuat Profil", err.message);
  } finally {
    loading.value = false;
  }
}

// Edit actions
function toggleEdit(section) {
  editingState[section] = !editingState[section];
  if (editingState[section]) {
    form[section] = profileData.value[section];
  }
}

function cancelEdit(section) {
  editingState[section] = false;
  form[section] = profileData.value[section];
}

async function saveSection(section) {
  if (saving.value) return;
  saving.value = true;
  
  // Clone data and update specified section
  const updatedPayload = {
    ...profileData.value,
    [section]: form[section]
  };

  try {
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveStoreProfile(updatedPayload, updatedBy);
    
    // Update local profileData on success
    profileData.value[section] = form[section];
    editingState[section] = false;
    
    // Fetch last updated timestamp
    const data = await fetchStoreProfile();
    meta.value.lastUpdated = data.lastUpdated;
    meta.value.updatedBy = data.updatedBy;

    await Swal.fire({
      icon: "success",
      title: "Tersimpan!",
      text: `Bagian ${section.toUpperCase()} telah berhasil diubah dan diperbarui.`,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (err) {
    showError("Gagal Menyimpan Perubahan", err.message);
  } finally {
    saving.value = false;
  }
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch (_) {
    return isoString;
  }
}

onMounted(() => {
  loadProfile();
});
</script>

<style scoped>
/* Gold & Gradient Theming */
.text-gold,
:deep(.text-gold) {
  color: #aa7c11;
}

.btn-gold {
  color: #fff;
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
  border: none;
  transition: all 0.25s ease;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(170, 124, 17, 0.2);
}

.btn-gold:hover:not(:disabled) {
  background: linear-gradient(135deg, #e5c158 0%, #c09224 100%);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(170, 124, 17, 0.3);
}

.btn-gold:active {
  transform: translateY(0);
}

.bg-gold-gradient,
:deep(.bg-gold-gradient) {
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%) !important;
  color: #fff !important;
}

/* Tabs Styling */
.tab-btn {
  border: 1px solid transparent;
  background-color: transparent;
  border-radius: 10px;
  font-size: 0.92rem;
}

.active-tab {
  background-color: #fff !important;
  color: #aa7c11 !important;
  border: 1px solid #e9ecef !important;
  border-bottom: 3px solid #aa7c11 !important;
}

.hover-bg:hover {
  background-color: rgba(170, 124, 17, 0.06);
  color: #aa7c11 !important;
}

.transition-all {
  transition: all 0.25s ease-in-out !important;
}

/* Premium Card Styling */
.profile-section-card {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  background-color: #fff;
}

:deep(.interactive-card) {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

:deep(.interactive-card:hover) {
  transform: translateY(-5px) !important;
  box-shadow: 0 15px 30px rgba(170, 124, 17, 0.08) !important;
  border-color: rgba(170, 124, 17, 0.3) !important;
}

/* Hero Banner Styling */
.store-hero-banner {
  background: linear-gradient(135deg, #1c1c1e 0%, #0d0d0f 100%);
  border-radius: 16px;
  position: relative;
}

.overlay-glass {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, rgba(212, 175, 55, 0.04) 0%, transparent 100%);
  pointer-events: none;
}

.brand-logo-circle {
  width: 50px;
  height: 50px;
}

.bg-gold-light {
  background-color: rgba(212, 175, 55, 0.25);
  border: 1px solid rgba(212, 175, 55, 0.4);
}

.text-gold-glow {
  color: #f1d382;
  text-shadow: 0 0 10px rgba(241, 211, 130, 0.25);
}

.store-intro-text {
  font-size: 1.05rem;
  color: #e2e2e7;
  line-height: 1.8;
  font-weight: 400;
}

.info-pill-card {
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.info-pill-card .icon-circle {
  width: 38px;
  height: 38px;
  background-color: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.25);
}

.text-white-80 {
  color: rgba(255, 255, 255, 0.85);
}

/* Supervisor edit buttons */
.btn-gold-outline {
  border: 1px solid rgba(212, 175, 55, 0.5);
  color: #f1d382;
  background-color: transparent;
  transition: all 0.2s;
}

.btn-gold-outline:hover {
  background-color: rgba(212, 175, 55, 0.15);
  color: #fff;
  border-color: #f1d382;
}

.bg-dark-glass {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 4px;
}

/* Values Grid CSS styling output */
:deep(.value-item-card) {
  border-radius: 12px;
}

:deep(.value-item-card .icon-wrapper) {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background-color: rgba(170, 124, 17, 0.06) !important;
  border: 1px solid rgba(170, 124, 17, 0.1);
  color: #aa7c11;
}

/* Staff Team Cards styling output */
:deep(.team-card) {
  border-radius: 16px;
  background-color: #ffffff;
}

:deep(.team-card-badge) {
  width: 48px;
  height: 48px;
  background-color: rgba(170, 124, 17, 0.05) !important;
  border: 1px solid rgba(170, 124, 17, 0.15) !important;
}

:deep(.small-heading) {
  color: #aa7c11 !important;
  border-bottom: 1px dashed rgba(170, 124, 17, 0.15);
  padding-bottom: 2px;
  font-size: 0.82rem;
}

/* Rights & Obligations styling output */
:deep(.rights-column-card) {
  background-color: #f6faf7;
  border-color: #d1ebd8 !important;
}

:deep(.obligations-column-card) {
  background-color: #f6f8fa;
  border-color: #dbe4eb !important;
}

:deep(.rights-column-card .icon-circle-bg) {
  width: 38px;
  height: 38px;
  background-color: #198754;
}

:deep(.obligations-column-card .icon-circle-bg) {
  width: 38px;
  height: 38px;
  background-color: #0d6efd;
}

:deep(.border-left-highlight) {
  border-left: 4px solid !important;
}

:deep(.border-success-gold) {
  border-left-color: #198754 !important;
}

:deep(.border-primary-gold) {
  border-left-color: #0d6efd !important;
}

:deep(.text-gold-subtle) {
  color: rgba(170, 124, 17, 0.6);
}

/* Animations */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.badge-role-info {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

:deep(.small-circle) {
  font-size: 0.45rem !important;
}

:deep(p.leading-relaxed) {
  line-height: 1.75;
}

/* Scrollable tabs navigation on mobile */
.tabs-scrollable {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  padding-bottom: 2px;
}
.tabs-scrollable::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

@media (max-width: 575.98px) {
  /* Header spacing */
  .page-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.75rem !important;
  }
  .badge-role-info {
    align-self: flex-start;
  }
  .page-title {
    font-size: 1.4rem !important;
  }
  
  /* Tabs padding */
  .tab-btn {
    padding: 0.5rem 1rem !important;
    font-size: 0.85rem !important;
  }
  
  /* Main Container Card body padding */
  .card-body.p-4 {
    padding: 1.25rem !important;
  }
  
  /* Store Hero Banner */
  .store-hero-banner {
    padding: 1.5rem 1.25rem !important;
  }
  .brand-logo-circle {
    width: 44px !important;
    height: 44px !important;
  }
  .brand-logo-circle i {
    font-size: 1.15rem !important;
  }
  .store-hero-banner h2 {
    font-size: 1.4rem !important;
  }
  .store-intro-text {
    font-size: 0.92rem !important;
    line-height: 1.6 !important;
  }
  
  /* Info Pill Cards inside Store Hero Banner */
  .info-pill-card {
    padding: 0.75rem 1rem !important;
  }
  .info-pill-card .icon-circle {
    width: 32px !important;
    height: 32px !important;
  }
  .info-pill-card .icon-circle i {
    font-size: 0.95rem !important;
  }
  
  /* Profile Section Cards (Mission & Values) */
  .profile-section-card {
    padding: 1.25rem !important;
  }
  .profile-section-card h5 {
    font-size: 1.1rem !important;
  }
  .content-preview {
    font-size: 0.88rem !important;
    line-height: 1.65 !important;
  }
  
  /* Tab 2: Team Responsibilities Cards */
  :deep(.team-card) {
    padding: 1.25rem !important;
  }
  :deep(.team-card-badge) {
    width: 38px !important;
    height: 38px !important;
    margin-bottom: 0.75rem !important;
  }
  :deep(.team-card-badge i) {
    font-size: 1.15rem !important;
  }
  
  /* Tab 3: Rights & Obligations Column Cards */
  :deep(.rights-column-card),
  :deep(.obligations-column-card) {
    padding: 1.25rem !important;
  }
  :deep(.rights-column-card .mb-4),
  :deep(.obligations-column-card .mb-4) {
    margin-bottom: 1.25rem !important;
  }
  :deep(.border-left-highlight) {
    padding: 1rem !important;
    margin-bottom: 1rem !important;
    border-radius: 12px !important;
  }
  
  /* Mobile-only full-width buttons */
  .btn-edit-responsive {
    width: 100% !important;
    justify-content: center !important;
  }
}
</style>
