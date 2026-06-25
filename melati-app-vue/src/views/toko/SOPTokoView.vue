<template>
  <div class="page-content">
    <!-- Header Page -->
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
      <div>
        <h1 class="page-title d-flex align-items-center gap-2">
          <i class="bi bi-file-earmark-text text-gold"></i>
          SOP Operasional
        </h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">SOP Operasional</li>
          </ol>
        </nav>
      </div>

      <!-- Info Role Alert Banner -->
      <div class="badge-role-info shadow-sm d-flex align-items-center gap-2 px-3 py-2 rounded-pill">
        <i :class="isSupervisor ? 'bi-shield-check text-success' : 'bi-info-circle text-primary'"></i>
        <span class="small fw-semibold text-secondary">
          Role: <span class="text-uppercase text-dark font-monospace">{{ auth.userRole || 'staff' }}</span>
        </span>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="card border-0 shadow-sm mb-4 overflow-hidden rounded-4">
      <div class="card-body p-2 bg-light rounded-top d-flex gap-2 flex-wrap border-bottom">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="btn tab-btn px-4 py-2.5 fw-bold d-flex align-items-center gap-2 transition-all"
          :class="activeTab === tab.id ? 'active-tab shadow-sm' : 'text-secondary hover-bg'"
          @click="activeTab = tab.id"
        >
          <i :class="['bi', tab.icon]"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- Main Content Area with Smooth Transitions -->
      <div class="card-body p-4 bg-white rounded-bottom">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-gold text-center d-block mx-auto mb-3" role="status" style="width: 3rem; height: 3rem">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="text-muted">Memuat dokumen SOP...</p>
        </div>

        <template v-else>
          <transition name="tab-fade" mode="out-in">
            <!-- TAB 1: TATA TERTIB & SOP STAFF -->
            <div v-if="activeTab === 'staff'" key="staff" class="tab-pane-content">
              <div class="profile-section-card p-4 border rounded-4 position-relative bg-white">
                <div class="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
                  <h5 class="fw-extrabold text-dark d-flex align-items-center gap-2">
                    <i class="bi bi-journal-text text-gold"></i>
                    Tata Tertib & SOP Harian Staff
                  </h5>
                  <button
                    v-if="isSupervisor"
                    class="btn btn-sm btn-outline-gold px-3 d-flex align-items-center gap-1"
                    @click="toggleEdit('staffSOP')"
                  >
                    <i :class="['bi', editingState.staffSOP ? 'bi-eye' : 'bi-pencil-square']"></i>
                    {{ editingState.staffSOP ? 'Selesai Edit' : 'Edit Teks' }}
                  </button>
                </div>

                <!-- Text Area Editor (Supervisor) -->
                <div v-if="editingState.staffSOP" class="mb-3">
                  <textarea v-model="form.staffSOP" class="form-control font-monospace mb-2" rows="18"></textarea>
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-secondary btn-sm px-3" @click="cancelEdit('staffSOP')">Batal</button>
                    <button class="btn btn-gold btn-sm px-3" :disabled="saving" @click="saveSection('staffSOP')">
                      <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                      Simpan
                    </button>
                  </div>
                </div>

                <!-- Display Content (Structured Cards Layout) -->
                <div v-else class="content-preview" v-html="parsedStaffSOP"></div>
              </div>
            </div>

            <!-- TAB 2: PANDUAN EMAS -->
            <div v-else-if="activeTab === 'gold'" key="gold" class="tab-pane-content">
              <div class="profile-section-card p-4 border rounded-4 position-relative bg-white">
                <div class="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
                  <h5 class="fw-extrabold text-dark d-flex align-items-center gap-2">
                    <i class="bi bi-coin text-gold"></i>
                    Pengetahuan Dasar Perhiasan Emas
                  </h5>
                  <button
                    v-if="isSupervisor"
                    class="btn btn-sm btn-outline-gold px-3 d-flex align-items-center gap-1"
                    @click="toggleEdit('goldKnowledge')"
                  >
                    <i :class="['bi', editingState.goldKnowledge ? 'bi-eye' : 'bi-pencil-square']"></i>
                    {{ editingState.goldKnowledge ? 'Selesai Edit' : 'Edit Teks' }}
                  </button>
                </div>

                <!-- Text Area Editor (Supervisor) -->
                <div v-if="editingState.goldKnowledge" class="mb-3">
                  <textarea v-model="form.goldKnowledge" class="form-control font-monospace mb-2" rows="18"></textarea>
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-secondary btn-sm px-3" @click="cancelEdit('goldKnowledge')">Batal</button>
                    <button class="btn btn-gold btn-sm px-3" :disabled="saving" @click="saveSection('goldKnowledge')">
                      <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                      Simpan
                    </button>
                  </div>
                </div>

                <!-- Display Content (Themed Topic Cards Grid) -->
                <div v-else class="content-preview" v-html="parsedGoldKnowledge"></div>
              </div>
            </div>

            <!-- TAB 3: PANDUAN BERLIAN -->
            <div v-else-if="activeTab === 'diamond'" key="diamond" class="tab-pane-content">
              <!-- Diamond Knowledge Text Content (Structured Sub-Cards Grid) -->
              <div class="profile-section-card p-4 border rounded-4 position-relative bg-white shadow-sm">
                <div class="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
                  <h5 class="fw-extrabold text-dark d-flex align-items-center gap-2 mb-0">
                    <i class="bi bi-gem text-gold"></i>
                    Pengetahuan Dasar Berlian & Perawatan
                  </h5>
                  <button
                    v-if="isSupervisor"
                    class="btn btn-sm btn-outline-gold px-3 d-flex align-items-center gap-1"
                    @click="toggleEdit('diamondKnowledge')"
                  >
                    <i :class="['bi', editingState.diamondKnowledge ? 'bi-eye' : 'bi-pencil-square']"></i>
                    {{ editingState.diamondKnowledge ? 'Selesai Edit' : 'Edit Teks' }}
                  </button>
                </div>

                <!-- Text Area Editor (Supervisor) -->
                <div v-if="editingState.diamondKnowledge" class="mb-3">
                  <textarea v-model="form.diamondKnowledge" class="form-control font-monospace mb-2" rows="18"></textarea>
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-secondary btn-sm px-3" @click="cancelEdit('diamondKnowledge')">Batal</button>
                    <button class="btn btn-gold btn-sm px-3" :disabled="saving" @click="saveSection('diamondKnowledge')">
                      <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                      Simpan
                    </button>
                  </div>
                </div>

                <!-- Display Content (Rendered dynamically into modern grid lists & tables) -->
                <div v-else class="content-preview" v-html="parsedDiamondKnowledge"></div>
              </div>
            </div>
          </transition>
        </template>
      </div>

      <!-- Footer Info Last Update -->
      <div v-if="!loading && (meta.lastUpdated || meta.updatedBy)" class="card-footer bg-light border-0 py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2 text-muted small">
        <span>Terakhir diperbarui: <strong>{{ formatDateTime(meta.lastUpdated) }}</strong></span>
        <span>Diperbarui oleh: <strong class="text-gold">{{ meta.updatedBy }}</strong></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { fetchStoreSOP, saveStoreSOP } from "@/services/toko-service";

