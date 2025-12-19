import {
  getServisByMonth,
  deleteMultipleServisData,
  subscribeToMonthUpdates,
  unsubscribeFromUpdates,
} from '../services/servis-service.js'
import { deleteMultipleBuktiPengambilan } from '../services/storage-service.js'

// Global variables
let currentServisData = []
let filteredServisData = []
let isReportDataLoaded = false
let currentMonth = null
let currentYear = null
let expandCache = new Map() // Cache untuk expanded data
const test = 'smlt116'

// Helper function untuk menentukan jenis data
function determineJenisData(item) {
  if (item.jenisInput) return item.jenisInput
  return item.detailBarangCustom &&
    Array.isArray(item.detailBarangCustom) &&
    item.detailBarangCustom.length > 0
    ? 'custom'
    : 'servis'
}

// Expand servis data dengan memoization
function expandServisData(data, jenisData) {
  const cacheKey = `${jenisData}_${data.length}`
  if (expandCache.has(cacheKey)) {
    return expandCache.get(cacheKey)
  }

  const expanded = []
  if (jenisData === 'servis') {
    expanded.push(...data)
  } else {
    for (const item of data) {
      if (item.detailBarangCustom?.length > 0) {
        for (let idx = 0; idx < item.detailBarangCustom.length; idx++) {
          const detail = item.detailBarangCustom[idx]
          expanded.push({
            ...item,
            namaBarang: detail.namaBarang,
            panjang: detail.panjang,
            warna: detail.warna,
            totalDp: detail.totalDp,
            ongkos: detail.ongkos,
            _originalId: item.id,
            _rowIndex: idx,
            _totalRows: item.detailBarangCustom.length,
            _jenisData: 'custom',
          })
        }
      } else {
        expanded.push(item)
      }
    }
  }

  expandCache.set(cacheKey, expanded)
  return expanded
}

// Update table headers based on jenis data
function updateTableHeaders(jenisData) {
  const thead = document.querySelector('#servisReportTable thead')

  let headers = `
    <tr>
      <th>No</th>
      <th>Tanggal</th>
      <th>Sales</th>
      <th>Nama Customer</th>
      <th>No HP</th>
      <th>Nama Barang</th>
  `

  if (jenisData === 'servis') {
    headers += `
      <th>Jenis Servis</th>
      <th>Ongkos</th>
    `
  } else {
    headers += `
      <th>Berat</th>
      <th>Panjang</th>
      <th>Kadar</th>
      <th>Warna</th>
      <th>Rincian Custom</th>
      <th>DP</th>
      <th>Ongkos</th>
    `
  }

  headers += `
      <th>Status Servis</th>
      <th>Status Pengambilan</th>
      <th>Handle Pengambilan</th>
      <th>Waktu Pengambilan</th>
      <th>Bukti Pengambilan</th>
    </tr>
  `

  thead.innerHTML = headers
}

// Helper function untuk format waktu pengambilan
function formatWaktuPengambilan(waktuPengambilan) {
  if (!waktuPengambilan) return '-'

  try {
    let waktuDate
    if (waktuPengambilan.toDate) {
      waktuDate = waktuPengambilan.toDate()
    } else if (waktuPengambilan.seconds) {
      waktuDate = new Date(waktuPengambilan.seconds * 1000)
    } else {
      waktuDate = new Date(waktuPengambilan)
    }

    if (!isNaN(waktuDate.getTime())) {
      return waktuDate.toLocaleString('id-ID')
    }
  } catch (error) {
    console.error('Error formatting waktu:', error)
  }
  return '-'
}

