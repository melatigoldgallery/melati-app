<template>
  <div class="container-fluid py-3 admin-page">
    <!-- Header -->
    <div class="page-header mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <h1 class="d-flex align-items-center gap-2">
          Sistem Antrian
          <!-- Hidden printer status indicator (Path 1) -->
          <span 
            v-if="false"
            class="printer-status-indicator fs-5 cursor-pointer d-inline-flex align-items-center justify-content-center"
            :class="printerIconClass"
            :title="printerStatusTooltip"
            @click="openPrinterModal"
            style="cursor: pointer; width: 32px; height: 32px; border-radius: 50%;"
          >
            <i class="fas fa-print" style="font-size: 16px;"></i>
          </span>
        </h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><RouterLink to="/dashboard">Home</RouterLink></li>
            <li class="breadcrumb-item active">Antrian</li>
          </ol>
        </nav>
      </div>
      <div>
        <button
          class="btn btn-secondary text-white fw-semibold px-3 py-2 shadow-sm d-flex align-items-center gap-2"
          @click="openRosterModal"
        >
          <i class="fas fa-users-cog"></i>
          Pembagian Pelayanan
        </button>
      </div>
    </div>

    <!-- Printer Paper Alert Banner -->
    <Transition name="fade">
      <!-- Hidden printer paper alert banner (Path 1) -->
      <div 
        v-if="false && printerStatus.total_prints >= printerStatus.threshold" 
        class="alert alert-dismissible fade show shadow-sm border-0 d-flex align-items-center gap-3 p-3 mb-4 animate-fade-in"
        :class="printerStatus.total_prints >= printerStatus.max_capacity ? 'alert-danger-custom' : 'alert-warning-custom'"
        role="alert"
      >
        <div class="alert-icon-wrapper text-center" :class="printerStatus.total_prints >= printerStatus.max_capacity ? 'bg-danger text-white' : 'bg-warning text-dark'">
          <i class="fas fa-exclamation-triangle fs-4"></i>
        </div>
        <div class="flex-grow-1">
          <h6 class="alert-heading fw-bold mb-1">
            {{ printerStatus.total_prints >= printerStatus.max_capacity ? 'KERTAS PRINTER HABIS!' : 'KERTAS PRINTER HAMPIR HABIS!' }}
          </h6>
          <p class="mb-0 small">
            <span v-if="printerStatus.total_prints >= printerStatus.max_capacity" class="text-danger fw-semibold">
              Kapasitas cetak maksimal telah tercapai ({{ printerStatus.total_prints }}/{{ printerStatus.max_capacity }}). Silakan ganti roll kertas printer baru dan lakukan reset di menu Pengaturan Antrian.
            </span>
            <span v-else class="text-warning-emphasis fw-semibold">
              Tersisa sekitar <strong>{{ Math.max(0, printerStatus.max_capacity - printerStatus.total_prints) }}</strong> struk cetak lagi (Batas: {{ printerStatus.max_capacity }} struk). Mohon segera bersiap mengganti roll kertas.
            </span>
          </p>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    </Transition>

    <!-- Announcement buttons -->
    <div class="row mb-4 border-bottom">
      <div class="col-md-6 mb-2">
        <button
          :class="[
            'btn',
            'btn-danger',
            'announcement-btn',
            {
              'audio-active': audioActiveBtn === 'announceWait',
              'audio-blocked': audioActiveBtn !== '' && audioActiveBtn !== 'announceWait',
            },
          ]"
          @click="announceWait"
          :disabled="audioActiveBtn === 'announceWait'"
        >
          <i class="fas fa-info-circle"></i>
          Informasi Tunggu
        </button>
      </div>
      <div class="col-md-6 mb-2">
        <button
          :class="[
            'btn',
            'btn-success',
            'announcement-btn',
            {
              'audio-active': audioActiveBtn === 'announceReminder',
              'audio-blocked': audioActiveBtn !== '' && audioActiveBtn !== 'announceReminder',
            },
          ]"
          @click="announceReminder"
          :disabled="audioActiveBtn === 'announceReminder'"
        >
          <i class="fas fa-bell"></i>
          Pengingat Antrian
        </button>
      </div>
    </div>

    <!-- 2 Column Layout: Left Column (Beli), Right Column (Jual) -->
    <div class="row g-4">
      <!-- Kolom Kiri: BELI / TUKAR TAMBAH -->
      <div class="col-xl-6 col-12 border-end pe-xl-4">
        <!-- Summary Card -->
        <div class="card summary-card summary-card-beli text-center mb-3 border-0">
          <div class="card-body py-3">
            <div class="fw-bold text-muted mb-1" style="font-size: 1.35rem; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">
              <i class="fas fa-shopping-bag me-1"></i>
              BELI / TUKAR TAMBAH (A-C)
            </div>
            <div class="summary-label text-muted small mb-1" style="font-size: 0.72rem; font-weight: 600; letter-spacing: 0.5px;">BELUM DILAYANI</div>
            <div class="summary-value" style="font-size: 2.1rem; font-weight: 800;">{{ unservedBeliCount }} <span class="summary-unit">orang</span></div>
          </div>
        </div>

        <div class="row g-3">
          <!-- Card 3: Nomor Beli Saat Ini -->
          <div class="col-md-6">
            <div class="card queue-card">
              <div class="card-header d-flex justify-content-center p-2">
                <h6 class="card-title mb-0 text-dark">Nomor Beli Saat Ini</h6>
              </div>
              <div class="card-body">
                <div class="queue-display current-number mb-3">{{ beliCurrentQueueStr }}</div>
                <div class="action-buttons">
                  <button
                    :class="['btn', 'btn-outline-primary', { 'audio-active': audioActiveBtn === 'callCurrentBeli' }]"
                    @click="callCurrent('beli')"
                    :disabled="audioActiveBtn !== '' || beliCurrentQueueStr === '-'"
                  >
                    <i class="fas fa-bullhorn"></i> Panggil
                  </button>
                  <button class="btn btn-outline-success" @click="openServeConfirm('beli')" :disabled="busy || (!hybridMode && unservedBeliCount === 0)">
                    <i class="fas fa-check-circle"></i> Sudah Dilayani
                  </button>
                  <button class="btn btn-outline-secondary" @click="openDelay('beli')" :disabled="busy || beliCurrentQueueStr === '-'">
                    <i class="fas fa-pause-circle"></i> Tunda Nomor
                  </button>
                  <button class="btn btn-outline-warning" @click="openCustom('beli')" :disabled="busy">
                    <i class="fas fa-edit"></i> Custom
                  </button>
                  <button class="btn btn-outline-danger" @click="openReset" :disabled="busy">
                    <i class="fas fa-redo-alt"></i> Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 1: Handle Antrian Terlewat -->
          <div class="col-md-6">
            <div class="card queue-card">
              <div class="card-header d-flex justify-content-center p-2 text-white">
                <h6 class="card-title mb-0 text-dark">Terlewat (Beli)</h6>
              </div>
              <div class="card-body">
                <div class="queue-display current-number mb-3">{{ beliMissedDisplay }}</div>
                <div class="action-buttons">
                  <button
                    :class="['btn', 'btn-outline-primary', { 'audio-active': audioActiveBtn === 'callMissedBeli' }]"
                    @click="callMissedFirst('beli')"
                    :disabled="audioActiveBtn !== '' || state.beli.missedQueue.length === 0"
                  >
                    <i class="fas fa-bullhorn"></i> Panggil
                  </button>
                  <button class="btn btn-outline-success" @click="openMissedHandle('beli')" :disabled="busy || state.beli.missedQueue.length === 0">
                    <i class="fas fa-check-circle"></i> Sudah Dilayani
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 4: Skip List -->
          <div class="col-md-6">
            <div class="card queue-card">
              <div class="card-header d-flex justify-content-center p-2">
                <h6 class="card-title mb-0 text-dark">Skip List (Beli)</h6>
              </div>
              <div class="card-body">
                <div class="queue-display list-display mb-2">{{ beliSkipDisplay }}</div>
                <button class="btn btn-outline-primary w-100 py-2 fw-semibold" @click="openSkip('beli')" :disabled="busy">
                  <i class="fas fa-forward me-1"></i> Skip Nomor
                </button>
              </div>
            </div>
          </div>

          <!-- Card 2: Antrian Tertunda -->
          <div class="col-md-6">
            <div class="card queue-card">
              <div class="card-header d-flex justify-content-center p-2">
                <h6 class="card-title mb-0 text-dark">Tertunda (Beli)</h6>
              </div>
              <div class="card-body">
                <div class="queue-display list-display mb-3">{{ beliDelayedDisplay }}</div>
                <div class="action-buttons">
                  <button class="btn btn-outline-danger" @click="openMoveToMissed('beli')" :disabled="busy || state.beli.delayedQueue.length === 0">
                    <i class="fas fa-exclamation-circle me-1"></i> Lewatkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kolom Kanan: JUAL / SERVIS -->
      <div class="col-xl-6 col-12 ps-xl-4">
        <!-- Summary Card -->
        <div class="card summary-card summary-card-jual text-center mb-3 border-0">
          <div class="card-body py-3">
            <div class="fw-bold text-muted mb-1" style="font-size: 1.35rem; font-family: 'Playfair Display', serif; letter-spacing: 0.5px;">
              <i class="fas fa-handshake me-1"></i>
              JUAL / SERVIS (E)
            </div>
            <div class="summary-label text-muted small mb-1" style="font-size: 0.72rem; font-weight: 600; letter-spacing: 0.5px;">BELUM DILAYANI</div>
            <div class="summary-value" style="font-size: 2.1rem; font-weight: 800;">{{ unservedJualCount }} <span class="summary-unit">orang</span></div>
          </div>
        </div>

        <div class="row g-3">
          <!-- Card 3: Nomor Jual Saat Ini -->
          <div class="col-md-6">
            <div class="card queue-card">
              <div class="card-header d-flex justify-content-center p-2">
                <h6 class="card-title mb-0 text-dark">Nomor Jual Saat Ini</h6>
              </div>
              <div class="card-body">
                <div class="queue-display current-number mb-3">{{ jualCurrentQueueStr }}</div>
                <div class="action-buttons">
                  <button
                    :class="['btn', 'btn-outline-primary', { 'audio-active': audioActiveBtn === 'callCurrentJual' }]"
                    @click="callCurrent('jual')"
                    :disabled="audioActiveBtn !== '' || jualCurrentQueueStr === '-'"
                  >
                    <i class="fas fa-bullhorn"></i> Panggil
                  </button>
                  <button class="btn btn-outline-success" @click="openServeConfirm('jual')" :disabled="busy || (!hybridMode && unservedJualCount === 0)">
                    <i class="fas fa-check-circle"></i> Sudah Dilayani
                  </button>
                  <button class="btn btn-outline-secondary" @click="openDelay('jual')" :disabled="busy || jualCurrentQueueStr === '-'">
                    <i class="fas fa-pause-circle"></i> Tunda Nomor
                  </button>
                  <button class="btn btn-outline-warning" @click="openCustom('jual')" :disabled="busy">
                    <i class="fas fa-edit"></i> Custom
                  </button>
                  <button class="btn btn-outline-danger" @click="openReset" :disabled="busy">
                    <i class="fas fa-redo-alt"></i> Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 1: Handle Antrian Terlewat -->
          <div class="col-md-6">
            <div class="card queue-card">
              <div class="card-header d-flex justify-content-center p-2 text-white">
                <h6 class="card-title mb-0 text-dark">Terlewat (Jual)</h6>
              </div>
              <div class="card-body">
                <div class="queue-display current-number mb-3">{{ jualMissedDisplay }}</div>
                <div class="action-buttons">
                  <button
                    :class="['btn', 'btn-outline-primary', { 'audio-active': audioActiveBtn === 'callMissedJual' }]"
                    @click="callMissedFirst('jual')"
                    :disabled="audioActiveBtn !== '' || state.jual.missedQueue.length === 0"
                  >
                    <i class="fas fa-bullhorn"></i> Panggil
                  </button>
                  <button class="btn btn-outline-success" @click="openMissedHandle('jual')" :disabled="busy || state.jual.missedQueue.length === 0">
                    <i class="fas fa-check-circle"></i> Sudah Dilayani
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 4: Skip List -->
          <div class="col-md-6">
            <div class="card queue-card">
              <div class="card-header d-flex justify-content-center p-2">
                <h6 class="card-title mb-0 text-dark">Skip List (Jual)</h6>
              </div>
              <div class="card-body">
                <div class="queue-display list-display mb-2">{{ jualSkipDisplay }}</div>
                <button class="btn btn-outline-primary w-100 py-2 fw-semibold" @click="openSkip('jual')" :disabled="busy">
                  <i class="fas fa-forward me-1"></i> Skip Nomor
                </button>
              </div>
            </div>
          </div>

          <!-- Card 2: Antrian Tertunda -->
          <div class="col-md-6">
            <div class="card queue-card">
              <div class="card-header d-flex justify-content-center p-2">
                <h6 class="card-title mb-0 text-dark">Tertunda (Jual)</h6>
              </div>
              <div class="card-body">
                <div class="queue-display list-display mb-3">{{ jualDelayedDisplay }}</div>
                <div class="action-buttons">
                  <button class="btn btn-outline-danger" @click="openMoveToMissed('jual')" :disabled="busy || state.jual.delayedQueue.length === 0">
                    <i class="fas fa-exclamation-circle me-1"></i> Lewatkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Pelayanan (Card 3 Sudah Dilayani) -->
    <div class="modal fade" id="confirmModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
              <i class="fas fa-check-circle me-2"></i>
              Konfirmasi Pelayanan
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="state[modalQueueType]">
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              Anda akan menyelesaikan pelayanan nomor antrian ini dan memanggil nomor berikutnya.
            </div>
            <p v-if="state[modalQueueType].currentNumber < state[modalQueueType].lastNumber" class="mb-0">
              Apakah Anda yakin? Sistem akan mencatat nomor saat ini sebagai sudah dilayani dan memanggil nomor berikutnya.
            </p>
            <p v-else class="mb-0">
              Apakah Anda yakin nomor antrian ini sudah dilayani? (Tidak ada antrian berikutnya yang menunggu).
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Tidak
            </button>
            <button type="button" class="btn btn-outline-success" @click="confirmServed" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Ya, Sudah Dilayani
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Pindahkan ke Antrian Terlewat (Card 1) -->
    <div class="modal fade" id="moveToMissedModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-circle me-2"></i>
              Pindahkan ke Antrian Terlewat
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="state[modalQueueType]">
            <div class="alert alert-danger">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Pilih nomor antrian tertunda yang akan dipindahkan ke daftar terlewat.
            </div>
            <div class="mb-3">
              <label class="form-label">Pilih nomor antrian:</label>
              <select v-model="moveToMissedSelected" class="form-select">
                <option v-for="q in state[modalQueueType].delayedQueue" :key="q" :value="q">{{ q }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Batal
            </button>
            <button type="button" class="btn btn-outline-danger" @click="confirmMoveToMissed" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Pindahkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Pelayanan Terlewat (Card 2 Sudah Dilayani) -->
    <div class="modal fade" id="missedHandleModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
              <i class="fas fa-check-circle me-2"></i>
              Konfirmasi Pelayanan Terlewat
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="state[modalQueueType]">
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              Pilih nomor antrian terlewat yang sudah dilayani.
            </div>
            <div class="mb-3">
              <label class="form-label">Pilih nomor antrian yang sudah dilayani:</label>
              <select v-model="missedHandleSelected" class="form-select">
                <option v-for="q in state[modalQueueType].missedQueue" :key="q" :value="q">{{ q }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Batal
            </button>
            <button type="button" class="btn btn-outline-success" @click="confirmMissedHandle" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Antrian Tertunda (Card 3 Tunda) -->
    <div class="modal fade" id="confirmDelayModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-secondary text-white">
            <h5 class="modal-title">
              <i class="fas fa-pause-circle me-2"></i>
              Konfirmasi Antrian Tertunda
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-secondary">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Anda akan memindahkan nomor antrian ini ke daftar antrian tertunda.
            </div>
            <p>Apakah Anda yakin ingin memindahkan nomor antrian saat ini ke antrian tertunda?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Tidak
            </button>
            <button type="button" class="btn btn-outline-secondary" @click="confirmDelay" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Ya, Pindahkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Skip Nomor Antrian -->
    <div class="modal fade" id="skipQueueModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-warning text-white">
            <h5 class="modal-title">
              <i class="fas fa-forward me-2"></i>
              Skip Nomor Antrian
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Anda akan melewati nomor antrian tertentu.
            </div>
            <p>
              Tipe antrian: <strong>{{ modalQueueType === 'jual' ? 'Jual / Servis (E)' : 'Beli / Tukar Tambah (A-C)' }}</strong>
            </p>
            <div class="mb-3">
              <label class="form-label">Pilih Huruf Antrian</label>
              <select v-model="customLetter" class="form-select">
                <option v-for="(letChar, idx) in (modalQueueType === 'jual' ? ['E'] : ['A', 'B', 'C'])" :key="letChar" :value="idx">
                  {{ letChar }}
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Nomor Antrian yang Akan Dilewati (1-50)</label>
              <input
                v-model.number="skipNumber"
                type="number"
                min="1"
                max="50"
                class="form-control"
                placeholder="Masukkan nomor antrian"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Batal
            </button>
            <button type="button" class="btn btn-outline-warning" @click="confirmSkip" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Tambahkan ke Skip List
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Custom Nomor Antrian -->
    <div class="modal fade" id="customQueueModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-edit me-2"></i>
              Set Custom Nomor Antrian
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              Anda akan mengatur nomor antrian aktif saat ini secara manual.
            </div>
            <p>
              Tipe antrian: <strong>{{ modalQueueType === 'jual' ? 'Jual / Servis (E)' : 'Beli / Tukar Tambah (A-C)' }}</strong>
            </p>
            <div class="mb-3">
              <label class="form-label">Pilih Huruf Antrian</label>
              <select v-model="customLetter" class="form-select">
                <option v-for="(letChar, idx) in (modalQueueType === 'jual' ? ['E'] : ['A', 'B', 'C'])" :key="letChar" :value="idx">
                  {{ letChar }}
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Nomor Antrian (1-50)</label>
              <input
                v-model.number="customNumber"
                type="number"
                min="1"
                max="50"
                class="form-control"
                placeholder="Masukkan nomor antrian"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Batal
            </button>
            <button type="button" class="btn btn-outline-primary" @click="confirmCustom" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Reset -->
    <div class="modal fade" id="resetModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Konfirmasi Reset</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle me-2"></i>
              <strong>Perhatian!</strong>
              Tindakan ini akan mereset seluruh data antrian (Jual & Beli).
            </div>
            <p>Apakah Anda yakin ingin mereset seluruh nomor antrian? Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-outline-danger" @click="confirmReset" :disabled="busy">
              <i class="fas fa-redo-alt me-2"></i>
              Ya, Reset Antrian
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Pembagian Pelayanan Staff -->
    <div class="modal fade" id="rosterModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; background-color: #ffffff;">
          <div class="modal-header border-0 pb-2 pt-4 px-4 d-flex justify-content-between align-items-start">
            <div>
              <h5 class="modal-title fw-bold text-dark d-flex align-items-center gap-2 mb-1" style="font-family: 'Playfair Display', serif; font-size: 1.4rem;">
                <i class="fas fa-users-cog text-warning"></i>
                Pembagian Pelayanan Sales
              </h5>
              <div class="d-flex flex-wrap align-items-center gap-2 small text-muted mt-1">
                <span class="badge bg-light text-dark border px-2 py-1" style="font-weight: 500;">
                  <i class="fas fa-layer-group me-1 text-muted"></i>Lantai {{ activeFloor }}
                </span>
                <span class="badge bg-warning bg-opacity-10 text-muted border border-warning border-opacity-20 px-2 py-1" style="font-weight: 500;">
                  <i class="fas fa-clock me-1"></i>Shift {{ getCurrentShift() === 'morning' ? 'Pagi' : 'Sore' }}
                </span>
                <span class="badge bg-info bg-opacity-10 text-muted border border-info border-opacity-20 px-2 py-1" style="font-weight: 500;">
                  <i class="fas fa-calendar-alt me-1 text-muted"></i>{{ todayStringWITA() }}
                </span>
              </div>
            </div>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <div class="modal-body px-4 pb-4 pt-3">
            <div v-if="loadingRosterModal" class="text-center py-5">
              <div class="spinner-border text-warning" role="status"></div>
              <p class="text-muted mt-2 small">Memuat data absensi...</p>
            </div>

            <div v-else class="row g-4">
              <!-- Left Column: Staff Checklist -->
              <div class="col-md-6 border-end" style="border-color: #f1f5f9 !important;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="fw-bold text-dark mb-0" style="font-size: 0.95rem;">
                    <i class="fas fa-clipboard-list text-muted me-1"></i>
                    Pilih Staff Sales
                  </h6>
                  <span class="badge bg-secondary bg-opacity-10 text-secondary small px-2 py-0.5" style="font-size: 0.75rem; font-weight: 600;">
                    {{ filteredAttendanceList.length }} orang
                  </span>
                </div>

                <!-- Search input -->
                <div class="mb-3">
                  <div class="input-group input-group-sm rounded-3 shadow-none border" style="background-color: #f8fafc; border-color: #e2e8f0 !important;">
                    <span class="input-group-text bg-transparent border-0 pe-1">
                      <i class="fas fa-search text-muted" style="font-size: 0.8rem;"></i>
                    </span>
                    <input
                      v-model="searchQuery"
                      type="text"
                      class="form-control bg-transparent border-0 py-2 shadow-none text-dark"
                      placeholder="Cari nama sales..."
                      style="font-size: 0.85rem;"
                    />
                    <button
                      v-if="searchQuery"
                      class="btn bg-transparent border-0 pe-2 py-0 shadow-none text-muted"
                      type="button"
                      @click="searchQuery = ''"
                    >
                      <i class="fas fa-times-circle" style="font-size: 0.9rem;"></i>
                    </button>
                  </div>
                </div>

                <!-- Checklist -->
                <div v-if="attendanceList.length === 0" class="text-muted py-5 text-center small">
                  <i class="fas fa-info-circle me-1"></i> Tidak ada data staff absen masuk untuk shift ini.
                </div>
                <div v-else>
                  <div v-if="filteredAttendanceList.length === 0" class="text-muted py-5 text-center small">
                    <i class="fas fa-search-minus me-1"></i> Tidak ada nama sales yang cocok.
                  </div>
                  <div v-else class="d-flex flex-column gap-1 overflow-auto pe-1" style="max-height: 500px; scrollbar-width: thin;">
                    <div
                      v-for="att in filteredAttendanceList"
                      :key="att.id"
                      class="p-2 rounded-2 d-flex align-items-center justify-content-between"
                      :style="{
                        backgroundColor: selectedSalesNames.includes(att.name) ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }"
                    >
                      <div class="form-check d-flex align-items-center gap-2 mb-0" style="cursor: pointer;">
                        <input
                          class="form-check-input ms-0 border-secondary-subtle"
                          type="checkbox"
                          :id="'roster-staff-' + att.id"
                          :value="att.name"
                          v-model="selectedSalesNames"
                          :disabled="isNameLocked(att.name)"
                          style="cursor: pointer;"
                        />
                        <label
                          class="form-check-label small fw-semibold text-dark mb-0 ms-1"
                          :for="'roster-staff-' + att.id"
                          style="cursor: pointer; user-select: none;"
                        >
                          {{ att.name }}
                        </label>
                      </div>

                      <!-- Rotation Status & Locked Badge -->
                      <div class="d-flex align-items-center gap-1">
                        <span v-if="isNameLocked(att.name)" class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20 small py-0.5">
                          Aktif di {{ activeFloor === 'L1' ? 'L2' : 'L1' }}
                        </span>
                        <template v-else>
                          <!-- Live Preview Duty Badge -->
                          <span
                            v-if="selectedSalesNames.includes(att.name) && previewRotation.jual.map(n => n.trim()).includes(att.name.trim())"
                            class="badge bg-warning bg-opacity-15 text-dark border border-warning border-opacity-30 small py-0.5"
                            style="font-size: 0.72rem; font-weight: 600;"
                          >
                            <i class="fas fa-star text-warning me-1"></i>Jual
                          </span>
                          <span
                            v-else-if="selectedSalesNames.includes(att.name)"
                            class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 small py-0.5"
                            style="font-size: 0.72rem; font-weight: 600;"
                          >
                            <i class="fas fa-shopping-bag text-primary me-1"></i>Beli
                          </span>

                          <!-- Past History Badge -->
                          <span
                            v-if="getStaffRosterStats(rosterHistory, att.name, todayStringWITA(), getCurrentShift()).text"
                            class="badge small py-0.5"
                            :class="getStaffRosterStats(rosterHistory, att.name, todayStringWITA(), getCurrentShift()).badgeClass"
                            style="font-size: 0.72rem; font-weight: 500;"
                          >
                            {{ getStaffRosterStats(rosterHistory, att.name, todayStringWITA(), getCurrentShift()).text }}
                          </span>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Column: Live Preview of Rotation -->
              <div class="col-md-6 ps-md-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="fw-bold text-dark mb-0" style="font-size: 0.95rem;">
                    <i class="fas fa-eye text-muted me-1"></i>
                    Preview Pembagian
                  </h6>
                </div>

                <!-- Jual Section -->
                <div class="mb-4">
                  <h6 class="fw-bold text-muted d-flex align-items-center gap-2 mb-2" style="font-size: 0.85rem;">
                    <i class="fas fa-handshake"></i>
                    Pelayanan Jual Emas
                  </h6>
                  <div v-if="previewRotation.jual.length > 0" class="d-flex flex-wrap gap-2">
                    <div
                      v-for="name in previewRotation.jual"
                      :key="name"
                      class="badge text-dark border bg-light d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold shadow-none"
                      style="font-size: 0.82rem;"
                    >
                      <i class="fas fa-user-tag text-warning"></i>
                      {{ name }}
                    </div>
                  </div>
                  <div v-else class="text-muted small border rounded p-3 bg-light text-center" style="border-style: dashed !important; border-color: #cbd5e1 !important;">
                    Belum ada sales Jual yang ditentukan.
                  </div>
                </div>

                <!-- Beli Section -->
                <div>
                  <h6 class="fw-bold text-muted d-flex align-items-center gap-2 mb-2" style="font-size: 0.85rem;">
                    <i class="fas fa-shopping-bag"></i>
                    Pelayanan Beli / Tukar Tambah
                  </h6>
                  <div v-if="previewRotation.beli.length > 0" class="d-flex flex-wrap gap-2">
                    <div
                      v-for="name in previewRotation.beli"
                      :key="name"
                      class="badge text-dark border bg-light d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold shadow-none"
                      style="font-size: 0.82rem;"
                    >
                      <i class="fas fa-user-tag text-primary"></i>
                      {{ name }}
                    </div>
                  </div>
                  <div v-else class="text-muted small border rounded p-3 bg-light text-center" style="border-style: dashed !important; border-color: #cbd5e1 !important;">
                    Belum ada sales Beli yang ditentukan.
                  </div>
                </div>

                <!-- Catatan Pembagian Pelayanan -->
                <div class="mt-4 p-3 bg-light border border-light-subtle rounded-3 text-secondary" style="font-size: 0.78rem; line-height: 1.45;">
                  <div class="d-flex gap-2 align-items-start">
                    <i class="fas fa-info-circle mt-0.5" style="font-size: 0.9rem; color: #d4af37 !important;"></i>
                    <div>
                      <strong class="text-dark d-block mb-1">Catatan Pembagian Pelayanan:</strong>
                      <ul class="ps-3 mb-0 text-muted" style="list-style-type: disc;">
                        <li class="mb-1.5">
                          Sales yang bertugas di bagian <strong>Jual Emas</strong> ikut membantu melayani customer di bagian <strong>Beli / Tukar Tambah</strong> jika tidak ada antrian transaksi jual, begitu juga sebaliknya.
                        </li>
                        <li class="mb-1.5">
                          Tujuan pemisahan ini adalah untuk mempercepat alur transaksi dan mencegah penumpukan antrian, terutama ketika terjadi lonjakan transaksi penjualan barang dari customer.
                        </li>
                        <li>
                          <div class="d-flex justify-content-between align-items-center mb-1">
                            <p class=" mb-0" style="font-size: 0.78rem;">Jika ada costomer yang menanyakan pemisahan antrian, berikan penjelasan dan pengertian, contoh:</p>
                          </div>
                           <div class="p-2 bg-white border rounded-3 text-muted mt-2" style="font-size: 0.75rem; line-height: 1.45;">
                            <em>"Pemisahan antrean ini dilakukan agar Kakak dilayani oleh tim sales khusus sesuai dengan keperluan transaksi Kakak (Beli/Jual). Mohon ditunggu ya Kak, terima kasih."</em>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0 px-4 pb-4 pt-2 d-flex justify-content-between">
            <button
              class="btn btn-primary fw-bold px-4 py-2 shadow-sm rounded-pill d-flex align-items-center gap-2"
              @click="saveRosterSelection"
              :disabled="busy || loadingRosterModal || selectedSalesNames.length === 0"
              style="background-color: #d4af37; border-color: #d4af37; font-size: 0.88rem;"
            >
              <span v-if="busy" class="spinner-border spinner-border-sm text-dark"></span>
              <i v-else class="fas fa-check-circle"></i>
              Terapkan
            </button>
            <div class="d-flex gap-2">
              <button
                class="btn btn-outline-secondary fw-semibold px-3 py-2 rounded-pill d-flex align-items-center gap-2"
                @click="resetRosterChecklist"
                :disabled="busy || loadingRosterModal"
                style="font-size: 0.88rem;"
              >
                <i class="fas fa-eraser"></i>
                Kosongkan
              </button>
              <button
                type="button"
                class="btn btn-light fw-semibold px-3 py-2 rounded-pill"
                data-bs-dismiss="modal"
                style="font-size: 0.88rem;"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Printer Status Modal Component (Hidden in Path 1) -->
    <PrinterStatusModal v-if="false" :printerStatus="printerStatus" :floorId="activeFloor" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { Modal } from "bootstrap";
import PrinterStatusModal from "./PrinterStatusModal.vue";
import Swal from "sweetalert2";
import { rtdb } from "@/config/firebase";
import { ref as dbRef, get } from "firebase/database";
import { useAuthStore } from "@/stores/auth";
import { fetchAttendanceByRange } from "@/services/absensi-service";
import { useWITA } from "@/composables/useWITA";
import {
  subscribeQueue,
  subscribeConnection,
  formatQueue,
  padNumber,
  LETTERS_MAP,
  nextQueue,
  setCustomQueue,
  addToSkipList,
  addToDelayedQueue,
  moveToMissed,
  removeFromMissed,
  resetQueue,
  writeAnalyticsEntry,
  subscribeActiveRoster,
  subscribeDailyRoster,
  saveActiveRosterToRTB,
  fetchQueueQuotaSettings,
  fetchRosterHistory,
  saveRosterHistory,
  calculateAutoRotation,
  getStaffRosterStats,
  subscribeRosterHistory,
  fetchQueueGeneralSettings,
  nextQueueHybrid,
  subscribePrinterStatus,
} from "@/services/antrian-service";
import {
  playQueueAnnouncement,
  playWaitMessageSequence,
  playTakeQueueMessage,
  playClosingAnnouncement,
  primeAudioPlayback,
  isAudioBusy,
} from "@/services/audio-service";
import {
  DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS,
  ensureClosingAnnouncementSettings,
  fetchClosingAnnouncementSettings,
  subscribeClosingAnnouncementSettings,
} from "@/services/antrian-closing-service";

const auth = useAuthStore();
const activeFloor = computed(() => auth.activeFloor || "L1");
const connected = ref(false);
const busy = ref(false);
const audioActiveBtn = ref("");
const lastAutoRunSlot = ref(null);
const closingSettings = ref({ ...DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS });
const hybridMode = ref(false);

const router = useRouter();

const printerStatus = ref({
  active_paper_type: "80x80",
  paper_roll_length: 40,
  ticket_length: 15.5,
  alert_threshold_pct: 85,
  total_prints: 0,
  max_capacity: 258,
  threshold: 219,
  last_reset: null
});

let unsubPrinterStatus = null;

const printerIconClass = computed(() => {
  const prints = printerStatus.value.total_prints;
  const thresh = printerStatus.value.threshold;
  const max = printerStatus.value.max_capacity;
  if (prints >= max) return "printer-danger pulsing-fast";
  if (prints >= thresh) return "printer-warning pulsing-slow";
  return "printer-success";
});

const printerStatusTooltip = computed(() => {
  const prints = printerStatus.value.total_prints;
  const max = printerStatus.value.max_capacity;
  const sisa = Math.max(0, max - prints);
  return `Status Kertas: ${prints}/${max} struk terpakai (Estimasi sisa: ~${sisa} struk). Klik untuk Detail/Reset.`;
});

function openPrinterModal() {
  Modal.getOrCreateInstance(document.getElementById("printerStatusModal")).show();
}

function initPrinterStatusSubscription() {
  if (unsubPrinterStatus) unsubPrinterStatus();
  unsubPrinterStatus = subscribePrinterStatus(activeFloor.value, (data) => {
    printerStatus.value = data;
  });
}

async function loadGeneralSettings() {
  try {
    const data = await fetchQueueGeneralSettings(activeFloor.value);
    hybridMode.value = data.hybridMode || false;
  } catch (error) {
    console.error("Gagal mengambil settings general:", error);
  }
}

const AUTO_RUN_STORAGE_KEY = computed(() => `closing_auto_run_slot_${activeFloor.value}`);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const POLL_MS = 60 * 1000;
const WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_REMINDER_WINDOW_MS = DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.reminderLimitWindowSeconds * 1000;
const DEFAULT_REMINDER_MAX_CLICKS = DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.reminderLimitMaxCalls;

const activeRoster = ref(null);
let unsubActiveRoster = null;
const { todayStringWITA, nowWITA } = useWITA();

// Roster states
const attendanceList = ref([]);
const selectedSalesNames = ref([]);
const rosterHistory = ref({});
const quotaSettings = ref({ morningJualQuota: 2, afternoonJualQuota: 3 });
const loadingRosterModal = ref(false);
const allFloorsRosterData = ref({});
let unsubDailyRoster = null;
const searchQuery = ref("");
function copyExplanationText() {
  const text = "Pemisahan antrean ini kami terapkan agar Kakak yang ingin membeli perhiasan bisa langsung dilayani oleh tim sales khusus tanpa perlu menunggu antrean panjang transaksi penjualan emas yang membutuhkan proses administrasi lebih detail. Mohon ditunggu ya Kak, Terima kasih.";
  navigator.clipboard.writeText(text);
  Swal.fire({
    icon: "success",
    title: "Teks Disalin",
    text: "Teks penjelasan berhasil disalin ke clipboard!",
    timer: 1500,
    showConfirmButton: false
  });
}

const filteredAttendanceList = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return attendanceList.value;
  return attendanceList.value.filter(att => 
    att.name.toLowerCase().includes(query)
  );
});