const auth = useAuthStore();
const { error: showError } = useAlert();

// Reactive States
const loading = ref(true);
const saving = ref(false);
const activeTab = ref("staff");

const tabs = [
  { id: "staff", label: "Tata Tertib & SOP Staff", icon: "bi-journal-text" },
  { id: "gold", label: "Panduan Perhiasan Emas", icon: "bi-coin" },
  { id: "diamond", label: "Panduan Berlian", icon: "bi-gem" }
];

// SOP Data in Firestore
const sopData = ref({
  staffSOP: "",
  goldKnowledge: "",
  diamondKnowledge: ""
});

// Editing form state
const form = reactive({
  staffSOP: "",
  goldKnowledge: "",
  diamondKnowledge: ""
});

const meta = ref({
  lastUpdated: null,
  updatedBy: ""
});

// Segmented editing switches
const editingState = reactive({
  staffSOP: false,
  goldKnowledge: false,
  diamondKnowledge: false
});

// Roles check
const isSupervisor = computed(() => ["supervisor", "hrd"].includes(auth.userRole));

// Dynamic content sub-block parser
function parseInnerMarkdown(text) {
  const lines = text.split(/\r?\n/);
  let inTable = false;
  let tableHeader = true;
  let tableHTML = "";
  const processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if line is a table row (contains | )
    if (trimmed.startsWith("|") || (trimmed.includes("|") && !trimmed.startsWith("http") && !trimmed.includes("class="))) {
      if (!inTable) {
        inTable = true;
        tableHeader = true;
        tableHTML = '<div class="table-responsive my-3 shadow-sm border rounded"><table class="table table-hover table-striped align-middle mb-0"><thead class="table-dark">';
      }
      
      const cells = trimmed.split("|").map(c => c.trim()).filter((c, idx, arr) => {
        if (idx === 0 && c === "") return false;
        if (idx === arr.length - 1 && c === "") return false;
        return true;
      });
      
      // Separator row: e.g. --- | ---
      if (cells.every(c => /^:-{1,}:*|:-{1,}|-{1,}:*|-{1,}$/.test(c))) {
        if (tableHeader) {
          tableHTML += '</thead><tbody>';
          tableHeader = false;
        }
        continue;
      }
      
      tableHTML += '<tr>';
      cells.forEach(cell => {
        const cleanCell = cell.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        if (tableHeader) {
          tableHTML += `<th class="fw-bold px-3 py-2" style="font-size: 0.82rem;">${cleanCell}</th>`;
        } else {
          tableHTML += `<td class="px-3 py-2 text-secondary font-monospace" style="font-size: 0.8rem;">${cleanCell}</td>`;
        }
      });
      tableHTML += '</tr>';
      
      const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
      if (!nextLine.includes("|")) {
        inTable = false;
        if (tableHeader) {
          tableHTML += '</thead>';
        }
        tableHTML += '</tbody></table></div>';
        processedLines.push(tableHTML);
        tableHTML = "";
      }
      continue;
    }
    
    // Check for bullets
    if (trimmed.startsWith("●") || trimmed.startsWith("○") || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("✔") || trimmed.startsWith("✅")) {
      const char = trimmed[0];
      const content = trimmed.slice(1).trim().replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      let icon = "bi-dot";
      let colorClass = "text-gold";
      
      // Determine if it is indented/nested
      const isIndented = line.startsWith("  ") || line.startsWith("\t");
      const paddingClass = isIndented ? "ps-4" : "ps-2";
      
      if (char === "✔" || char === "✅") {
        icon = "bi-check-circle-fill";
        colorClass = "text-success";
      } else if (char === "○" || isIndented) {
        icon = "bi-circle-fill small-circle";
        colorClass = "text-muted";
      } else if (char === "●") {
        icon = "bi-patch-check-fill";
      } else {
        icon = "bi-arrow-right-short";
      }
      
      processedLines.push(`<div class="d-flex align-items-start gap-2 my-2 ${paddingClass}">
        <i class="bi ${icon} mt-1 fs-7 ${colorClass}"></i>
        <span class="flex-grow-1 text-dark-emphasis">${content}</span>
      </div>`);
      continue;
    }
    
    // Check for numbered items
    const numListMatch = trimmed.match(/^(\d+|[a-zA-Z])\.\s+(.*)$/);
    if (numListMatch) {
      const num = numListMatch[1];
      const content = numListMatch[2].replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      const isIndented = line.startsWith("  ") || line.startsWith("\t");
      const paddingClass = isIndented ? "ps-4" : "";
      processedLines.push(`<div class="d-flex align-items-start gap-2 my-2 ${paddingClass}">
        <span class="badge bg-gold-gradient rounded-pill mt-1" style="font-size: 0.72rem; min-width: 1.6rem; text-shadow: 0 1px 1px rgba(0,0,0,0.1);">${num}</span>
        <span class="flex-grow-1 text-dark-emphasis">${content}</span>
      </div>`);
      continue;
    }
    
    if (trimmed === "") {
      processedLines.push('<div class="py-1"></div>');
      continue;
    }
    
    const parsedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    processedLines.push(`<p class="mb-2 text-dark-emphasis text-justify leading-relaxed">${parsedLine}</p>`);
  }
  
  return processedLines.join("\n");
}