// DEPRECATED: Gunakan smartServisCache dari servis-service.js
// Smart cache system
const smartCache = {
  data: new Map(),
  timestamps: new Map(),
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

  get(key) {
    console.warn(
      '⚠️ Using deprecated smartCache. Switch to smartServisCache from servis-service.js'
    )
    const cached = this.data.get(key)
    const timestamp = this.timestamps.get(key)

    if (cached && timestamp && Date.now() - timestamp < this.CACHE_DURATION) {
      return cached
    }
    return null
  },

  set(key, value) {
    this.data.set(key, value)
    this.timestamps.set(key, Date.now())
  },

  updateSpecific(key, updatedItems) {
    const cached = this.data.get(key)
    if (cached) {
      // Update only changed items
      const updatedCache = cached.map((item) => {
        const updated = updatedItems.find((u) => u.id === item.id)
        return updated || item
      })
      this.set(key, updatedCache)
    }
  },

  removeItems(key, itemIds) {
    const cached = this.data.get(key)
    if (cached) {
      const filteredCache = cached.filter((item) => !itemIds.includes(item.id))
      this.set(key, filteredCache)
    }
  },

  clear() {
    this.data.clear()
    this.timestamps.clear()
  },
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
  initializePage()
  setupEventListeners()
})

function initializePage() {
  updateDateTime()
  setInterval(updateDateTime, 1000)
  populateYearSelector()

  const now = new Date()
  document.getElementById('monthSelector').value = now.getMonth() + 1
  document.getElementById('yearSelector').value = now.getFullYear()

  // Listen to broadcast events
  window.addEventListener('servisDataChanged', (e) => {
    const { action, data } = e.detail
    console.log(`📡 Received event: ${action}`, data)

    // Auto-refresh jika data berubah di bulan yang sama
    if (isReportDataLoaded && currentMonth && currentYear) {
      const now = new Date()
      if (currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear()) {
        console.log('♻️ Auto-refreshing current month data...')
        // Delay 500ms untuk memastikan Firestore sudah update
        setTimeout(() => generateReport(), 500)
      }
    }
  })
}

function updateDateTime() {
  const now = new Date()
  const dateElement = document.getElementById('current-date')
  const timeElement = document.getElementById('current-time')

  if (dateElement) {
    dateElement.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (timeElement) {
    timeElement.textContent = now.toLocaleTimeString('id-ID')
  }
}

function populateYearSelector() {
  const yearSelector = document.getElementById('yearSelector')
  const currentYear = new Date().getFullYear()

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const option = document.createElement('option')
    option.value = year
    option.textContent = year
    yearSelector.appendChild(option)
  }
}

function setupEventListeners() {
  // Generate report button
  document.getElementById('generateReportBtn')?.addEventListener('click', () => {
    generateReport()
    isReportDataLoaded = true
  })

  // Export buttons
  document.getElementById('exportExcelBtn')?.addEventListener('click', exportToExcel)
  document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPDF)

  // Delete data button - PERBAIKAN: langsung ke password verification
  document.getElementById('hapusData')?.addEventListener('click', showPasswordVerification)

  // Verify password button
  document.getElementById('verifyPasswordBtn')?.addEventListener('click', verifyPasswordAndDelete)

  // Enter key pada password input
  document.getElementById('verifyPassword')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      verifyPasswordAndDelete()
    }
  })

  // Reset password input saat modal ditutup
  document.getElementById('passwordVerifyModal')?.addEventListener('hidden.bs.modal', function () {
    document.getElementById('verifyPassword').value = ''
    document.getElementById('verifyPassword').classList.remove('is-invalid')
    document.getElementById('passwordError').textContent = ''
  })

  // Status filters
  const statusServisFilter = document.getElementById('statusServisFilter')
  const statusPengambilanFilter = document.getElementById('statusPengambilanFilter')

  if (statusServisFilter) {
    statusServisFilter.addEventListener('change', function () {
      if (isReportDataLoaded) {
        applyFilters()
      }
    })
  }

  if (statusPengambilanFilter) {
    statusPengambilanFilter.addEventListener('change', function () {
      if (isReportDataLoaded) {
        applyFilters()
      }
    })
  }

  // Jenis Data filter
  const jenisDataFilter = document.getElementById('jenisDataFilter')
  if (jenisDataFilter) {
    jenisDataFilter.addEventListener('change', function () {
      if (isReportDataLoaded) {
        applyFilters()
      }
    })
  }

  // Month/Year selectors
  const monthSelector = document.getElementById('monthSelector')
  const yearSelector = document.getElementById('yearSelector')

  if (monthSelector) {
    monthSelector.addEventListener('change', function () {
      isReportDataLoaded = false
    })
  }

  if (yearSelector) {
    yearSelector.addEventListener('change', function () {
      isReportDataLoaded = false
    })
  }

  // Cleanup listener saat page unload
  window.addEventListener('beforeunload', () => {
    unsubscribeFromUpdates()
  })
}