// State
const state = ref({
  jual: { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] },
  beli: { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] }
});

const modalQueueType = ref("jual"); // 'jual' or 'beli' for active modal

// Modal form state
const customLetter = ref(0);
const customNumber = ref(1);
const skipNumber = ref(1);
const moveToMissedSelected = ref("");
const missedHandleSelected = ref("");
const reminderClickTimestamps = ref([]);

// Circular queue emptiness checks
const isBeliEmpty = computed(() => {
  const q = state.value.beli;
  if (q.lastNumber === 0) return true;
  const currentIdx = q.currentLetter * 50 + q.currentNumber;
  const lastIdx = q.lastLetter * 50 + q.lastNumber;
  const nextAfterLast = (lastIdx % 150) + 1;
  return currentIdx === nextAfterLast;
});

const isJualEmpty = computed(() => {
  const q = state.value.jual;
  if (q.lastNumber === 0) return true;
  const currentIdx = ((q.currentLetter ?? 0) % 1) * 50 + q.currentNumber;
  const lastIdx = ((q.lastLetter ?? 0) % 1) * 50 + q.lastNumber;
  const nextAfterLast = (lastIdx % 50) + 1;
  return currentIdx === nextAfterLast;
});

// Circular unserved count (circular buffer calculation)
const unservedBeliCount = computed(() => {
  if (isBeliEmpty.value) return 0;
  const q = state.value.beli;
  const currentIdx = q.currentLetter * 50 + q.currentNumber;
  const lastIdx = q.lastLetter * 50 + q.lastNumber;
  let diff = lastIdx - currentIdx;
  if (diff < 0) diff += 150; // loop size is 3 letters * 50 = 150
  return diff + 1;
});