// Smart Parser for Staff SOP Cards Grid
function parseStaffSOP(text) {
  if (!text) return "";
  
  const parts = text.split(/### BAGIAN 2: SOP ALUR KERJA HARIAN/i);
  const part1Raw = parts[0] || "";
  const part2Raw = parts[1] || "";
  
  const parsePartToHTML = (rawText, isPart1 = true) => {
    const blocks = rawText.split(/[\r\n]+(?=####(?![#]))/);
    let introHtml = "";
    const cards = [];
    
    blocks.forEach(block => {
      const lines = block.trim().split(/\r?\n/);
      if (lines.length === 0) return;
      
      const titleLine = lines[0] ? lines[0].trim() : "";
      if (!titleLine.startsWith("####")) {
        const cleanIntro = block.replace(/#.*$/gm, "").replace(/---/g, "").trim();
        if (isPart1 && cleanIntro) {
          introHtml = `
            <div class="col-12 mb-4">
              <div class="section-intro-card p-3.5 rounded-4 border d-flex gap-3 align-items-center bg-light-gold border-left-gold border-gold-subtle shadow-sm">
                <div class="intro-icon-wrapper rounded-circle d-flex align-items-center justify-content-center bg-gold-light text-gold" style="width: 40px; height: 40px; flex-shrink: 0;">
                  <i class="bi bi-info-circle-fill fs-5"></i>
                </div>
                <div class="text-secondary-emphasis leading-relaxed small text-justify mb-0">
                  ${parseInnerMarkdown(cleanIntro)}
                </div>
              </div>
            </div>
          `;
        }
        return;
      }
      
      const title = titleLine.replace(/^####\s*(?:📌\s*)?/, "").trim();
      const contentLines = lines.slice(1).join("\n");
      
      let icon = "bi-journal-check";
      let borderClass = "border-left-gold";
      if (title.toLowerCase().includes("kedisiplinan") || title.toLowerCase().includes("kehadiran")) {
        icon = "bi-clock-fill text-gold";
      } else if (title.toLowerCase().includes("etika") || title.toLowerCase().includes("pelanggan")) {
        icon = "bi-heart-fill text-danger";
      } else if (title.toLowerCase().includes("transaksi") || title.toLowerCase().includes("penjualan")) {
        icon = "bi-cash-coin text-success";
      } else if (title.toLowerCase().includes("cuti") || title.toLowerCase().includes("kepegawaian")) {
        icon = "bi-calendar2-check-fill text-info";
      } else if (title.toLowerCase().includes("fasilitas") || title.toLowerCase().includes("sanksi")) {
        icon = "bi-exclamation-triangle-fill text-warning";
      } else if (title.toLowerCase().includes("buka") || title.toLowerCase().includes("opening")) {
        icon = "bi-door-open-fill text-success";
        borderClass = "border-left-success";
      } else if (title.toLowerCase().includes("stok") || title.toLowerCase().includes("keep")) {
        icon = "bi-box-seam-fill text-warning";
        borderClass = "border-left-warning";
      } else if (title.toLowerCase().includes("rusak") || title.toLowerCase().includes("cacat")) {
        icon = "bi-tools text-danger";
        borderClass = "border-left-danger";
      } else if (title.toLowerCase().includes("tutup") || title.toLowerCase().includes("closing")) {
        icon = "bi-lock-fill text-secondary";
        borderClass = "border-left-secondary";
      }
      
      cards.push(`
        <div class="sop-block-card p-4 rounded-4 shadow-sm border border-light bg-white position-relative overflow-hidden interactive-card ${borderClass}">
          <div class="d-flex align-items-center gap-2.5 mb-3 border-bottom border-light pb-2">
            <div class="sop-icon-circle bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 38px; height: 38px;">
              <i class="bi ${icon} fs-5"></i>
            </div>
            <h5 class="fw-extrabold text-dark mb-0" style="font-size: 0.95rem;">${title}</h5>
          </div>
          <div class="sop-card-body small text-secondary-emphasis lh-relaxed">
            ${parseInnerMarkdown(contentLines)}
          </div>
        </div>
      `);
    });
    
    const col1Cards = [];
    const col2Cards = [];
    
    if (isPart1) {
      cards.forEach((card, idx) => {
        if (idx === 0 || idx === 2) {
          col1Cards.push(card);
        } else {
          col2Cards.push(card);
        }
      });
    } else {
      cards.forEach((card, idx) => {
        if (idx === 0 || idx === 2 || idx === 3 || idx === 4) {
          col1Cards.push(card);
        } else {
          col2Cards.push(card);
        }
      });
    }
    
    return `
      ${introHtml}
      <div class="row g-4">
        <div class="col-md-6 d-flex flex-column gap-4">
          ${col1Cards.join("\n")}
        </div>
        <div class="col-md-6 d-flex flex-column gap-4">
          ${col2Cards.join("\n")}
        </div>
      </div>
    `;
  };
  
  const cleanPart1 = part1Raw.trim();
  
  return `
    <div class="bagian-sop-section mb-5">
      <div class="section-title-badge mb-4">
        <span class="badge bg-gold-gradient text-white px-3 py-2 rounded-pill fw-bold text-uppercase tracking-wider" style="font-size: 0.95rem;">Bagian 1: Peraturan & Tata Tertib</span>
      </div>
      ${parsePartToHTML(cleanPart1, true)}
    </div>
    
    <div class="bagian-sop-section mt-5">
      <div class="section-title-badge mb-4">
        <span class="badge bg-gold-gradient text-white px-3 py-2 rounded-pill fw-bold text-uppercase tracking-wider" style="font-size: 0.95rem;">Bagian 2: SOP Alur Kerja Harian</span>
      </div>
      ${parsePartToHTML(part2Raw, false)}
    </div>
  `;
}

// Smart Parser for Gold Knowledge Card Grid
function parseGoldKnowledge(text) {
  if (!text) return "";
  
  const cleanText = text.replace(/📌.*$/gm, "").trim();
  const blocks = cleanText.split(/[\r\n]+(?=\s*\d+\.\s+)/);
  
  let html = '<div class="row g-4">';
  
  blocks.forEach((block, index) => {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length === 0) return;
    
    const titleLine = lines[0] ? lines[0].trim() : "";
    const title = titleLine.replace(/^\d+\.\s+/, "").trim();
    const contentLines = lines.slice(1).join("\n");
    
    const icons = [
      "bi-patch-check-fill text-warning",        // 1. Jenis Kadar SNI
      "bi-info-circle-fill text-gold",          // 2. Perbedaan Emas
      "bi-layers-fill text-primary",            // 3. Terbuat dari bahan apa
      "bi-droplet-half text-info",              // 4. Ketahanan warna
      "bi-exclamation-triangle-fill text-danger",// 5. Yang mempengaruhi ketahanan
      "bi-graph-down-arrow text-secondary",     // 6. Apakah bisa menyusut
      "bi-stars text-success"                   // 7. Perawatan emas
    ];
    const icon = icons[index] || "bi-gem text-gold";
    
    html += `
      <div class="col-md-12 col-lg-6">
        <div class="gold-block-card p-4 rounded-4 shadow-sm border border-light bg-white h-100 position-relative overflow-hidden interactive-card border-left-gold">
          <div class="d-flex align-items-center gap-2.5 mb-3 border-bottom border-light pb-2">
            <div class="sop-icon-circle bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 38px; height: 38px;">
              <i class="bi ${icon} fs-5"></i>
            </div>
            <h5 class="fw-extrabold text-dark mb-0" style="font-size: 0.95rem;">${index + 1}. ${title}</h5>
          </div>
          <div class="sop-card-body small text-secondary-emphasis lh-relaxed">
            ${parseInnerMarkdown(contentLines)}
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

// Smart Parser for Diamond 4C Cards & Tables
function parseDiamondKnowledge(text) {
  if (!text) return "";
  
  const cleanText = text.replace(/📌.*$/gm, "").trim();
  const sections = cleanText.split(/[\r\n]+(?=\s*[1-9]️⃣\s*)/);
  
  let html = "";
  
  let introTextHtml = "";
  let sec1 = "";
  let sec2 = "";
  let sec3 = "";
  let sec4 = "";

  sections.forEach(sec => {
    const trimmed = sec.trim();
    if (trimmed.startsWith("1️⃣") || trimmed.includes("Penilaian Berlian")) {
      sec1 = trimmed;
    } else if (trimmed.startsWith("2️⃣") || trimmed.includes("Berlian di Melati")) {
      sec2 = trimmed;
    } else if (trimmed.startsWith("3️⃣") || trimmed.includes("Sistem Buyback")) {
      sec3 = trimmed;
    } else if (trimmed.startsWith("4️⃣") || trimmed.includes("Perawatan Berlian")) {
      sec4 = trimmed;
    } else if (trimmed && !sec1 && !sec2 && !sec3 && !sec4) {
      // It's the intro text before the first section
      introTextHtml = `<p class="text-secondary-emphasis mb-4 small leading-relaxed text-justify">${parseInnerMarkdown(trimmed)}</p>`;
    }
  });

  // ── SECTION 1: 4C (Column 1 Content) ──────────────────────────────────────
  let sec1Html = "";
  if (sec1) {
    const lines = sec1.trim().split(/\r?\n/);
    const sectionTitle = lines[0] ? lines[0].replace(/^1️⃣\s*/, "").trim() : "Penilaian Berlian: 4C (Carat, Cut, Color, Clarity)";
    const contentRaw = lines.slice(1).join("\n");
    const subSecs = contentRaw.split(/[\r\n]+(?=\s*[A-Z]\.\s+)/);
    
    const subCards = [];
    
    subSecs.forEach((sub) => {
      const subLines = sub.trim().split(/\r?\n/);
      if (subLines.length === 0) return;
      
      const subTitleLine = subLines[0] ? subLines[0].trim() : "";
      
      if (!/^[A-Z]\.\s+/.test(subTitleLine)) {
        if (sub.trim()) {
          subCards.push(`<p class="text-secondary-emphasis mb-3 small leading-relaxed text-justify">${parseInnerMarkdown(sub)}</p>`);
        }
        return;
      }
      
      const subTitle = subTitleLine.replace(/^[A-Z]\.\s+/, "").trim();
      const subContent = subLines.slice(1).join("\n");
      
      let subIcon = "bi-gem";
      const lowerTitle = subTitle.toLowerCase();
      if (lowerTitle.includes("carat") || lowerTitle.includes("karat")) {
        subIcon = "bi-rulers text-primary";
      } else if (lowerTitle.includes("cut") || lowerTitle.includes("potongan")) {
        subIcon = "bi-bezier2 text-success";
      } else if (lowerTitle.includes("color") || lowerTitle.includes("warna")) {
        subIcon = "bi-palette text-warning";
      } else if (lowerTitle.includes("clarity") || lowerTitle.includes("kejernihan")) {
        subIcon = "bi-eye-fill text-info";
      }
      
      const cardHtml = `
        <div class="mb-4">
          <h6 class="fw-extrabold mb-2 d-flex align-items-center gap-2">
            <div class="sop-icon-circle bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 32px; height: 32px;">
              <i class="bi ${subIcon} fs-6"></i>
            </div>
            <span class="text-dark">${subTitle}</span>
          </h6>
          <div class="small text-secondary-emphasis ps-1">
            ${parseInnerMarkdown(subContent)}
          </div>
        </div>
      `;
      subCards.push(cardHtml);
    });
    
    sec1Html = `
      <div class="profile-section-card p-4 border rounded-4 bg-white interactive-card border-left-gold">
        <div class="d-flex align-items-center gap-2.5 mb-3 border-bottom border-light pb-2">
          <div class="sop-icon-circle bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 38px; height: 38px;">
            <i class="bi bi-gem text-gold fs-5"></i>
          </div>
          <h5 class="fw-extrabold text-dark mb-0" style="font-size: 0.95rem;">1️⃣ ${sectionTitle}</h5>
        </div>
        <div class="sop-card-body">
          ${subCards.join("\n")}
        </div>
      </div>
    `;
  }
  
  // ── SECTION 2: Berlian di Melati Gold Shop ──────────────────────────────
  let sec2Html = "";
  if (sec2) {
    const lines = sec2.trim().split(/\r?\n/);
    const sectionTitle = lines[0] ? lines[0].trim() : "2️⃣ Berlian di Melati Gold Shop";
    const contentRaw = lines.slice(1).join("\n");
    
    sec2Html = `
      <div class="profile-section-card p-4 border rounded-4 bg-white interactive-card border-left-primary">
        <div class="d-flex align-items-center gap-2.5 mb-3 border-bottom border-light pb-2">
          <div class="sop-icon-circle bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 38px; height: 38px;">
            <i class="bi bi-shop-window text-primary fs-5"></i>
          </div>
          <h5 class="fw-extrabold text-dark mb-0" style="font-size: 0.95rem;">${sectionTitle}</h5>
        </div>
        <div class="sop-card-body small text-secondary-emphasis lh-relaxed">
          ${parseInnerMarkdown(contentRaw)}
        </div>
      </div>
    `;
  }
  
  // ── SECTION 3: Sistem Buyback ───────────────────────────────────────────
  let sec3Html = "";
  if (sec3) {
    const lines = sec3.trim().split(/\r?\n/);
    const sectionTitle = lines[0] ? lines[0].trim() : "3️⃣ Sistem Buyback (Penjualan Kembali) Berlian";
    const contentRaw = lines.slice(1).join("\n");
    
    sec3Html = `
      <div class="profile-section-card p-4 border rounded-4 bg-light-gold border-gold-subtle interactive-card border-left-success">
        <div class="d-flex align-items-center gap-2.5 mb-3 border-bottom border-light pb-2">
          <div class="sop-icon-circle bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 38px; height: 38px;">
            <i class="bi bi-arrow-left-right text-success fs-5"></i>
          </div>
          <h5 class="fw-extrabold text-dark mb-0" style="font-size: 0.95rem;">${sectionTitle}</h5>
        </div>
        <div class="sop-card-body small text-secondary-emphasis lh-relaxed">
          ${parseInnerMarkdown(contentRaw)}
        </div>
      </div>
    `;
  }
  
  // ── SECTION 4: Perawatan Berlian ─────────────────────────────────────────
  let sec4Html = "";
  if (sec4) {
    const lines = sec4.trim().split(/\r?\n/);
    const sectionTitle = lines[0] ? lines[0].trim() : "4️⃣ Perawatan Berlian Agar Tetap Berkilau";
    const contentRaw = lines.slice(1).join("\n");
    
    sec4Html = `
      <div class="profile-section-card p-4 border rounded-4 bg-white interactive-card border-left-info">
        <div class="d-flex align-items-center gap-2.5 mb-3 border-bottom border-light pb-2">
          <div class="sop-icon-circle bg-light rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 38px; height: 38px;">
            <i class="bi bi-stars text-info fs-5"></i>
          </div>
          <h5 class="fw-extrabold text-dark mb-0" style="font-size: 0.95rem;">${sectionTitle}</h5>
        </div>
        <div class="sop-card-body small text-secondary-emphasis lh-relaxed">
          ${parseInnerMarkdown(contentRaw)}
        </div>
      </div>
    `;
  }
  // Layout in two columns (Left: Section 1, Right: Section 2, Section 3, and Section 4 stacked)
  html += `
    ${introTextHtml}
    <div class="row g-4 mb-4">
      <div class="col-md-6 d-flex flex-column gap-4">
        ${sec1Html}
      </div>
      <div class="col-md-6 d-flex flex-column gap-4">
        ${sec2Html}
        ${sec3Html}
        ${sec4Html}
      </div>
    </div>
  `;
  
  return html;
}

// Parsed HTML Computeds
const parsedStaffSOP = computed(() => parseStaffSOP(sopData.value.staffSOP));
const parsedGoldKnowledge = computed(() => parseGoldKnowledge(sopData.value.goldKnowledge));
const parsedDiamondKnowledge = computed(() => parseDiamondKnowledge(sopData.value.diamondKnowledge));

// Load data
async function loadSOP() {
  loading.value = true;
  try {
    const data = await fetchStoreSOP();
    sopData.value = {
      staffSOP: data.staffSOP || "",
      goldKnowledge: data.goldKnowledge || "",
      diamondKnowledge: data.diamondKnowledge || ""
    };
    
    // Sync forms
    form.staffSOP = sopData.value.staffSOP;
    form.goldKnowledge = sopData.value.goldKnowledge;
    form.diamondKnowledge = sopData.value.diamondKnowledge;
    
    meta.value.lastUpdated = data.lastUpdated || null;
    meta.value.updatedBy = data.updatedBy || "System";
  } catch (err) {
    showError("Gagal Memuat SOP", err.message);
  } finally {
    loading.value = false;
  }
}

// Edit actions
function toggleEdit(section) {
  editingState[section] = !editingState[section];
  if (editingState[section]) {
    form[section] = sopData.value[section];
  }
}

function cancelEdit(section) {
  editingState[section] = false;
  form[section] = sopData.value[section];
}

async function saveSection(section) {
  if (saving.value) return;
  saving.value = true;
  
  // Clone data and update specified section
  const updatedPayload = {
    ...sopData.value,
    [section]: form[section]
  };

  try {
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveStoreSOP(updatedPayload, updatedBy);
    
    // Update local sopData on success
    sopData.value[section] = form[section];
    editingState[section] = false;
    
    // Fetch last updated timestamp
    const data = await fetchStoreSOP();
    meta.value.lastUpdated = data.lastUpdated;
    meta.value.updatedBy = data.updatedBy;

    await Swal.fire({
      icon: "success",
      title: "Tersimpan!",
      text: `Dokumen SOP bagian ${section.toUpperCase()} telah berhasil diperbarui.`,
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
  loadSOP();
});
</script>

<style scoped>
/* Gold & Gradient Theming */
.text-gold,
:deep(.text-gold) {
  color: #aa7c11;
}

.btn-outline-gold {
  color: #aa7c11;
  border-color: #aa7c11;
  background-color: transparent;
  transition: all 0.2s ease;
}

.btn-outline-gold:hover {
  color: #fff;
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
  border-color: #aa7c11;
}

.btn-gold {
  color: #fff;
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
  border: none;
  transition: all 0.2s ease;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(170, 124, 17, 0.2);
}

.btn-gold:hover:not(:disabled) {
  background: linear-gradient(135deg, #e5c158 0%, #c09224 100%);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(170, 124, 17, 0.3);
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

/* Border left highlights for categories */
.border-left-gold,
:deep(.border-left-gold) {
  border-left: 4px solid #aa7c11 !important;
}
.border-left-success,
:deep(.border-left-success) {
  border-left: 4px solid #198754 !important;
}
.border-left-warning,
:deep(.border-left-warning) {
  border-left: 4px solid #ffc107 !important;
}
.border-left-danger,
:deep(.border-left-danger) {
  border-left: 4px solid #dc3545 !important;
}
.border-left-secondary,
:deep(.border-left-secondary) {
  border-left: 4px solid #6c757d !important;
}
.border-left-primary,
:deep(.border-left-primary) {
  border-left: 4px solid #0d6efd !important;
}
.border-left-info,
:deep(.border-left-info) {
  border-left: 4px solid #0dcaf0 !important;
}
.border-top-gold,
:deep(.border-top-gold) {
  border-top: 4px solid #aa7c11 !important;
}

/* Icons Circles inside cards */
:deep(.sop-icon-circle) {
  background-color: rgba(170, 124, 17, 0.05) !important;
  border: 1px solid rgba(170, 124, 17, 0.1);
}

.badge-role-info {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

/* Calculator specific styles */
.calculator-card {
  background: linear-gradient(135deg, #fffcf5 0%, #fffbf2 100%);
  position: relative;
}

.calc-bg-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(400px at 90% 10%, rgba(212, 175, 55, 0.03), transparent 70%);
  pointer-events: none;
}

.border-gold-subtle {
  border: 1px solid rgba(212, 175, 55, 0.25) !important;
}

.result-panel {
  background-color: #fff;
  border: 1px dashed #aa7c11 !important;
}

.bg-success-light {
  background-color: #f6faf7;
}

.bg-gold-light {
  background-color: rgba(212, 175, 55, 0.15) !important;
  border: 1px solid rgba(212, 175, 55, 0.3) !important;
}

.bg-light-gold {
  background-color: #fffdf5 !important;
}

/* Dark theme tables output */
:deep(.table-responsive) {
  border-radius: 12px;
}

:deep(.table th) {
  background-color: #1e1e20 !important;
  color: #f1d382 !important;
  border: none;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.table td) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

/* Dynamic nested lists colors */
:deep(.text-gold-subtle) {
  color: rgba(170, 124, 17, 0.6);
}

:deep(.small-circle) {
  font-size: 0.45rem !important;
}

:deep(p.leading-relaxed) {
  line-height: 1.75;
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
</style>