function showPasswordVerification() {
  if (filteredServisData.length === 0) {
    showAlert('warning', 'Tidak ada data untuk dihapus')
    return
  }

  // Set jumlah data yang akan dihapus
  document.getElementById('deleteCount').textContent = filteredServisData.length

  // Tampilkan modal password
  const passwordModal = new bootstrap.Modal(document.getElementById('passwordVerifyModal'))
  passwordModal.show()

  // Focus ke input password
  setTimeout(() => {
    document.getElementById('verifyPassword').focus()
  }, 500)
}

function verifyPasswordAndDelete() {
  const passwordInput = document.getElementById('verifyPassword')
  const password = passwordInput.value
  const errorDiv = document.getElementById('passwordError')

  if (password === test) {
    // Password benar, tutup modal dan hapus data
    const passwordModal = bootstrap.Modal.getInstance(
      document.getElementById('passwordVerifyModal')
    )
    passwordModal.hide()

    // Langsung hapus data
    deleteDisplayedData()
  } else {
    // Password salah
    passwordInput.classList.add('is-invalid')
    errorDiv.textContent = 'Password salah!'
    passwordInput.focus()
  }
}

async function generateReport() {
  try {
    const month = parseInt(document.getElementById('monthSelector').value)
    const year = parseInt(document.getElementById('yearSelector').value)
    const startTime = performance.now()

    showLoadingState(true)

    // Unsubscribe listener lama jika ganti bulan
    if (currentMonth !== month || currentYear !== year) {
      unsubscribeFromUpdates()
      currentMonth = month
      currentYear = year
    }

    // Load data dari cache/Firestore
    console.log(`📊 Generating report for ${month}/${year}...`)
    currentServisData = await getServisByMonth(month, year)

    const loadTime = Math.round(performance.now() - startTime)
    console.log(`✓ Report loaded in ${loadTime}ms (${currentServisData.length} records)`)

    showCacheIndicator(loadTime < 200)
    applyFilters()
    showLoadingState(false)

    // Subscribe ke real-time updates hanya untuk bulan ini
    const now = new Date()
    if (month === now.getMonth() + 1 && year === now.getFullYear()) {
      subscribeToMonthUpdates(month, year, (updatedData) => {
        console.log('🔄 Real-time update received, refreshing UI...')
        currentServisData = updatedData
        applyFilters()
      })
    }
  } catch (error) {
    console.error('Error generating report:', error)
    showAlert('danger', 'Terjadi kesalahan saat memuat data: ' + error.message)
    showLoadingState(false)
  }
}

function applyFilters() {
  const startFilter = performance.now()
  const statusServis = document.getElementById('statusServisFilter').value
  const statusPengambilan = document.getElementById('statusPengambilanFilter').value
  const jenisData = document.getElementById('jenisDataFilter').value

  // Fast filter - status servis dan pengambilan sekarang wajib dipilih (tidak ada opsi "Semua")
  const statusFiltered = currentServisData.filter((item) => {
    return (
      item.statusServis === statusServis &&
      item.statusPengambilan === statusPengambilan &&
      determineJenisData(item) === jenisData
    )
  })

  // Clear cache jika filter berubah
  expandCache.clear()

  // Expand data
  filteredServisData = expandServisData(statusFiltered, jenisData)

  const filterTime = Math.round(performance.now() - startFilter)
  console.log(`⚡ Filter applied in ${filterTime}ms (${filteredServisData.length} rows)`)

  updateUI()
}