const unservedJualCount = computed(() => {
  if (isJualEmpty.value) return 0;
  const q = state.value.jual;
  const currentIdx = ((q.currentLetter ?? 0) % 1) * 50 + q.currentNumber;
  const lastIdx = ((q.lastLetter ?? 0) % 1) * 50 + q.lastNumber;
  let diff = lastIdx - currentIdx;
  if (diff < 0) diff += 50; // loop size is 1 letter * 50 = 50
  return diff + 1;
});

// Display helpers for Beli
const beliCurrentQueueStr = computed(() => {
  if (!hybridMode.value && isBeliEmpty.value) {
    if (state.value.beli.lastNumber === 0) return "A01";
    return "-";
  }
  const q = state.value.beli;
  const letters = ["A", "B", "C"];
  return formatQueue(letters[q.currentLetter] || "A", q.currentNumber);
});

const beliDelayedDisplay = computed(() => {
  const q = state.value.beli.delayedQueue;
  if (!q.length) return "-";
  const MAX = 2;
  const visible = q.slice(0, MAX).join(", ");
  return q.length > MAX ? `${visible}, ...` : visible;
});

const beliMissedDisplay = computed(() => {
  const q = state.value.beli.missedQueue;
  if (!q.length) return "-";
  const MAX = 2;
  const visible = q.slice(0, MAX).join(", ");
  return q.length > MAX ? `${visible}, ...` : visible;
});