function updateUI() {
  // Show table immediately
  populateServisTable()

  if (filteredServisData.length > 0) {
    showReportElements()
    // Defer summary cards calculation
    requestIdleCallback(() => updateSummaryCards(), { timeout: 100 })
    // Update delete button state
    updateDeleteButtonState()
  } else {
    hideReportElements()
    document.getElementById('noDataMessage').style.display = 'block'
  }
}

// Update delete button state based on data status
function updateDeleteButtonState() {
  const deleteBtn = document.getElementById('hapusData')
  if (!deleteBtn) return

  // Check if all data has completed status
  const allCompleted = filteredServisData.every(
    (item) => item.statusServis === 'Sudah Selesai' && item.statusPengambilan === 'Sudah Diambil'
  )

  if (allCompleted) {
    deleteBtn.disabled = false
    deleteBtn.classList.remove('disabled')
    deleteBtn.title = 'Hapus data yang ditampilkan'
  } else {
    deleteBtn.disabled = true
    deleteBtn.classList.add('disabled')
    deleteBtn.title = 'Hapus data hanya tersedia jika semua data sudah selesai dan diambil'
  }
}

function updateSummaryCards() {
  document.getElementById('totalServis').textContent = filteredServisData.length

  const completedCount = filteredServisData.filter(
    (item) => item.statusServis === 'Sudah Selesai'
  ).length
  document.getElementById('completedServis').textContent = completedCount

  const pendingCount = filteredServisData.filter(
    (item) => item.statusServis === 'Belum Selesai'
  ).length
  document.getElementById('pendingServis').textContent = pendingCount

  const takenCount = filteredServisData.filter(
    (item) => item.statusPengambilan === 'Sudah Diambil'
  ).length
  document.getElementById('takenServis').textContent = takenCount

  // Hitung revenue sesuai jenis data
  const jenisData = document.getElementById('jenisDataFilter').value
  let totalRevenue = 0

  if (jenisData === 'servis') {
    totalRevenue = filteredServisData.reduce((sum, item) => sum + (item.ongkos || 0), 0)
  } else {
    totalRevenue = filteredServisData.reduce((sum, item) => {
      return sum + (item.totalDp || 0) + (item.ongkos || 0)
    }, 0)
  }

  document.getElementById('totalRevenue').textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`
}

function populateServisTable() {
  const jenisData = document.getElementById('jenisDataFilter').value
  updateTableHeaders(jenisData)

  const tableBody = document.getElementById('servisReportList')
  tableBody.innerHTML = ''

  if (filteredServisData.length === 0) return

  // Chunked rendering untuk performa
  const CHUNK_SIZE = 50
  let currentIndex = 0

  function renderChunk() {
    const fragment = document.createDocumentFragment()
    const end = Math.min(currentIndex + CHUNK_SIZE, filteredServisData.length)

    for (let i = currentIndex; i < end; i++) {
      const item = filteredServisData[i]
      const row = createTableRow(item, i, jenisData)
      fragment.appendChild(row)
    }

    tableBody.appendChild(fragment)
    currentIndex = end

    if (currentIndex < filteredServisData.length) {
      requestAnimationFrame(renderChunk)
    }
  }

  renderChunk()
}

function createTableRow(item, index, jenisData) {
  const row = document.createElement('tr')
  const tanggalFormatted = new Date(item.tanggal).toLocaleDateString('id-ID')

  const statusServisBadge =
    item.statusServis === 'Sudah Selesai'
      ? '<span class="badge bg-success">Sudah Selesai</span>'
      : '<span class="badge bg-warning">Belum Selesai</span>'

  const statusPengambilanBadge =
    item.statusPengambilan === 'Sudah Diambil'
      ? '<span class="badge bg-success">Sudah Diambil</span>'
      : '<span class="badge bg-danger">Belum Diambil</span>'

  let rowHTML = `
    <td>${index + 1}</td>
    <td>${tanggalFormatted}</td>
    <td>${item.sales || item.namaSales || '-'}</td>
    <td>${item.namaCustomer}</td>
    <td>${item.noHp}</td>
    <td>${item.namaBarang}</td>
  `

  if (jenisData === 'servis') {
    rowHTML += `
      <td>${item.jenisServis || item.rincianServis || '-'}</td>
      <td>Rp ${(item.ongkos || 0).toLocaleString('id-ID')}</td>
    `
  } else {
    rowHTML += `
      <td>${item.berat || '-'}</td>
      <td>${item.panjang || '-'}</td>
      <td>${item.kadar || '-'}</td>
      <td>${item.warna || '-'}</td>
      <td>${item.rincianServis || '-'}</td>
      <td>Rp ${(item.totalDp || 0).toLocaleString('id-ID')}</td>
      <td>Rp ${(item.ongkos || 0).toLocaleString('id-ID')}</td>
    `
  }

  rowHTML += `
    <td>${statusServisBadge}</td>
    <td>${statusPengambilanBadge}</td>
    <td>${item.stafHandle || '-'}</td>
    <td><small>${formatWaktuPengambilan(item.waktuPengambilan)}</small></td>
    <td style="text-align: center;">
      ${
        item.buktiPengambilanUrl
          ? `<button class="btn btn-sm btn-info" onclick="viewPhoto('${item.buktiPengambilanUrl}')" title="Lihat Foto">
          <i class="fas fa-image"></i>
        </button>`
          : '-'
      }
    </td>
  `

  row.innerHTML = rowHTML
  return row
}

async function deleteDisplayedData() {
  const confirmBtn = document.getElementById('verifyPasswordBtn')
  const originalText = confirmBtn.innerHTML

  try {
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Menghapus...'
    confirmBtn.disabled = true

    const idsToDelete = filteredServisData.map((item) => item.id)

    // Collect storage paths for photo deletion
    const storagePaths = filteredServisData.map((item) => item.buktiPengambilanPath).filter(Boolean)

    // Delete photos from storage first
    if (storagePaths.length > 0) {
      console.log(`🗑️ Deleting ${storagePaths.length} photos from storage...`)
      const deleteResult = await deleteMultipleBuktiPengambilan(storagePaths)
      console.log(`✓ Photos deleted: ${deleteResult.success}, failed: ${deleteResult.failed}`)
    }

    // Delete from Firestore
    await deleteMultipleServisData(idsToDelete)

    // Update smart cache efficiently
    const month = parseInt(document.getElementById('monthSelector').value)
    const year = parseInt(document.getElementById('yearSelector').value)
    const cacheKey = `servis_${month}_${year}`
    smartCache.removeItems(cacheKey, idsToDelete)

    // Update current data
    currentServisData = currentServisData.filter((item) => !idsToDelete.includes(item.id))

    // Update UI immediately
    applyFilters()

    showAlert(
      'success',
      `Berhasil menghapus ${idsToDelete.length} data servis dan ${storagePaths.length} foto`
    )
  } catch (error) {
    console.error('Error deleting data:', error)
    showAlert('danger', 'Terjadi kesalahan saat menghapus data: ' + error.message)
  } finally {
    confirmBtn.innerHTML = originalText
    confirmBtn.disabled = false
  }
}

function showLoadingState(show) {
  const btn = document.getElementById('generateReportBtn')
  if (show) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Memuat...'
    btn.disabled = true
  } else {
    btn.innerHTML = '<i class="fas fa-sync-alt me-2"></i> Tampilkan'
    btn.disabled = false
  }
}

function showCacheIndicator(isCache) {
  const indicator = document.getElementById('cacheIndicator')
  if (indicator) {
    indicator.style.display = isCache ? 'inline-block' : 'none'
  }
}

function showReportElements() {
  document.getElementById('tableContainer').style.display = 'block'
  document.getElementById('summaryCards').style.display = 'flex'
  document.getElementById('actionButtons').style.display = 'flex'
  document.getElementById('noDataMessage').style.display = 'none'
}

function hideReportElements() {
  document.getElementById('tableContainer').style.display = 'none'
  document.getElementById('summaryCards').style.display = 'none'
  document.getElementById('actionButtons').style.display = 'none'
}

function showAlert(type, message, autoHide = true) {
  const alertContainer = document.getElementById('alertContainer')
  if (!alertContainer) return

  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      <i class="fas fa-${getAlertIcon(type)} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `

  alertContainer.style.display = 'block'

  if (autoHide) {
    setTimeout(() => {
      const alert = alertContainer.querySelector('.alert')
      if (alert) {
        const bsAlert = new bootstrap.Alert(alert)
        bsAlert.close()
      }
    }, 5000)
  }
}