const beliSkipDisplay = computed(() => (state.value.beli.skipList.length ? state.value.beli.skipList.join(", ") : "-"));

// Display helpers for Jual
const jualCurrentQueueStr = computed(() => {
  if (!hybridMode.value && isJualEmpty.value) {
    if (state.value.jual.lastNumber === 0) return "E01";
    return "-";
  }
  const q = state.value.jual;
  const letters = ["E"];
  return formatQueue(letters[(q.currentLetter ?? 0) % letters.length] || "E", q.currentNumber);
});

const jualDelayedDisplay = computed(() => {
  const q = state.value.jual.delayedQueue;
  if (!q.length) return "-";
  const MAX = 2;
  const visible = q.slice(0, MAX).join(", ");
  return q.length > MAX ? `${visible}, ...` : visible;
});

const jualMissedDisplay = computed(() => {
  const q = state.value.jual.missedQueue;
  if (!q.length) return "-";
  const MAX = 2;
  const visible = q.slice(0, MAX).join(", ");
  return q.length > MAX ? `${visible}, ...` : visible;
});

const jualSkipDisplay = computed(() => (state.value.jual.skipList.length ? state.value.jual.skipList.join(", ") : "-"));

let unsubQueue = null;
let unsubConn = null;
let unsubClosingSettings = null;
let closingPollIntervalId = null;
let unlockAudioHandler = null;
let schedulerActive = false;
const closingTimeoutIds = new Set();

let unsubRosterHistoryModal = null;

function modal(id) {
  return Modal.getOrCreateInstance(document.getElementById(id));
}

async function openRosterModal() {
  modal("rosterModal").show();
  loadingRosterModal.value = true;
  try {
    const today = todayStringWITA();
    const currentShift = getCurrentShift();
    const floorId = activeFloor.value;

    searchQuery.value = ""; // Reset search query on open

    // Real-time Firestore subscription while modal is open
    if (unsubRosterHistoryModal) unsubRosterHistoryModal();
    unsubRosterHistoryModal = subscribeRosterHistory(floorId, (historyData) => {
      rosterHistory.value = historyData;
    });

    // Fetch master attendance from L1
    const attData = await fetchAttendanceByRange(today, today, currentShift, "", "L1");
    attendanceList.value = attData;

    // Fetch quota
    quotaSettings.value = await fetchQueueQuotaSettings(floorId);

    // Initialize selected checklist from RTB data if exists, otherwise empty
    const currentRoster = allFloorsRosterData.value[floorId];
    if (currentRoster && currentRoster.activeSales) {
      selectedSalesNames.value = [...currentRoster.activeSales];
    } else {
      selectedSalesNames.value = [];
    }
  } catch (err) {
    console.error("Error opening roster modal", err);
    Swal.fire({
      icon: "error",
      title: "Gagal memuat data",
      text: "Terjadi kesalahan saat mengambil daftar absensi staff."
    });
  } finally {
    loadingRosterModal.value = false;
  }
}