function getAlertIcon(type) {
  const icons = {
    success: 'check-circle',
    danger: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle',
  }
  return icons[type] || 'info-circle'
}

async function exportToExcel() {
  if (filteredServisData.length === 0) {
    showAlert('warning', 'Tidak ada data untuk diekspor')
    return
  }

  const exportBtn = document.getElementById('exportExcelBtn')
  const originalText = exportBtn.innerHTML

  try {
    const month = document.getElementById('monthSelector').value
    const year = document.getElementById('yearSelector').value
    const monthNames = [
      '',
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ]

    const jenisData = document.getElementById('jenisDataFilter').value

    // Filter data yang punya foto
    const dataWithPhotos = filteredServisData.filter((item) => item.buktiPengambilanUrl)
    const hasPhotos = dataWithPhotos.length > 0

    // Dynamic headers
    let headers = ['No', 'Tanggal', 'Sales', 'Nama Customer', 'No HP', 'Nama Barang']
    if (jenisData === 'servis') {
      headers.push('Jenis Servis', 'Ongkos')
    } else {
      headers.push('Berat', 'Panjang', 'Kadar', 'Warna', 'Rincian', 'DP', 'Ongkos')
    }
    headers.push(
      'Status Servis',
      'Status Pengambilan',
      'Handle Pengambilan',
      'Waktu Pengambilan',
      'Nama File Foto'
    )

    const worksheetData = [
      [`Laporan ${jenisData === 'servis' ? 'Servis' : 'Custom'} - ${monthNames[month]} ${year}`],
      [],
      headers,
      ...filteredServisData.map((item, index) => {
        let waktuPengambilan = '-'
        if (item.waktuPengambilan) {
          try {
            let waktuDate
            if (item.waktuPengambilan.toDate) {
              waktuDate = item.waktuPengambilan.toDate()
            } else if (item.waktuPengambilan.seconds) {
              waktuDate = new Date(item.waktuPengambilan.seconds * 1000)
            } else {
              waktuDate = new Date(item.waktuPengambilan)
            }

            if (!isNaN(waktuDate.getTime())) {
              waktuPengambilan = waktuDate.toLocaleString('id-ID')
            }
          } catch (error) {
            waktuPengambilan = '-'
          }
        }

        let rowData = [
          index + 1,
          new Date(item.tanggal).toLocaleDateString('id-ID'),
          item.sales || item.namaSales || '-',
          item.namaCustomer,
          item.noHp,
          item.namaBarang,
        ]

        if (jenisData === 'servis') {
          rowData.push(item.jenisServis || item.rincianServis || '-', item.ongkos || 0)
        } else {
          rowData.push(
            item.berat || '-',
            item.panjang || '-',
            item.kadar || '-',
            item.warna || '-',
            item.rincianServis || '-',
            item.totalDp || 0,
            item.ongkos || 0
          )
        }

        // Generate filename custom: NamaCustomer_NoHP.ext
        let photoFileName = '-'
        if (item.buktiPengambilanUrl) {
          // Sanitize nama customer (hapus karakter ilegal untuk nama file)
          const sanitizedName = item.namaCustomer
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30) // Max 30 karakter

          // Ambil ekstensi dari URL asli
          const urlParts = item.buktiPengambilanUrl.split('/')
          const originalFileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0])
          const extension = originalFileName.substring(originalFileName.lastIndexOf('.')) || '.jpg'

          photoFileName = `${sanitizedName}_${item.noHp}${extension}`
        }

        rowData.push(
          item.statusServis,
          item.statusPengambilan,
          item.stafHandle || '-',
          waktuPengambilan,
          photoFileName
        )

        return rowData
      }),
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Servis')

    // Generate Excel as blob
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Membuat Excel...'
    exportBtn.disabled = true

    const excelBlob = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const excelFile = new Blob([excelBlob], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    if (!hasPhotos) {
      // Jika tidak ada foto, langsung download Excel saja
      saveAs(excelFile, `Laporan_Servis_${monthNames[month]}_${year}.xlsx`)
      showAlert('success', 'File Excel berhasil diunduh (tanpa foto)')
      return
    }

    // Download semua foto dan buat ZIP
    exportBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> Mengunduh foto... (0/${dataWithPhotos.length})`

    const zip = new JSZip()
    zip.file(`Laporan_Servis_${monthNames[month]}_${year}.xlsx`, excelFile)

    const photoFolder = zip.folder('bukti-pengambilan')
    let downloadedCount = 0
    let failedCount = 0

    // Download foto satu per satu dengan progress
    for (const item of dataWithPhotos) {
      try {
        const response = await fetch(item.buktiPengambilanUrl)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const photoBlob = await response.blob()

        // Generate filename custom: NamaCustomer_NoHP.ext
        const sanitizedName = item.namaCustomer
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 30) // Max 30 karakter

        // Ambil ekstensi dari URL asli
        const urlParts = item.buktiPengambilanUrl.split('/')
        const originalFileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0])
        const extension = originalFileName.substring(originalFileName.lastIndexOf('.')) || '.jpg'

        const fileName = `${sanitizedName}_${item.noHp}${extension}`

        photoFolder.file(fileName, photoBlob)
        downloadedCount++

        // Update progress
        exportBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> Mengunduh foto... (${downloadedCount}/${dataWithPhotos.length})`
      } catch (error) {
        console.error(`Failed to download photo: ${item.buktiPengambilanUrl}`, error)
        failedCount++
      }
    }

    // Generate ZIP
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Membuat file ZIP...'
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    // Download ZIP
    saveAs(zipBlob, `Laporan_Servis_${monthNames[month]}_${year}.zip`)

    // Show result
    let message = `File ZIP berhasil diunduh!<br>`
    message += `<small class="text-muted">📄 1 file Excel<br>`
    message += `📷 ${downloadedCount} foto berhasil diunduh`
    if (failedCount > 0) {
      message += `<br>⚠️ ${failedCount} foto gagal diunduh`
    }
    message += `</small>`

    showAlert(failedCount > 0 ? 'warning' : 'success', message)
  } catch (error) {
    console.error('Error exporting Excel:', error)
    showAlert('danger', 'Terjadi kesalahan saat mengekspor: ' + error.message)
  } finally {
    exportBtn.innerHTML = originalText
    exportBtn.disabled = false
  }
}