function makeSlotKey(dateObj, hour, minute) {
  const d = dateObj || new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${day}|${hm}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildClosingSlotsFromSettings() {
  const enabled = closingSettings.value?.enabled !== false;
  if (!enabled) return [];

  const timeRaw = String(closingSettings.value?.time || DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.time);
  const [hourStr = "20", minuteStr = "55"] = timeRaw.split(":");
  const h = Math.max(0, Math.min(23, Number(hourStr) || 20));
  const m = Math.max(0, Math.min(59, Number(minuteStr) || 55));
  const repeat = Math.max(1, Math.min(5, Number(closingSettings.value?.repeat) || 1));

  return [{ h, m, repeat }];
}

function getClosingMessage() {
  const text = String(closingSettings.value?.message || "").trim();
  return text || DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.message;
}

function getReminderLimitConfig() {
  const maxCalls = Math.max(
    1,
    Math.min(20, Number(closingSettings.value?.reminderLimitMaxCalls) || DEFAULT_REMINDER_MAX_CLICKS),
  );
  const windowSeconds = Math.max(
    10,
    Math.min(3600, Number(closingSettings.value?.reminderLimitWindowSeconds) || DEFAULT_REMINDER_WINDOW_MS / 1000),
  );
  return { maxCalls, windowSeconds, windowMs: windowSeconds * 1000 };
}

function restartClosingScheduler() {
  stopClosingScheduler();
  startClosingScheduler();
}

async function initClosingSettings() {
  const floorId = activeFloor.value;
  try {
    await ensureClosingAnnouncementSettings(floorId);
    closingSettings.value = await fetchClosingAnnouncementSettings(floorId);
  } catch (error) {
    console.error("Failed to fetch closing announcement settings", error);
  }

  restartClosingScheduler();
  if (unsubClosingSettings) unsubClosingSettings();
  unsubClosingSettings = subscribeClosingAnnouncementSettings((data) => {
    closingSettings.value = data;
    restartClosingScheduler();
  }, floorId);
}

async function triggerAutoForSlot(targetHour, targetMinute, repeatCount = 1) {
  const slotKey = makeSlotKey(new Date(), targetHour, targetMinute);
  if (lastAutoRunSlot.value === slotKey) return;

  try {
    if (localStorage.getItem(AUTO_RUN_STORAGE_KEY.value) === slotKey) {
      lastAutoRunSlot.value = slotKey;
      return;
    }
    localStorage.setItem(AUTO_RUN_STORAGE_KEY.value, slotKey);
  } catch (_) {
    // Ignore localStorage errors
  }

  lastAutoRunSlot.value = slotKey;
  for (let i = 0; i < repeatCount; i++) {
    await playClosingAnnouncement(getClosingMessage());
    if (i < repeatCount - 1) {
      await sleep(1000);
    }
  }
}

function computeNextDelayFor(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  let delay = target.getTime() - now.getTime();
  if (delay < 0) delay += ONE_DAY_MS;
  return delay;
}

function scheduleSlot(hour, minute, repeat = 1) {
  const delay = computeNextDelayFor(hour, minute);
  const timeoutId = setTimeout(async () => {
    closingTimeoutIds.delete(timeoutId);
    if (!schedulerActive) return;
    await triggerAutoForSlot(hour, minute, repeat);
    if (schedulerActive) {
      scheduleSlot(hour, minute, repeat);
    }
  }, delay);
  closingTimeoutIds.add(timeoutId);
}

function startClosingScheduler() {
  schedulerActive = true;
  const slots = buildClosingSlotsFromSettings();
  slots.forEach(({ h, m, repeat = 1 }) => scheduleSlot(h, m, repeat));

  closingPollIntervalId = setInterval(async () => {
    if (!schedulerActive) return;
    const now = new Date();

    for (const { h, m, repeat = 1 } of slots) {
      const target = new Date();
      target.setHours(h, m, 0, 0);
      const diff = now.getTime() - target.getTime();
      if (diff >= 0 && diff < WINDOW_MS) {
        await triggerAutoForSlot(h, m, repeat);
      }
    }
  }, POLL_MS);
}

function stopClosingScheduler() {
  schedulerActive = false;
  if (closingPollIntervalId) {
    clearInterval(closingPollIntervalId);
    closingPollIntervalId = null;
  }
  closingTimeoutIds.forEach((id) => clearTimeout(id));
  closingTimeoutIds.clear();
}

function removeUnlockListeners() {
  if (!unlockAudioHandler) return;
  window.removeEventListener("click", unlockAudioHandler);
  window.removeEventListener("keydown", unlockAudioHandler);
  window.removeEventListener("touchstart", unlockAudioHandler);
  unlockAudioHandler = null;
}

function setupPrimeUnlockListeners() {
  unlockAudioHandler = () => {
    try {
      primeAudioPlayback();
    } catch (_) {
      // no-op
    }
    removeUnlockListeners();
  };

  window.addEventListener("click", unlockAudioHandler);
  window.addEventListener("keydown", unlockAudioHandler);
  window.addEventListener("touchstart", unlockAudioHandler);
}

function warnMissedFirst() {
  Swal.fire({
    icon: "warning",
    title: "Tidak Bisa Diproses",
    text: "Selesaikan antrian terlewat terlebih dahulu.",
    confirmButtonText: "Mengerti",
    confirmButtonColor: "#f44336",
  });
}

// ── Operations ──────────────────────────────────────────────────

async function callCurrent(type) {
  const qState = state.value[type];
  if (qState.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  const curStr = type === "jual" ? jualCurrentQueueStr.value : beliCurrentQueueStr.value;
  if (curStr === "-") {
    Swal.fire({
      icon: "info",
      title: "Antrian Kosong",
      text: "Panggil antrian berikutnya terlebih dahulu.",
      confirmButtonText: "Mengerti"
    });
    return;
  }
  if (isAudioBusy()) return;
  primeAudioPlayback();
  audioActiveBtn.value = type === "jual" ? "callCurrentJual" : "callCurrentBeli";
  await playQueueAnnouncement(curStr);
  audioActiveBtn.value = "";
}

function openServeConfirm(type) {
  const qState = state.value[type];
  if (qState.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  modalQueueType.value = type;
  modal("confirmModal").show();
}

async function confirmServed() {
  busy.value = true;
  modal("confirmModal").hide();
  try {
    const type = modalQueueType.value;
    const unservedCount = type === "jual" ? unservedJualCount.value : unservedBeliCount.value;
    if (!hybridMode.value && unservedCount === 0) {
      busy.value = false;
      return;
    }

    const qState = state.value[type];
    const curStr = type === "jual" ? jualCurrentQueueStr.value : beliCurrentQueueStr.value;
    
    if (curStr !== "-") {
      await writeAnalyticsEntry({ queueNumber: curStr, status: "served", floorId: activeFloor.value });
    }
    
    const letters = type === "jual" ? ["E"] : ["A", "B", "C"];
    const currentIdx = ((qState.currentLetter ?? 0) % letters.length) * 50 + qState.currentNumber;
    const lastIdx = ((qState.lastLetter ?? 0) % letters.length) * 50 + qState.lastNumber;
    
    if (currentIdx !== lastIdx) {
      const s = await nextQueue(type, state.value, activeFloor.value);
      state.value = s;
    } else {
      if (hybridMode.value) {
        const s = await nextQueueHybrid(type, state.value, activeFloor.value);
        state.value = s;
      } else {
        const nextLet = qState.lastLetter;
        const nextNum = qState.lastNumber + 1;
        const s = await setCustomQueue(type, state.value, nextLet, nextNum, activeFloor.value);
        state.value = s;
        Swal.fire({
          icon: "success",
          title: "Selesai",
          text: `Semua antrian ${type === "jual" ? "Jual" : "Beli"} hari ini telah selesai dilayani.`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

function openSkip(type) {
  modalQueueType.value = type;
  customLetter.value = 0;
  skipNumber.value = 1;
  modal("skipQueueModal").show();
}

async function confirmSkip() {
  busy.value = true;
  modal("skipQueueModal").hide();
  try {
    const type = modalQueueType.value;
    const letters = type === "jual" ? ["E"] : ["A", "B", "C"];
    const qNum = letters[customLetter.value % letters.length] + padNumber(skipNumber.value);
    state.value = await addToSkipList(type, state.value, qNum, activeFloor.value);
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

function openDelay(type) {
  const qState = state.value[type];
  if (qState.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  modalQueueType.value = type;
  modal("confirmDelayModal").show();
}

async function confirmDelay() {
  busy.value = true;
  modal("confirmDelayModal").hide();
  try {
    const type = modalQueueType.value;
    const qState = state.value[type];
    const curStr = type === "jual" ? jualCurrentQueueStr.value : beliCurrentQueueStr.value;
    
    let s = await addToDelayedQueue(type, state.value, curStr, activeFloor.value);
    
    const letters = type === "jual" ? ["E"] : ["A", "B", "C"];
    const currentIdx = ((qState.currentLetter ?? 0) % letters.length) * 50 + qState.currentNumber;
    const lastIdx = ((qState.lastLetter ?? 0) % letters.length) * 50 + qState.lastNumber;
    
    if (currentIdx !== lastIdx) {
      s = await nextQueue(type, s, activeFloor.value);
      state.value = s;
    } else {
      const nextLet = qState.lastLetter;
      const nextNum = qState.lastNumber + 1;
      s = await setCustomQueue(type, s, nextLet, nextNum, activeFloor.value);
      state.value = s;
    }
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

function openCustom(type) {
  const qState = state.value[type];
  if (qState.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  modalQueueType.value = type;
  customLetter.value = qState.currentLetter;
  customNumber.value = qState.currentNumber;
  modal("customQueueModal").show();
}

async function confirmCustom() {
  busy.value = true;
  modal("customQueueModal").hide();
  try {
    const type = modalQueueType.value;
    state.value = await setCustomQueue(type, state.value, customLetter.value, customNumber.value, activeFloor.value);
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

function openReset() {
  modal("resetModal").show();
}

async function confirmReset() {
  busy.value = true;
  modal("resetModal").hide();
  try {
    await resetQueue(activeFloor.value);
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

// ── Card 1: Antrian Tertunda ─────────────────────────────────────────────────
function openMoveToMissed(type) {
  const q = state.value[type].delayedQueue;
  if (!q.length) return;
  modalQueueType.value = type;
  moveToMissedSelected.value = q[0];
  modal("moveToMissedModal").show();
}

async function confirmMoveToMissed() {
  const q = moveToMissedSelected.value;
  if (!q) return;
  busy.value = true;
  modal("moveToMissedModal").hide();
  try {
    const type = modalQueueType.value;
    state.value = await moveToMissed(type, state.value, q, activeFloor.value);
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

// ── Card 2: Antrian Terlewat ──────────────────────────────────────────────────
async function callMissedFirst(type) {
  const q = state.value[type].missedQueue;
  if (!q.length) return;
  if (isAudioBusy()) return;
  primeAudioPlayback();
  audioActiveBtn.value = type === "jual" ? "callMissedJual" : "callMissedBeli";
  await playQueueAnnouncement(q[0]);
  audioActiveBtn.value = "";
}

function openMissedHandle(type) {
  const q = state.value[type].missedQueue;
  if (!q.length) return;
  modalQueueType.value = type;
  missedHandleSelected.value = q[0];
  modal("missedHandleModal").show();
}

async function confirmMissedHandle() {
  const q = missedHandleSelected.value;
  if (!q) return;
  busy.value = true;
  modal("missedHandleModal").hide();
  try {
    const type = modalQueueType.value;
    state.value = await removeFromMissed(type, state.value, q, activeFloor.value);
    await writeAnalyticsEntry({ queueNumber: q, status: "served", floorId: activeFloor.value });
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

// ── Announcement buttons ──────────────────────────────────────────────────────
async function announceWait() {
  if (isAudioBusy()) return;
  primeAudioPlayback();
  audioActiveBtn.value = "announceWait";
  await playWaitMessageSequence();
  audioActiveBtn.value = "";
}

function getReminderTimestampsWithinWindow(now = Date.now(), windowMs = DEFAULT_REMINDER_WINDOW_MS) {
  const minTime = now - windowMs;
  return reminderClickTimestamps.value.filter((ts) => ts > minTime);
}

async function handleReminderRateLimit() {
  const limitEnabled = closingSettings.value?.reminderLimitEnabled !== false;
  if (!limitEnabled) return true;

  const { maxCalls, windowSeconds, windowMs } = getReminderLimitConfig();
  const now = Date.now();
  const recent = getReminderTimestampsWithinWindow(now, windowMs);
  if (recent.length >= maxCalls) {
    reminderClickTimestamps.value = recent;
    const oldest = Math.min(...recent);
    const waitSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    await Swal.fire({
      icon: "warning",
      title: "Batas Pengingat Tercapai",
      text: `Dalam ${windowSeconds} detik maksimal hanya ${maxCalls} kali klik tombol Pengingat Antrian. Coba lagi dalam ${waitSeconds} detik.`,
      confirmButtonText: "Mengerti",
      confirmButtonColor: "#f59e0b",
    });
    return false;
  }

  reminderClickTimestamps.value = [...recent, now];
  return true;
}

async function announceReminder() {
  if (isAudioBusy()) return;
  const allowed = await handleReminderRateLimit();
  if (!allowed) return;
  primeAudioPlayback();
  audioActiveBtn.value = "announceReminder";
  await playTakeQueueMessage();
  audioActiveBtn.value = "";
}

async function announceClosingNow() {
  if (isAudioBusy()) return;
  try {
    primeAudioPlayback();
    audioActiveBtn.value = "announceClosing";
    await playClosingAnnouncement(getClosingMessage());
  } finally {
    audioActiveBtn.value = "";
  }
}

function getCurrentShift() {
  const hour = nowWITA().getHours();
  return hour < 14 ? "morning" : "afternoon";
}

function isNameLocked(name) {
  const otherFloorId = activeFloor.value === "L1" ? "L2" : "L1";
  const otherFloorRoster = allFloorsRosterData.value[otherFloorId];
  if (otherFloorRoster && otherFloorRoster.activeSales) {
    return otherFloorRoster.activeSales.includes(name);
  }
  return false;
}

const previewRotation = computed(() => {
  const today = todayStringWITA();
  const currentShift = getCurrentShift();
  const floorId = activeFloor.value;
  const history = rosterHistory.value || {};
  const todayRecord = history[today];

  // 1. Direct real-time read from Firestore rosterHistory for today's shift if present
  if (todayRecord && Array.isArray(todayRecord[currentShift]) && todayRecord[currentShift].length > 0) {
    const savedJual = todayRecord[currentShift];
    const savedJualNorm = savedJual.map(n => String(n).trim().toLowerCase());
    const beliStaff = selectedSalesNames.value.filter(
      name => !savedJualNorm.includes(String(name).trim().toLowerCase())
    );
    return {
      jual: savedJual,
      beli: beliStaff
    };
  }

  // 2. Fallback to calculateAutoRotation
  const quota = currentShift === "morning"
    ? quotaSettings.value.morningJualQuota || 2
    : quotaSettings.value.afternoonJualQuota || 3;

  return calculateAutoRotation(
    selectedSalesNames.value,
    rosterHistory.value,
    floorId,
    currentShift,
    quota
  );
});

function resetRosterChecklist() {
  selectedSalesNames.value = [];
}

async function saveRosterSelection() {
  busy.value = true;
  try {
    const today = todayStringWITA();
    const currentShift = getCurrentShift();
    const floorId = activeFloor.value;

    const jualList = previewRotation.value.jual;
    const beliList = previewRotation.value.beli;

    // Save to RTB
    await saveActiveRosterToRTB(
      today,
      currentShift,
      floorId,
      selectedSalesNames.value,
      jualList,
      beliList
    );

    // Save history to Firestore (fetch latest to prevent parallel overwrite, store shift object per date)
    const history = await fetchRosterHistory(floorId);
    let dateRecord = history[today];
    if (!dateRecord || Array.isArray(dateRecord)) {
      const legacyArr = Array.isArray(dateRecord) ? dateRecord : [];
      dateRecord = legacyArr.length > 0 ? { legacy: legacyArr } : {};
    }

    dateRecord[currentShift] = jualList;
    dateRecord.lastUpdated = new Date().toISOString();
    history[today] = dateRecord;

    // Retain last 30 date keys
    const historyKeys = Object.keys(history).sort();
    while (historyKeys.length > 30) {
      const oldest = historyKeys.shift();
      delete history[oldest];
    }

    await saveRosterHistory(floorId, history);
    rosterHistory.value = history;

    modal("rosterModal").hide();

    await Swal.fire({
      icon: "success",
      title: "Berhasil Diterapkan",
      text: "Pembagian pelayanan sales telah diperbarui.",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Failed to save roster selection", err);
    Swal.fire({
      icon: "error",
      title: "Gagal menerapkan",
      text: "Terjadi kesalahan saat menyimpan pembagian pelayanan.",
    });
  } finally {
    busy.value = false;
  }
}

async function autoInitRosterIfEmpty() {
  const today = todayStringWITA();
  const currentShift = getCurrentShift();
  const floorId = activeFloor.value;

  try {
    // Fetch directly from RTB to be absolutely sure of latest state
    const snap = await get(dbRef(rtdb, `queue/daily_roster/${today}/${currentShift}`));
    const dailyRosterVal = snap.val() || {};
    const currentRoster = dailyRosterVal[floorId];
    if (currentRoster) {
      // Already initialized
      return;
    }

    // Save empty rosters to RTB to mark as initialized (default nothing checked)
    await saveActiveRosterToRTB(
      today,
      currentShift,
      floorId,
      [],
      [],
      []
    );

  } catch (error) {
    console.error("Failed to auto-init roster", error);
  }
}

function initDailyRosterSubscription() {
  if (unsubDailyRoster) unsubDailyRoster();
  const today = todayStringWITA();
  const currentShift = getCurrentShift();
  unsubDailyRoster = subscribeDailyRoster(today, currentShift, (data) => {
    allFloorsRosterData.value = data || {};
  });
}

function initActiveRoster() {
  if (unsubActiveRoster) unsubActiveRoster();
  const today = todayStringWITA();
  const currentShift = getCurrentShift();
  const floorId = activeFloor.value;

  unsubActiveRoster = subscribeActiveRoster(today, currentShift, floorId, async (roster) => {
    if (roster && roster.jual && roster.jual.length > 0) {
      activeRoster.value = {
        date: today,
        shift: currentShift,
        activeSales: roster.activeSales || [],
        jual: roster.jual || [],
        beli: roster.beli || []
      };
    } else {
      activeRoster.value = {
        date: today,
        shift: currentShift,
        activeSales: [],
        jual: [],
        beli: []
      };
      // RTB is empty for this floor today/shift, let's auto init
      await autoInitRosterIfEmpty();
    }
  });
}

watch(activeFloor, async (newFloor) => {
  if (unsubQueue) unsubQueue();
  unsubQueue = subscribeQueue(newFloor, (s) => {
    state.value = s;
  });
  await loadGeneralSettings();
  initDailyRosterSubscription();
  initActiveRoster();
  initClosingSettings();
  // initPrinterStatusSubscription(); // Disabled in Path 1
});

onMounted(async () => {
  unsubQueue = subscribeQueue(activeFloor.value, (s) => {
    state.value = s;
  });
  unsubConn = subscribeConnection((v) => {
    connected.value = v;
  });
  await loadGeneralSettings();
  initClosingSettings();
  setupPrimeUnlockListeners();
  initDailyRosterSubscription();
  initActiveRoster();
  // initPrinterStatusSubscription(); // Disabled in Path 1

  const rosterModalEl = document.getElementById("rosterModal");
  if (rosterModalEl) {
    rosterModalEl.addEventListener("hidden.bs.modal", () => {
      if (unsubRosterHistoryModal) {
        unsubRosterHistoryModal();
        unsubRosterHistoryModal = null;
      }
    });
  }
});

onUnmounted(() => {
  unsubQueue?.();
  unsubConn?.();
  unsubClosingSettings?.();
  unsubActiveRoster?.();
  unsubDailyRoster?.();
  unsubPrinterStatus?.();
  unsubRosterHistoryModal?.();
  stopClosingScheduler();
  removeUnlockListeners();
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap");

.admin-page {
  font-family: "Poppins", sans-serif;
  background-color: #f8f9fa;
}

/* Category Title with Playfair Display */
.category-title {
  font-family: "Playfair Display", serif;
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: 0.5px;
  position: relative;
  padding-bottom: 0.75rem;
}

.category-title::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 25%;
  right: 25%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #dee2e6, transparent);
}

.category-title.text-primary::after {
  background: linear-gradient(90deg, transparent, #0284c7, transparent);
}

.category-title.text-warning::after {
  background: linear-gradient(90deg, transparent, #d97706, transparent);
}

/* Modernized Summary Card */
.summary-card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.summary-card-beli {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-left: 5px solid #0284c7;
}

.summary-card-jual {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 5px solid #d97706;
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #4b5563;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-family: "Playfair Display", serif;
  font-size: 2.2rem;
  font-weight: 800;
  color: #1f2937;
  line-height: 1.2;
}

.summary-unit {
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  font-family: "Poppins", sans-serif;
}

/* Queue Cards */
.queue-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  height: auto; /* Fits dynamically to buttons and contents */
}

.queue-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.queue-card .card-header {
  background: linear-gradient(
    135deg,
    var(--theme-antrian-card-header-start) 0%,
    var(--theme-antrian-card-header-end) 100%
  );
  color: white;
  font-weight: 600;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  border-bottom: none;
}

/* Card 2 overrides gradient with Bootstrap bg-danger */
.queue-card .card-header.bg-danger {
  background: #dc3545 !important;
}

/* Big number / list display */
.queue-display {
  font-weight: 700;
  color: #4361ee;
  text-align: center;
  background-color: rgba(67, 97, 238, 0.05);
  border-radius: 8px;
  word-break: break-all;
  padding: 0.75rem;
  font-family: "Poppins", sans-serif;
}

/* Enlarge current serving queue number to be extremely visible */
.queue-display.current-number {
  font-family: "Playfair Display", serif;
  font-size: 3.5rem !important; /* Premium large visible font */
  font-weight: 800;
  color: #1e3a8a;
  background-color: #f1f5f9;
  border: 2px dashed #cbd5e1;
  padding: 1rem 0.5rem;
  line-height: 1.1;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
}

/* List and skip display styling */
.queue-display.list-display {
  font-size: 1.15rem;
  font-weight: 600;
  color: #475569;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}

/* Action button column */
.action-buttons {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
}

.action-buttons .btn {
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.action-buttons .btn:hover {
  transform: translateY(-1px);
}

/* Announcement buttons */
.announcement-btn {
  width: 100%;
  padding: 0.6rem;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 8px;
}

/* Block other audio buttons without visual change */
.audio-blocked {
  pointer-events: none;
}

/* Audio playing state */
.audio-active {
  position: relative;
  pointer-events: none;
  opacity: 0.8;
  background-color: #a80101 !important;
  border-color: #a80101 !important;
}

.audio-active::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
  from {
    background-position: 1rem 0;
  }
  to {
    background-position: 0 0;
  }
}

/* Printer Status Indicator Styles */
.printer-status-indicator {
  transition: all 0.3s ease;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.printer-success {
  background-color: #198754; /* Green */
}
.printer-warning {
  background-color: #ffc107; /* Yellow */
  color: #212529 !important;
}
.printer-danger {
  background-color: #dc3545; /* Red */
}
.cursor-pointer {
  cursor: pointer;
}
.pulsing-slow {
  animation: pulse-slow-anim 2s infinite;
}
.pulsing-fast {
  animation: pulse-fast-anim 1s infinite;
}

@keyframes pulse-slow-anim {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(255, 193, 7, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
}
@keyframes pulse-fast-anim {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
}

/* Custom Printer Alert styling */
.alert-danger-custom {
  background: rgba(254, 242, 242, 0.95);
  backdrop-filter: blur(10px);
  border-left: 5px solid #dc2626 !important;
  color: #991b1b;
}
.alert-warning-custom {
  background: rgba(255, 251, 235, 0.95);
  backdrop-filter: blur(10px);
  border-left: 5px solid #d97706 !important;
  color: #92400e;
}
.alert-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 45px;
  border-radius: 10px;
  flex-shrink: 0;
}
</style>