function exportToPDF() {
  if (filteredServisData.length === 0) {
    showAlert('warning', 'Tidak ada data untuk diekspor')
    return
  }

  try {
    const month = document.getElementById('monthSelector').value
    const year = document.getElementById('yearSelector').value
    const monthNames = [
      '',
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ]

    const jenisData = document.getElementById('jenisDataFilter').value

    // Dynamic headers
    let pdfHeaders = ['No', 'Tgl', 'Sales', 'Customer', 'HP', 'Barang']
    let widths = ['auto', 'auto', 'auto', '*', 'auto', '*']

    if (jenisData === 'servis') {
      pdfHeaders.push('Servis', 'Ongkos')
      widths.push('auto', 'auto')
    } else {
      pdfHeaders.push('Brt', 'Pjg', 'Kdr', 'Wrn', 'Rincian', 'DP', 'Ongkos')
      widths.push('auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto')
    }
    pdfHeaders.push('Status', 'Ambil', 'Handle', 'Waktu', 'Bukti')
    widths.push('auto', 'auto', 'auto', 'auto', 'auto')

    const docDefinition = {
      content: [
        {
          text: `Laporan ${jenisData === 'servis' ? 'Servis' : 'Custom'} Bulanan`,
          style: 'header',
          alignment: 'center',
        },
        {
          text: `${monthNames[month]} ${year}`,
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: widths,
            body: [
              pdfHeaders,
              ...filteredServisData.map((item, index) => {
                // TAMBAHAN: Format waktu pengambilan untuk PDF
                let waktuPengambilan = '-'
                if (item.waktuPengambilan) {
                  try {
                    let waktuDate
                    if (item.waktuPengambilan.toDate) {
                      waktuDate = item.waktuPengambilan.toDate()
                    } else if (item.waktuPengambilan.seconds) {
                      waktuDate = new Date(item.waktuPengambilan.seconds * 1000)
                    } else {
                      waktuDate = new Date(item.waktuPengambilan)
                    }

                    if (!isNaN(waktuDate.getTime())) {
                      waktuPengambilan =
                        waktuDate.toLocaleDateString('id-ID') +
                        ' ' +
                        waktuDate.toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                    }
                  } catch (error) {
                    waktuPengambilan = '-'
                  }
                }

                let rowData = [
                  index + 1,
                  new Date(item.tanggal).toLocaleDateString('id-ID'),
                  item.sales || item.namaSales || '-',
                  item.namaCustomer,
                  item.noHp,
                  item.namaBarang,
                ]

                if (jenisData === 'servis') {
                  rowData.push(
                    item.jenisServis || item.rincianServis || '-',
                    `Rp ${(item.ongkos || 0).toLocaleString('id-ID')}`
                  )
                } else {
                  rowData.push(
                    item.berat || '-',
                    item.panjang || '-',
                    item.kadar || '-',
                    item.warna || '-',
                    item.rincianServis || '-',
                    `Rp ${(item.totalDp || 0).toLocaleString('id-ID')}`,
                    `Rp ${(item.ongkos || 0).toLocaleString('id-ID')}`
                  )
                }

                // Tambah status dan bukti foto
                const buktiFoto = item.buktiPengambilanUrl ? 'Ada' : '-'
                rowData.push(
                  item.statusServis,
                  item.statusPengambilan,
                  item.stafHandle || '-',
                  waktuPengambilan,
                  buktiFoto
                )

                return rowData
              }),
            ],
          },
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
        subheader: {
          fontSize: 14,
          bold: true,
        },
      },
      pageOrientation: 'landscape',
    }

    pdfMake.createPdf(docDefinition).download(`Laporan_Servis_${monthNames[month]}_${year}.pdf`)

    showAlert('success', 'File PDF berhasil diunduh')
  } catch (error) {
    console.error('Error exporting PDF:', error)
    showAlert('danger', 'Terjadi kesalahan saat mengekspor PDF')
  }
}

// View photo in modal
window.viewPhoto = function (photoUrl) {
  const modalPhotoImg = document.getElementById('modalPhotoImg')
  if (modalPhotoImg) {
    modalPhotoImg.src = photoUrl
    const modal = new bootstrap.Modal(document.getElementById('viewPhotoModal'))
    modal.show()
  }
}
