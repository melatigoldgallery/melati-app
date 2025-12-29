import {
  getServisByMonth,
  updateServisStatus,
  smartServisCache,
  subscribeToMonthUpdates,
  unsubscribeFromUpdates,
  cancelOngoingFetch,
} from '../services/servis-service.js'
import {
  uploadBuktiPengambilan,
  validateImageFile,
  compressImage,
} from '../services/storage-service.js'

// Global variables
let currentData = []
let filteredData = []
let isDataLoaded = false
let lastDataCheck = 0
let cacheVersion = Date.now()
let isLoading = false // FASE 1: Track loading state
let activeRealtimeListener = null // FASE 2: Track real-time listener

// Pagination variables
let currentPage = 1
let itemsPerPage = 25
let totalPages = 1
let paginatedData = []

// TAMBAHAN: WhatsApp utility functions
const WhatsAppUtils = {
  // Format nomor HP ke format internasional
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null

    // Hapus semua karakter non-digit
    let cleaned = phoneNumber.toString().replace(/\D/g, '')

    // Konversi format Indonesia ke internasional
    if (cleaned.startsWith('08')) {
      cleaned = '628' + cleaned.substring(2)
    } else if (cleaned.startsWith('8') && cleaned.length >= 9) {
      cleaned = '628' + cleaned.substring(1)
    } else if (cleaned.startsWith('628')) {
      // Sudah format internasional
    } else if (cleaned.startsWith('62')) {
      // Sudah format internasional
    } else {
      // Format tidak dikenali, return null
      return null
    }

    // Validasi panjang nomor (minimal 10 digit setelah 62)
    if (cleaned.length < 12 || cleaned.length > 15) {
      return null
    }

    return cleaned
  },

  // Generate pesan WhatsApp
  generateMessage(customerName, itemName) {
    const shopName = 'Melati Gold Shop'
    return `Halo Kak ${customerName}, Barang servis Kakak sudah selesai:
(${itemName}) Sudah bisa diambil.
 Silakan datang ke ${shopName} untuk mengambil barangnya ya kak. Terima kasih 🙏`
  },

  // Buka WhatsApp
  openWhatsApp(phoneNumber, customerName, itemName) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber)

      if (!formattedPhone) {
        alert('Nomor HP tidak valid: ' + phoneNumber)
        return false
      }

      const message = this.generateMessage(customerName, itemName)
      const encodedMessage = encodeURIComponent(message)

      // SOLUSI SIMPEL: Gunakan whatsapp:// protocol untuk membuka app
      const whatsappAppURL = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`

      // Fallback ke web jika app tidak tersedia
      const whatsappWebURL = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`

      // Coba buka app dulu
      const tempLink = document.createElement('a')
      tempLink.href = whatsappAppURL
      tempLink.click()

      // Fallback ke web setelah 2 detik jika app tidak terbuka
      setTimeout(() => {
        window.open(whatsappWebURL, 'whatsapp_tab')
      }, 2000)

      console.log(`WhatsApp opened for ${customerName} (${formattedPhone})`)
      return true
    } catch (error) {
      console.error('Error opening WhatsApp:', error)
      alert('Terjadi kesalahan saat membuka WhatsApp')
      return false
    }
  },

  // Validasi apakah nomor HP valid
  isValidPhoneNumber(phoneNumber) {
    return this.formatPhoneNumber(phoneNumber) !== null
  },

  markAsContacted(customerId) {
    try {
      const contactedList = JSON.parse(localStorage.getItem('whatsapp_contacted') || '{}')

      contactedList[customerId] = {
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        contacted: true, // Flag permanen
      }

      localStorage.setItem('whatsapp_contacted', JSON.stringify(contactedList))
      this.updateWhatsAppStatus(customerId, true)
    } catch (error) {
      console.error('Error marking as contacted:', error)
    }
  },

  updateWhatsAppStatus(customerId, isContacted) {
    const buttons = document.querySelectorAll('.whatsapp-btn')
    buttons.forEach((btn) => {
      const btnCustomerId = btn.getAttribute('data-customer-id')
      if (btnCustomerId === customerId) {
        const row = btn.closest('tr')
        if (isContacted) {
          btn.classList.add('contacted')
          btn.innerHTML = '<i class="fab fa-whatsapp me-1"></i> Sudah Dihubungi'
          btn.disabled = false // Masih bisa diklik untuk hubungi lagi
          row.classList.add('whatsapp-contacted')

          // Update atau tambah status text dengan info waktu
          let statusDiv = btn.parentElement.querySelector('.whatsapp-status')
          if (!statusDiv) {
            statusDiv = document.createElement('div')
            statusDiv.className = 'whatsapp-status text-success'
            btn.parentElement.appendChild(statusDiv)
          }

          const contactInfo = this.getContactedInfo(customerId)
          const timeInfo =
            contactInfo.daysAgo === 0 ? 'Hari ini' : `${contactInfo.daysAgo} hari lalu`
          statusDiv.innerHTML = `<i class="fas fa-check-circle me-1"></i>Dihubungi ${timeInfo}`
        } else {
          // Reset status jika diperlukan
          btn.classList.remove('contacted')
          btn.innerHTML = '<i class="fab fa-whatsapp me-1"></i> Hubungi'
          row.classList.remove('whatsapp-contacted')

          const statusDiv = btn.parentElement.querySelector('.whatsapp-status')
          if (statusDiv) {
            statusDiv.remove()
          }
        }
      }
    })
  },

  isContacted(customerId) {
    try {
      const contactedList = JSON.parse(localStorage.getItem('whatsapp_contacted') || '{}')
      const contactData = contactedList[customerId]

      // Return true jika pernah dihubungi (tanpa batasan waktu)
      return contactData && contactData.contacted === true
    } catch (error) {
      return false
    }
  },

  // BONUS: Fungsi untuk melihat kapan terakhir dihubungi
  getContactedInfo(customerId) {
    try {
      const contactedList = JSON.parse(localStorage.getItem('whatsapp_contacted') || '{}')
      const contactData = contactedList[customerId]

      if (contactData) {
        const contactDate = new Date(contactData.timestamp)
        return {
          contacted: true,
          date: contactData.date,
          time: contactDate.toLocaleString('id-ID'),
          daysAgo: Math.floor((Date.now() - contactData.timestamp) / (1000 * 60 * 60 * 24)),
        }
      }

      return { contacted: false }
    } catch (error) {
      return { contacted: false }
    }
  },
}

// TAMBAHAN: Global function untuk dipanggil dari HTML
window.contactCustomer = function (phoneNumber, customerName, itemName, customerId = null) {
  // Buat customerId jika tidak ada
  if (!customerId) {
    customerId = `${phoneNumber}_${customerName}`
  }

  const result = WhatsAppUtils.openWhatsApp(phoneNumber, customerName, itemName)

  // PENTING: Mark as contacted setelah WhatsApp dibuka
  if (result) {
    WhatsAppUtils.markAsContacted(customerId)
  }

  return result
}

// Enhanced local cache system with TTL
const localCache = new Map()
const cacheMeta = new Map() // Cache metadata for timestamps
const CACHE_EXPIRATION = 5 * 60 * 1000 // 5 menit
const CACHE_TTL_STANDARD = 60 * 60 * 1000 // 1 jam untuk data standar
const CACHE_TTL_TODAY = 5 * 60 * 1000 // 5 menit untuk data hari ini
const DATA_SYNC_INTERVAL = 30 * 1000 // 30 detik

// PERBAIKAN: Tambahkan flag untuk tracking perubahan data
let lastKnownDataCount = 0
let currentMonthYear = null

// Cache management functions
function getCachedData(key) {
  const cached = localCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION) {
    return cached.data
  }
  return null
}

function setCachedData(key, data) {
  localCache.set(key, {
    data: data,
    timestamp: Date.now(),
  })

  // Update cache metadata
  updateCacheTimestamp(key)
}

function clearCacheKey(key) {
  localCache.delete(key)
  cacheMeta.delete(key)
}

function updateCacheTimestamp(cacheKey, timestamp = Date.now()) {
  try {
    cacheMeta.set(cacheKey, timestamp)
  } catch (error) {
    console.error('Error updating cache timestamp:', error)
  }
}

// Perbaiki fungsi untuk selective cache update
function updateCacheSelectively(action, data) {
  try {
    // PERBAIKAN: Handle case ketika currentMonthYear belum di-set
    let month, year
    if (currentMonthYear) {
      month = currentMonthYear.month
      year = currentMonthYear.year
    } else {
      // Fallback ke bulan/tahun dari data
      const dataDate = new Date(data.tanggal)
      month = dataDate.getMonth() + 1
      year = dataDate.getFullYear()
    }

    const cacheKey = `month_${month}_${year}`

    // Get current cached data atau buat baru
    let cached = localCache.get(cacheKey)
    let updatedData = cached ? [...cached.data] : []
    let dataChanged = false

    switch (action) {
      case 'add':
        // Check if data belongs to current month/year
        const addDataDate = new Date(data.tanggal)
        if (addDataDate.getMonth() + 1 === month && addDataDate.getFullYear() === year) {
          // PERBAIKAN: Cek duplikat sebelum tambah
          const exists = updatedData.find((item) => item.id === data.id)
          if (!exists) {
            updatedData.unshift(data) // Tambah di awal (data terbaru di atas)
            dataChanged = true
            console.log('✅ Added new data to localCache:', data.id)
          }
        }
        break

      case 'update':
        const updateIndex = updatedData.findIndex((item) => item.id === data.id)
        if (updateIndex !== -1) {
          // PERBAIKAN: Handle Timestamp objects dalam update data
          const updateData = { ...data }

          // Convert Timestamp objects untuk konsistensi
          if (updateData.waktuPengambilan && updateData.waktuPengambilan.toDate) {
            updateData.waktuPengambilan = updateData.waktuPengambilan.toDate().toISOString()
          }
          if (updateData.createdAt && updateData.createdAt.toDate) {
            updateData.createdAt = updateData.createdAt.toDate().toISOString()
          }
          if (updateData.updatedAt && updateData.updatedAt.toDate) {
            updateData.updatedAt = updateData.updatedAt.toDate().toISOString()
          }

          // Merge update data with existing data
          updatedData[updateIndex] = { ...updatedData[updateIndex], ...updateData }
          dataChanged = true
          console.log('Updated data in cache:', data.id)
        }
        break

      case 'delete':
        const deleteIndex = updatedData.findIndex((item) => item.id === data.id)
        if (deleteIndex !== -1) {
          updatedData.splice(deleteIndex, 1)
          dataChanged = true
          console.log('Removed data from cache:', data.id)
        }
        break
    }

    if (dataChanged) {
      // Update cache with new data
      setCachedData(cacheKey, updatedData)

      // Update current data if it's the active dataset
      if (isDataLoaded) {
        currentData = updatedData

        // Update filtered data if item was in current filter
        if (action === 'delete') {
          filteredData = filteredData.filter((item) => item.id !== data.id)
        } else if (action === 'update') {
          const filteredIndex = filteredData.findIndex((item) => item.id === data.id)
          if (filteredIndex !== -1) {
            filteredData[filteredIndex] = { ...filteredData[filteredIndex], ...data }
          }
        }

        // Re-apply filters to show updated data
        applyFilters()
      }

      // Update cache version
      cacheVersion = Date.now()

      // Save to localStorage
      saveServisCacheToStorage()
    }
  } catch (error) {
    console.error('Error updating cache selectively:', error)
  }
}

// Setup event listeners untuk data changes
function setupDataChangeListeners() {
  // Listen untuk storage events (cross-tab)
  window.addEventListener('storage', function (e) {
    if (e.key === 'servisDataChange' && e.newValue) {
      try {
        const event = JSON.parse(e.newValue)
        console.log('Received cross-tab data change:', event)

        // Update cache selectively
        updateCacheSelectively(event.action, event.data)

        // Clean up the event
        localStorage.removeItem('servisDataChange')
      } catch (error) {
        console.error('Error handling storage event:', error)
      }
    }
  })

  // Listen untuk same-tab events
  window.addEventListener('servisDataChanged', function (e) {
    if (e.detail) {
      console.log('📡 Received same-tab data change:', e.detail)

      // PERBAIKAN: Update cache dan UI langsung
      updateCacheSelectively(e.detail.action, e.detail.data)

      // Jika sedang menampilkan data, update currentData juga
      if (isDataLoaded && e.detail.action === 'add') {
        const addedData = e.detail.data
        const addDate = new Date(addedData.tanggal)
        const addMonth = addDate.getMonth() + 1
        const addYear = addDate.getFullYear()

        // Cek apakah data baru masuk ke filter bulan yang sedang ditampilkan
        if (
          currentMonthYear &&
          addMonth === currentMonthYear.month &&
          addYear === currentMonthYear.year
        ) {
          // Cek duplikat di currentData
          const exists = currentData.find((item) => item.id === addedData.id)
          if (!exists) {
            currentData.unshift(addedData)
            applyFilters()
            showAlert('success', `Data baru ditambahkan: ${addedData.namaCustomer || 'Customer'}`)
          }
        }
      }
      updateCacheSelectively(e.detail.action, e.detail.data)
    }
  })
}

function shouldUpdateCache(cacheKey) {
  if (!cacheMeta.has(cacheKey)) return true

  const lastUpdate = cacheMeta.get(cacheKey)
  const now = Date.now()

  // PERBAIKAN: Cek jika ada indikasi data baru dari input-servis
  const hasNewDataIndication = checkForNewDataIndication()
  if (hasNewDataIndication) {
    console.log('New data indication detected, forcing cache update')
    return true
  }

  // Gunakan TTL yang berbeda berdasarkan jenis data
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.substring(0, 7) // YYYY-MM format

  if (cacheKey.includes(currentMonth)) {
    // Data bulan ini menggunakan TTL lebih pendek
    return now - lastUpdate > CACHE_TTL_TODAY
  }

  // Data bulan lain menggunakan TTL standar
  return now - lastUpdate > CACHE_TTL_STANDARD
}

// PERBAIKAN: Fungsi untuk deteksi data baru
function checkForNewDataIndication() {
  try {
    // Cek localStorage untuk indikasi data baru dari input-servis
    const newDataFlag = localStorage.getItem('newServisDataAdded')
    const lastInputTime = localStorage.getItem('lastServisInputTime')

    if (newDataFlag === 'true') {
      // Reset flag
      localStorage.removeItem('newServisDataAdded')
      return true
    }

    // Cek berdasarkan timestamp input terakhir
    if (lastInputTime) {
      const inputTime = parseInt(lastInputTime)
      const timeDiff = Date.now() - inputTime

      // Jika input dalam 2 menit terakhir, anggap ada data baru
      if (timeDiff < 2 * 60 * 1000) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error checking new data indication:', error)
    return false
  }
}

// PERBAIKAN: Fungsi untuk sync data dengan optimasi
async function syncDataIfNeeded(forceSync = false) {
  try {
    if (!isDataLoaded || !currentMonthYear) return

    const { month, year } = currentMonthYear
    const cacheKey = `month_${month}_${year}`

    // Check if sync is needed
    const needSync = forceSync || checkForNewDataIndication() || shouldUpdateCache(cacheKey)

    if (needSync) {
      console.log('Syncing data due to changes detected')

      // Get fresh data from Firestore
      const freshData = await getServisByMonth(month, year)

      // Compare with current data to detect changes
      const hasChanges = JSON.stringify(freshData) !== JSON.stringify(currentData)

      if (hasChanges) {
        // Update cache and current data
        currentData = freshData
        setCachedData(cacheKey, currentData)
        saveServisCacheToStorage()

        // Re-apply filters
        applyFilters()

        console.log('Data synced and updated')
        showAlert('info', 'Data telah diperbarui dari server')
      }
    }
  } catch (error) {
    console.error('Error syncing data:', error)
  }
}

// Save cache to localStorage for persistence
function saveServisCacheToStorage() {
  try {
    const cacheObj = {}
    for (const [key, value] of localCache.entries()) {
      cacheObj[key] = value
    }

    const compressedData = JSON.stringify(cacheObj)
    localStorage.setItem('servisCache', compressedData)

    // Save metadata
    const metaObj = {}
    for (const [key, value] of cacheMeta.entries()) {
      metaObj[key] = value
    }
    localStorage.setItem('servisCacheMeta', JSON.stringify(metaObj))
    return true
  } catch (error) {
    console.error('Error saving servis cache:', error)
    if (error.name === 'QuotaExceededError') {
      cleanOldServisCacheEntries()
    }
    return false
  }
}

// Load cache from localStorage
function loadServisCacheFromStorage() {
  try {
    const cacheData = localStorage.getItem('servisCache')
    const metaData = localStorage.getItem('servisCacheMeta')

    if (cacheData) {
      const cacheObj = JSON.parse(cacheData)
      for (const [key, value] of Object.entries(cacheObj)) {
        localCache.set(key, value)
      }
    }

    if (metaData) {
      const metaObj = JSON.parse(metaData)
      for (const [key, value] of Object.entries(metaObj)) {
        cacheMeta.set(key, value)
      }
    }
  } catch (error) {
    console.error('Error loading servis cache:', error)
  }
}

function cleanOldServisCacheEntries() {
  try {
    const now = Date.now()
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000

    for (const [key, timestamp] of cacheMeta.entries()) {
      if (timestamp < threeDaysAgo) {
        cacheMeta.delete(key)
        localCache.delete(key)
      }
    }

    console.log('Old servis cache entries cleaned up')
  } catch (error) {
    console.error('Error cleaning old cache entries:', error)
  }
}

// Update initialization
document.addEventListener('DOMContentLoaded', function () {
  initializePage()
  setupEventListeners()

  // Setup data change listeners
  setupDataChangeListeners()

  // Load cache from storage
  loadServisCacheFromStorage()

  // Setup periodic sync (reduced frequency)
  setInterval(() => syncDataIfNeeded(), 60 * 1000) // Every 1 minute instead of 30 seconds
})

function initializePage() {
  updateDateTime()
  setInterval(updateDateTime, 1000)

  // Populate year selector dan set default ke bulan/tahun sekarang
  populateYearSelector()
  const now = new Date()
  document.getElementById('monthSelector').value = now.getMonth() + 1
  document.getElementById('yearSelector').value = now.getFullYear()
}

function populateYearSelector() {
  const yearSelector = document.getElementById('yearSelector')
  const currentYear = new Date().getFullYear()

  // Clear existing options
  yearSelector.innerHTML = ''

  // Add years (current year and 5 years back)
  for (let year = currentYear; year >= currentYear - 5; year--) {
    const option = document.createElement('option')
    option.value = year
    option.textContent = year
    yearSelector.appendChild(option)
  }
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

function setupEventListeners() {
  // Tampilkan button
  const tampilkanBtn = document.getElementById('tampilkanBtn')
  if (tampilkanBtn) {
    tampilkanBtn.addEventListener('click', loadServisData)
  }

  // Search input dengan ID yang benar
  const searchInput = document.getElementById('searchInputTable')
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters)
    searchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        applyFilters()
      }
    })
  }

  // Jenis Data filter (NEW)
  const jenisDataFilter = document.getElementById('jenisDataFilter')
  if (jenisDataFilter) {
    jenisDataFilter.addEventListener('change', function () {
      // Apply filter when jenis data changes
      if (isDataLoaded) {
        applyFilters()
      }
    })
  }

  // Status filters
  const statusServisFilter = document.getElementById('statusServisFilter')
  const statusPengambilanFilter = document.getElementById('statusPengambilanFilter')

  if (statusServisFilter) {
    statusServisFilter.addEventListener('change', function () {
      handleFilterLogic()
      // HANYA apply filter jika data sudah loaded
      if (isDataLoaded) {
        applyFilters()
      }
    })
  }

  if (statusPengambilanFilter) {
    statusPengambilanFilter.addEventListener('change', function () {
      // HANYA apply filter jika data sudah loaded
      if (isDataLoaded) {
        applyFilters()
      }
    })
  }

  // Save status button
  const saveStatusBtn = document.getElementById('saveStatusBtn')
  if (saveStatusBtn) {
    saveStatusBtn.addEventListener('click', saveStatusUpdate)
  }

  // Setup modal event listeners
  setupModalEventListeners()

  // PERBAIKAN: Listen untuk event data baru dari input-servis
  window.addEventListener('storage', function (e) {
    if (e.key === 'newServisDataAdded' && e.newValue === 'true') {
      console.log('New servis data detected from another tab')
      syncDataIfNeeded()
    }
  })
}

function setupModalEventListeners() {
  const statusServisSelect = document.getElementById('statusServis')
  const statusPengambilanSelect = document.getElementById('statusPengambilan')

  // Event listener untuk Status Servis
  if (statusServisSelect) {
    statusServisSelect.addEventListener('change', function () {
      const pengambilanForm = document.getElementById('pengambilanForm')

      if (this.value === 'Belum Selesai') {
        // Jika belum selesai, paksa status pengambilan ke "Belum Diambil"
        statusPengambilanSelect.value = 'Belum Diambil'
        statusPengambilanSelect.disabled = true
        pengambilanForm.style.display = 'none'
        // Reset form pengambilan
        document.getElementById('stafHandle').value = ''
        document.getElementById('waktuPengambilan').value = ''
      } else {
        // Jika sudah selesai, enable dropdown pengambilan
        statusPengambilanSelect.disabled = false
      }
    })
  }

  // Event listener untuk Status Pengambilan
  if (statusPengambilanSelect) {
    statusPengambilanSelect.addEventListener('change', function () {
      const pengambilanForm = document.getElementById('pengambilanForm')
      const waktuPengambilan = document.getElementById('waktuPengambilan')
      const buktiPengambilan = document.getElementById('buktiPengambilan')

      if (this.value === 'Sudah Diambil') {
        pengambilanForm.style.display = 'block'
        // Set waktu sekarang
        const now = new Date()
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
        waktuPengambilan.value = localDateTime
        // Set required pada bukti pengambilan
        if (buktiPengambilan) buktiPengambilan.required = true
      } else {
        pengambilanForm.style.display = 'none'
        document.getElementById('stafHandle').value = ''
        waktuPengambilan.value = ''
        if (buktiPengambilan) {
          buktiPengambilan.required = false
          buktiPengambilan.value = ''
        }
        // Reset preview
        document.getElementById('imagePreview').style.display = 'none'
        document.getElementById('previewImg').src = ''
      }
    })
  }

  // Handle image preview
  const buktiPengambilanInput = document.getElementById('buktiPengambilan')
  if (buktiPengambilanInput) {
    buktiPengambilanInput.addEventListener('change', handleImagePreview)
  }

  const removeImageBtn = document.getElementById('removeImageBtn')
  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', function () {
      const buktiInput = document.getElementById('buktiPengambilan')
      buktiInput.value = ''
      document.getElementById('imagePreview').style.display = 'none'
      document.getElementById('previewImg').src = ''
    })
  }
}

// Handle image preview
function handleImagePreview(e) {
  const file = e.target.files[0]
  if (!file) return

  // Validate file
  try {
    validateImageFile(file)

    // Show preview
    const reader = new FileReader()
    reader.onload = function (event) {
      document.getElementById('previewImg').src = event.target.result
      document.getElementById('imagePreview').style.display = 'block'
    }
    reader.readAsDataURL(file)
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'File Tidak Valid',
      text: error.message,
    })
    e.target.value = ''
  }
}

async function loadServisData() {
  // FASE 1: Prevent multiple simultaneous loads
  if (isLoading) {
    console.log('⏳ Load already in progress, skipping...')
    return
  }

  try {
    isLoading = true
    showLoading(true)

    const month = parseInt(document.getElementById('monthSelector').value)
    const year = parseInt(document.getElementById('yearSelector').value)
    const cacheKey = `month_${month}_${year}`

    // PERBAIKAN: Set current month/year untuk tracking
    currentMonthYear = { month, year }

    // PERBAIKAN: Cek apakah ada data baru dari input-servis
    const hasNewData = localStorage.getItem('newServisDataAdded') === 'true'
    const lastAddedId = localStorage.getItem('lastAddedServisId')

    // Check if cache should be updated
    const shouldUpdate = shouldUpdateCache(cacheKey) || hasNewData

    // Check local cache first - prioritaskan smartServisCache yang sudah di-update
    const smartCacheKey = `servis_${month}_${year}_all`
    let cachedData = getCachedData(cacheKey)

    // PERBAIKAN: Jika ada data baru, coba ambil dari smartServisCache yang sudah updated
    if (hasNewData) {
      const smartCached = smartServisCache.get(smartCacheKey)
      if (smartCached) {
        cachedData = smartCached
        // Sync ke localCache
        setCachedData(cacheKey, cachedData)
        console.log('📦 Using updated smartCache with new data')
      }
      // Clear flag setelah digunakan
      localStorage.removeItem('newServisDataAdded')
      localStorage.removeItem('lastAddedServisId')
    }

    if (cachedData && !shouldUpdate) {
      currentData = cachedData
      showCacheIndicator(true)
    } else if (cachedData && hasNewData) {
      // PERBAIKAN: Jika ada data baru dan cache sudah di-update, gunakan cache
      console.log(`Using updated cache with new data for ${month}/${year}`)
      currentData = cachedData
      showCacheIndicator(false, 'Updated')
    } else {

      // FASE 1: Try fetch with fallback to cache on error
      try {
        currentData = await getServisByMonth(month, year)
        setCachedData(cacheKey, currentData)
        showCacheIndicator(false)
        // Save to localStorage
        saveServisCacheToStorage()
      } catch (fetchError) {
        console.error('Fetch error:', fetchError)

        // FASE 1: Fallback ke cache jika ada
        const fallbackCache =
          getCachedData(cacheKey) || smartServisCache.get(`servis_${month}_${year}_all`)
        if (fallbackCache) {
          console.log('📦 Using fallback cache due to network error')
          currentData = fallbackCache
          showCacheIndicator(true, 'Offline Mode')
          showAlert('warning', 'Jaringan lambat - menampilkan data dari cache')
        } else {
          throw fetchError // Re-throw jika tidak ada cache
        }
      }
    }

    // PERBAIKAN: Update tracking data count
    lastKnownDataCount = currentData.length

    // Reset search
    const searchInput = document.getElementById('searchInputTable')
    if (searchInput) {
      searchInput.value = ''
    }

    // Set flag bahwa data sudah loaded
    isDataLoaded = true

    // Apply filters setelah data loaded
    applyFilters()
    showLoading(false)
    isLoading = false

    // FASE 2: Subscribe ke real-time updates setelah initial load
    setupRealtimeUpdates(month, year)
  } catch (error) {
    console.error('Error loading servis data:', error)
    showAlert('danger', 'Terjadi kesalahan saat memuat data: ' + error.message)
    showLoading(false)
    isLoading = false
    isDataLoaded = false
  }
}

// ========== FASE 2: REAL-TIME UPDATES ==========
function setupRealtimeUpdates(month, year) {
  // Unsubscribe dari listener sebelumnya
  if (activeRealtimeListener) {
    unsubscribeFromUpdates()
    activeRealtimeListener = null
  }

  activeRealtimeListener = subscribeToMonthUpdates(
    month,
    year,
    handleRealtimeUpdate,
    handleRealtimeError
  )
}

// Handler untuk real-time updates
function handleRealtimeUpdate(updatedData, docChanges) {
  if (!docChanges || docChanges.length === 0) return

  console.log(`🔄 Processing ${docChanges.length} real-time changes`)

  // Update currentData dengan data dari cache yang sudah di-update
  if (updatedData) {
    currentData = updatedData
  }

  // FASE 2: Update UI secara surgical (hanya row yang berubah)
  docChanges.forEach((change) => {
    const docData = { id: change.doc.id, ...change.doc.data() }
    const rowId = `row-${docData.id}`
    const existingRow = document.getElementById(rowId)

    switch (change.type) {
      case 'modified':
        if (existingRow) {
          // Highlight row yang diupdate
          existingRow.classList.add('row-updated')
          setTimeout(() => existingRow.classList.remove('row-updated'), 3000)
        }
        break

      case 'added':
        // Show notification untuk data baru
        showAlert('info', `Data baru ditambahkan: ${docData.namaCustomer || 'Customer'}`)
        break

      case 'removed':
        if (existingRow) {
          existingRow.classList.add('row-removing')
          setTimeout(() => existingRow.remove(), 300)
        }
        break
    }
  })

  // Re-apply filters untuk update tampilan
  applyFilters()

  // Update cache indicator
  showCacheIndicator(false, 'Live')
}

// Handler untuk real-time errors
function handleRealtimeError(error) {
  console.error('Real-time error:', error)
  showAlert('warning', 'Koneksi real-time terputus. Data mungkin tidak up-to-date.')
}

function resetFilters() {
  const searchInput = document.getElementById('searchInputTable')

  if (searchInput) searchInput.value = ''
}

// Format status pembayaran dengan badge
function formatStatusPembayaranBadge(statusPembayaran) {
  if (!statusPembayaran) {
    return '<span class="badge bg-secondary">Tidak Diketahui</span>'
  }

  const statusMap = {
    nominal: { label: 'Lunas', class: 'status-pembayaran-lunas' },
    belum_lunas: { label: 'Belum Lunas', class: 'status-pembayaran-belum-lunas' },
    free: { label: 'Free', class: 'status-pembayaran-free' },
    custom: { label: 'Custom', class: 'status-pembayaran-custom' },
  }

  const status = statusMap[statusPembayaran] || { label: statusPembayaran, class: 'bg-secondary' }
  return `<span class="badge ${status.class}">${status.label}</span>`
}

// Helper function untuk format array field ke HTML dengan <br>
function formatArrayFieldToHTML(items, field, formatter = null) {
  if (!items || items.length === 0) return '-'
  return items
    .map((item) => {
      const value = item[field]
      return formatter ? formatter(value, item) : value || '-'
    })
    .join('<br>')
}

// NEW: Prepare servis data tanpa expand array (keep as single row per customer)
function expandServisData(data, jenisData) {
  let expanded = []

  data.forEach((item) => {
    const jenisInput = item.jenisInput || 'servis'

    // Filter berdasarkan jenisData
    if (jenisInput !== jenisData) return

    // Tidak expand array, keep as single row dengan flag isArray
    if (jenisInput === 'servis' && item.detailBarang && item.detailBarang.length > 0) {
      expanded.push({
        ...item,
        isArrayData: item.detailBarang.length > 1,
        itemCount: item.detailBarang.length,
      })
    } else if (
      jenisInput === 'custom' &&
      item.detailBarangCustom &&
      item.detailBarangCustom.length > 0
    ) {
      expanded.push({
        ...item,
        isArrayData: item.detailBarangCustom.length > 1,
        itemCount: item.detailBarangCustom.length,
      })
    } else {
      // Data tanpa detail barang atau data lama
      expanded.push({
        ...item,
        isArrayData: false,
        itemCount: 0,
      })
    }
  })
  return expanded
}

// NEW: Update table headers based on jenis data
function updateTableHeaders(jenisData) {
  const thead = document.getElementById('tableHeaders')
  const tableTitle = document.getElementById('tableTitle')

  // Update title
  if (tableTitle) {
    tableTitle.textContent = jenisData === 'servis' ? 'Data Servis' : 'Data Custom'
  }

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
      <th>Berat</th>
      <th>Kadar</th>
      <th>Jenis Servis</th>
      <th>Rincian Servis</th>
      <th>Pembayaran</th>
      <th>Ongkos</th>
    `
  } else if (jenisData === 'custom') {
    headers += `
      <th>Berat</th>
      <th>Panjang/Size</th>
      <th>Kadar</th>
      <th>Warna</th>
      <th>Rincian Custom</th>
      <th>Pembayaran</th>
      <th>DP</th>
      <th>Ongkos</th>
    `
  }

  headers += `
      <th>Status Servis</th>
      <th>Status Pengambilan</th>
      <th>WhatsApp</th>
      <th>Handle Pengambilan</th>
      <th>Waktu Pengambilan</th>
      <th>Bukti Pengambilan</th>
      <th>Aksi</th>
    </tr>
  `

  thead.innerHTML = headers
}

function applyFilters() {
  const searchTerm = document.getElementById('searchInputTable')?.value.trim().toLowerCase() || ''
  const statusServisFilter = document.getElementById('statusServisFilter')?.value || ''
  const statusPengambilanFilter = document.getElementById('statusPengambilanFilter')?.value || ''
  const jenisDataFilter = document.getElementById('jenisDataFilter')?.value || 'servis'

  // First, filter by status AND jenisInput
  let statusFiltered = currentData.filter((item) => {
    const matchesStatusServis = !statusServisFilter || item.statusServis === statusServisFilter
    const matchesStatusPengambilan =
      !statusPengambilanFilter || item.statusPengambilan === statusPengambilanFilter

    // Filter by jenisInput - CRITICAL FIX
    const matchesJenisInput = (item.jenisInput || 'servis') === jenisDataFilter

    return matchesStatusServis && matchesStatusPengambilan && matchesJenisInput
  })


  // Expand data based on jenis
  const expandedData = expandServisData(statusFiltered, jenisDataFilter)

  // Apply search filter on expanded data
  filteredData = expandedData.filter((item) => {
    if (!searchTerm) return true

    const jenisInput = item.jenisInput || 'servis'

    // Search dalam array detailBarang atau detailBarangCustom
    if (jenisInput === 'servis' && item.detailBarang) {
      const detailMatch = item.detailBarang.some(
        (detail) =>
          detail.namaBarang?.toLowerCase().includes(searchTerm) ||
          detail.berat?.toString().includes(searchTerm) ||
          detail.karat?.toString().includes(searchTerm) ||
          detail.jenisServis?.toLowerCase().includes(searchTerm) ||
          detail.rincianServis?.toLowerCase().includes(searchTerm)
      )
      if (detailMatch) return true
    }

    if (jenisInput === 'custom' && item.detailBarangCustom) {
      const detailMatch = item.detailBarangCustom.some(
        (detail) =>
          detail.namaBarang?.toLowerCase().includes(searchTerm) ||
          detail.berat?.toString().includes(searchTerm) ||
          detail.panjang?.toString().includes(searchTerm) ||
          detail.kadar?.toLowerCase().includes(searchTerm) ||
          detail.warna?.toLowerCase().includes(searchTerm) ||
          detail.rincianServis?.toLowerCase().includes(searchTerm)
      )
      if (detailMatch) return true
    }

    // Search pada field utama customer
    return (
      item.namaCustomer?.toLowerCase().includes(searchTerm) ||
      item.noHp?.includes(searchTerm) ||
      item.namaSales?.toLowerCase().includes(searchTerm)
    )
  })

  // Reset to first page when filters change
  currentPage = 1

  // Update headers and display
  updateTableHeaders(jenisDataFilter)
  displayData(jenisDataFilter)
}

function displayData(jenisData = 'servis') {
  const tbody = document.getElementById('dataServisList')
  const tableContainer = document.getElementById('tableContainer')
  const noDataMessage = document.getElementById('noDataMessage')

  if (!isDataLoaded) {
    tableContainer.style.display = 'none'
    noDataMessage.style.display = 'none'
    return
  }

  tableContainer.style.display = 'block'

  if (filteredData.length === 0) {
    tbody.innerHTML = ''
    noDataMessage.style.display = 'block'
    updatePaginationInfo(0)
    const tableWrapper = document.getElementById('tableWrapper')
    if (tableWrapper) {
      tableWrapper.style.display = 'block'
    }
    return
  }

  noDataMessage.style.display = 'none'

  // Calculate pagination
  totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length)
  paginatedData = filteredData.slice(startIndex, endIndex)

  // Update pagination info
  updatePaginationInfo(filteredData.length)

  // Clear tbody with loading skeleton
  tbody.innerHTML = createLoadingSkeleton(itemsPerPage)

  // Batch render with requestAnimationFrame
  requestAnimationFrame(() => {
    tbody.innerHTML = ''
    renderDataBatch(paginatedData, 0, jenisData, tbody)
  })
}

// Create loading skeleton
function createLoadingSkeleton(rows) {
  let skeletonHTML = ''
  const skeletonCols = 16 // Jumlah kolom

  for (let i = 0; i < Math.min(rows, 10); i++) {
    skeletonHTML += '<tr class="skeleton-row">'
    for (let j = 0; j < skeletonCols; j++) {
      skeletonHTML += '<td><div class="skeleton-loading"></div></td>'
    }
    skeletonHTML += '</tr>'
  }
  return skeletonHTML
}

// Batch render function
function renderDataBatch(items, startIndex, jenisData, tbody) {
  const batchSize = 15
  const endIndex = Math.min(startIndex + batchSize, items.length)
  const fragment = document.createDocumentFragment()

  for (let i = startIndex; i < endIndex; i++) {
    const item = items[i]
    const globalIndex = (currentPage - 1) * itemsPerPage + i
    const row = document.createElement('tr')
    const jenisInput = item.jenisInput || 'servis'

    // FASE 2: Tambah ID untuk surgical DOM update
    row.id = `row-${item.id}`
    row.setAttribute('data-jenis', jenisInput)
    row.setAttribute('data-id', item.id)

    const tanggalFormatted = new Date(item.tanggal).toLocaleDateString('id-ID')
    const namaSales = item.namaSales || '-'
    const namaCustomer = item.namaCustomer || '-'
    const noHp = item.noHp || '-'

    // Status servis badge
    let statusServisContent = ''
    if (item.statusServis === 'Sudah Selesai') {
      statusServisContent = '<span class="badge bg-success">Sudah Selesai</span>'
    } else {
      statusServisContent = '<span class="badge bg-warning text-dark">Belum Selesai</span>'
    }

    // Status pengambilan badge
    const statusPengambilanBadge =
      item.statusPengambilan === 'Sudah Diambil'
        ? '<span class="badge bg-success">Sudah Diambil</span>'
        : '<span class="badge bg-danger">Belum Diambil</span>'

    // Handle waktu pengambilan
    let waktuPengambilan = '-'
    let waktuForModal = ''

    if (item.waktuPengambilan) {
      try {
        let waktuDate

        if (item.waktuPengambilan.toDate) {
          waktuDate = item.waktuPengambilan.toDate()
        } else if (item.waktuPengambilan.seconds) {
          waktuDate = new Date(item.waktuPengambilan.seconds * 1000)
        } else if (typeof item.waktuPengambilan === 'string') {
          waktuDate = new Date(item.waktuPengambilan)
        } else {
          waktuDate = new Date(item.waktuPengambilan)
        }

        if (!isNaN(waktuDate.getTime())) {
          waktuPengambilan = waktuDate.toLocaleString('id-ID')
          waktuForModal = waktuDate.toISOString().slice(0, 16)
        }
      } catch (error) {
        console.error('Error formatting waktu pengambilan for item:', item.id, error)
        waktuPengambilan = '-'
        waktuForModal = ''
      }
    }

    // Dynamic columns based on jenisData
    let specificColumns = ''
    let namaBarangHTML = '-'
    let totalOngkos = 0

    if (jenisInput === 'servis') {
      const detailBarang = item.detailBarang || []

      // Format array fields dengan <br>
      namaBarangHTML = formatArrayFieldToHTML(detailBarang, 'namaBarang')
      const beratHTML = formatArrayFieldToHTML(detailBarang, 'berat', (val) =>
        val ? `${val}` : '-'
      )
      const karatHTML = formatArrayFieldToHTML(detailBarang, 'karat', (val) =>
        val ? `${val}` : '-'
      )
      const jenisServisHTML = formatArrayFieldToHTML(detailBarang, 'jenisServis')
      const rincianServisHTML = formatArrayFieldToHTML(detailBarang, 'rincianServis')

      // Calculate total ongkos dari semua items
      totalOngkos = detailBarang.reduce((sum, detail) => sum + (parseFloat(detail.ongkos) || 0), 0)

      // Format status pembayaran
      let statusPembayaranHTML = '-'
      if (detailBarang.length > 0) {
        const statuses = detailBarang.map((d) => d.statusPembayaran || 'nominal')
        const uniqueStatuses = [...new Set(statuses)]
        if (uniqueStatuses.length === 1) {
          statusPembayaranHTML = formatStatusPembayaranBadge(uniqueStatuses[0])
        } else {
          statusPembayaranHTML = uniqueStatuses
            .map((s) => formatStatusPembayaranBadge(s))
            .join('<br>')
        }
      }

      specificColumns = `
        <td style="border-right: 2px solid #dee2e6;">${beratHTML}</td>
        <td style="border-right: 2px solid #dee2e6;">${karatHTML}</td>
        <td style="border-right: 2px solid #dee2e6;">${jenisServisHTML}</td>
        <td style="border-right: 2px solid #dee2e6; min-width: 200px; max-width: 250px; word-wrap: break-word;">
          ${rincianServisHTML}
        </td>
        <td style="border-right: 2px solid #dee2e6; text-align: center;">${statusPembayaranHTML}</td>
      `
    } else if (jenisInput === 'custom') {
      const detailBarangCustom = item.detailBarangCustom || []

      // Format array fields dengan <br>
      namaBarangHTML = formatArrayFieldToHTML(detailBarangCustom, 'namaBarang')
      const beratHTML = formatArrayFieldToHTML(detailBarangCustom, 'berat', (val) =>
        val ? `${val}` : '-'
      )
      const panjangHTML = formatArrayFieldToHTML(detailBarangCustom, 'panjang', (val) =>
        val ? `${val}` : '-'
      )
      const kadarHTML = formatArrayFieldToHTML(detailBarangCustom, 'kadar')
      const warnaHTML = formatArrayFieldToHTML(detailBarangCustom, 'warna')
      const rincianServisHTML = formatArrayFieldToHTML(detailBarangCustom, 'rincianServis')

      // Calculate totals
      const totalDP = detailBarangCustom.reduce(
        (sum, detail) => sum + (parseFloat(detail.totalDP) || 0),
        0
      )
      totalOngkos = detailBarangCustom.reduce(
        (sum, detail) => sum + (parseFloat(detail.ongkos) || 0),
        0
      )

      // Format status pembayaran
      let statusPembayaranHTML = '-'
      if (detailBarangCustom.length > 0) {
        const statuses = detailBarangCustom.map((d) => d.statusPembayaran || 'nominal')
        const uniqueStatuses = [...new Set(statuses)]
        if (uniqueStatuses.length === 1) {
          statusPembayaranHTML = formatStatusPembayaranBadge(uniqueStatuses[0])
        } else {
          statusPembayaranHTML = uniqueStatuses
            .map((s) => formatStatusPembayaranBadge(s))
            .join('<br>')
        }
      }

      const dpDisplay = totalDP > 0 ? `Rp ${totalDP.toLocaleString('id-ID')}` : '-'

      specificColumns = `
        <td style="border-right: 2px solid #dee2e6;">${beratHTML}</td>
        <td style="border-right: 2px solid #dee2e6;">${panjangHTML}</td>
        <td style="border-right: 2px solid #dee2e6;">${kadarHTML}</td>
        <td style="border-right: 2px solid #dee2e6;">${warnaHTML}</td>
        <td style="border-right: 2px solid #dee2e6; min-width: 200px; max-width: 250px; word-wrap: break-word;">
          ${rincianServisHTML}
        </td>
        <td style="border-right: 2px solid #dee2e6; text-align: center;">${statusPembayaranHTML}</td>
        <td style="border-right: 2px solid #dee2e6; text-align: center;">${dpDisplay}</td>
      `
    }

    const ongkosDisplay = totalOngkos > 0 ? `Rp ${totalOngkos.toLocaleString('id-ID')}` : '-'

    // WhatsApp content
    let whatsappContent = ''
    if (item.statusServis === 'Sudah Selesai') {
      const customerId = `${item.noHp}_${item.namaCustomer}`
      const isContacted = WhatsAppUtils.isContacted(customerId)
      const contactInfo = WhatsAppUtils.getContactedInfo(customerId)

      if (WhatsAppUtils.isValidPhoneNumber(item.noHp)) {
        const buttonClass = isContacted ? 'whatsapp-btn contacted' : 'whatsapp-btn'
        const buttonText = isContacted ? 'Sudah Dihubungi' : 'Hubungi'

        // Untuk WhatsApp message, gunakan nama barang yang sudah diformat tanpa HTML
        const itemNameForWA = namaBarangHTML.replace(/<br>/g, ', ').substring(0, 100)

        whatsappContent = `
          <button class="btn ${buttonClass}"
                  data-customer-id="${customerId}"
                  onclick="contactCustomer('${item.noHp}', '${item.namaCustomer.replace(
          /'/g,
          "\\'"
        )}', '${itemNameForWA.replace(/'/g, "\\'")}', '${customerId}')"
                  title="Hubungi customer via WhatsApp">
            <i class="fab fa-whatsapp me-1"></i>
            ${buttonText}
          </button>`

        if (isContacted && contactInfo.contacted) {
          const timeInfo =
            contactInfo.daysAgo === 0 ? 'Hari ini' : `${contactInfo.daysAgo} hari lalu`
          whatsappContent += `
            <div class="whatsapp-status text-success">
              <i class="fas fa-check-circle me-1"></i>Dihubungi ${timeInfo}
            </div>`
        }
      } else {
        whatsappContent = '<small class="text-muted">No HP tidak valid</small>'
      }
    } else {
      whatsappContent = '<small class="text-muted">Belum tersedia</small>'
    }

    const itemId = item.id

    row.innerHTML = `
      <td style="border-right: 2px solid #dee2e6;">${globalIndex + 1}</td>
      <td style="border-right: 2px solid #dee2e6;">${tanggalFormatted}</td>
      <td style="border-right: 2px solid #dee2e6;">${namaSales}</td>
      <td style="border-right: 2px solid #dee2e6;">${namaCustomer}</td>
      <td style="border-right: 2px solid #dee2e6;">${noHp}</td>
      <td style="border-right: 2px solid #dee2e6; min-width: 200px; max-width: 250px; word-wrap: break-word;">
        ${namaBarangHTML}
      </td>
      ${specificColumns}
      <td style="border-right: 2px solid #dee2e6; text-align: center;">${ongkosDisplay}</td>
      <td style="border-right: 2px solid #dee2e6;">${statusServisContent}</td>
      <td style="border-right: 2px solid #dee2e6;">${statusPengambilanBadge}</td>
      <td style="border-right: 2px solid #dee2e6;" class="status-cell">${whatsappContent}</td>
      <td style="border-right: 2px solid #dee2e6;">${item.stafHandle || '-'}</td>
      <td style="border-right: 2px solid #dee2e6;"><small>${waktuPengambilan}</small></td>
      <td style="border-right: 2px solid #dee2e6; text-align: center;">
        ${
          item.buktiPengambilanUrl
            ? `<button class="btn btn-sm btn-info" onclick="viewPhoto('${item.buktiPengambilanUrl}')" title="Lihat Foto">
            <i class="fas fa-image"></i>
          </button>`
            : '-'
        }
      </td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="openUpdateModal('${itemId}', '${
      item.statusServis
    }', '${item.statusPengambilan}', '${item.stafHandle || ''}', '${waktuForModal}')">
          <i class="fas fa-edit"></i>
        </button>
      </td>
    `

    fragment.appendChild(row)
  }

  tbody.appendChild(fragment)

  // Render next batch
  if (endIndex < items.length) {
    requestAnimationFrame(() => {
      renderDataBatch(items, endIndex, jenisData, tbody)
    })
  }
}

// Pagination functions
function updatePaginationInfo(totalItems) {
  const paginationInfo = document.getElementById('paginationInfo')
  const paginationControls = document.getElementById('paginationControls')

  if (!paginationInfo || !paginationControls) return

  if (totalItems === 0) {
    paginationInfo.textContent = 'Tidak ada data'
    paginationControls.style.display = 'none'
    return
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  paginationInfo.textContent = `Menampilkan ${startItem}-${endItem} dari ${totalItems} data`
  paginationControls.style.display = 'flex'

  // Update buttons
  const prevBtn = document.getElementById('prevPageBtn')
  const nextBtn = document.getElementById('nextPageBtn')
  const pageNumbers = document.getElementById('pageNumbers')

  if (prevBtn) prevBtn.disabled = currentPage === 1
  if (nextBtn) nextBtn.disabled = currentPage === totalPages

  // Generate page numbers
  if (pageNumbers) {
    pageNumbers.innerHTML = generatePageNumbers()
  }
}

function generatePageNumbers() {
  let html = ''
  const maxVisible = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  let endPage = Math.min(totalPages, startPage + maxVisible - 1)

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  if (startPage > 1) {
    html += `<button class="btn btn-sm btn-outline-primary" onclick="goToPage(1)">1</button>`
    if (startPage > 2) {
      html += `<span class="mx-1">...</span>`
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === currentPage ? 'btn-primary' : 'btn-outline-primary'
    html += `<button class="btn btn-sm ${activeClass}" onclick="goToPage(${i})">${i}</button>`
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="mx-1">...</span>`
    }
    html += `<button class="btn btn-sm btn-outline-primary" onclick="goToPage(${totalPages})">${totalPages}</button>`
  }

  return html
}

window.goToPage = function (page) {
  if (page < 1 || page > totalPages || page === currentPage) return

  currentPage = page
  const jenisDataFilter = document.getElementById('jenisDataFilter')
  const currentJenisData = jenisDataFilter ? jenisDataFilter.value : 'servis'

  displayData(currentJenisData)

  // Scroll to top of table
  const tableContainer = document.getElementById('tableContainer')
  if (tableContainer) {
    tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

window.prevPage = function () {
  if (currentPage > 1) {
    goToPage(currentPage - 1)
  }
}

window.nextPage = function () {
  if (currentPage < totalPages) {
    goToPage(currentPage + 1)
  }
}

window.changeItemsPerPage = function (newSize) {
  itemsPerPage = parseInt(newSize)
  currentPage = 1
  const jenisDataFilter = document.getElementById('jenisDataFilter')
  const currentJenisData = jenisDataFilter ? jenisDataFilter.value : 'servis'
  displayData(currentJenisData)
}

// Update openUpdateModal function
window.openUpdateModal = function (
  servisId,
  currentStatusServis,
  currentStatusPengambilan,
  stafHandle = '',
  waktuPengambilan = ''
) {
  document.getElementById('updateServisId').value = servisId
  document.getElementById('statusServis').value = currentStatusServis
  document.getElementById('statusPengambilan').value = currentStatusPengambilan

  const statusPengambilanSelect = document.getElementById('statusPengambilan')
  const pengambilanForm = document.getElementById('pengambilanForm')

  // Logika disable/enable berdasarkan status servis
  if (currentStatusServis === 'Belum Selesai') {
    statusPengambilanSelect.disabled = true
    statusPengambilanSelect.value = 'Belum Diambil'
    pengambilanForm.style.display = 'none'
  } else {
    statusPengambilanSelect.disabled = false

    // Set data pengambilan jika ada
    document.getElementById('stafHandle').value = stafHandle

    // PERBAIKAN: Handle waktu pengambilan dengan proper validation
    if (waktuPengambilan && waktuPengambilan !== '' && waktuPengambilan !== 'undefined') {
      try {
        // Pastikan format datetime-local yang valid
        let formattedWaktu = waktuPengambilan

        // Jika bukan format ISO, convert dulu
        if (!waktuPengambilan.includes('T')) {
          const date = new Date(waktuPengambilan)
          if (!isNaN(date.getTime())) {
            formattedWaktu = date.toISOString().slice(0, 16)
          }
        } else {
          // Pastikan format datetime-local (YYYY-MM-DDTHH:mm)
          formattedWaktu = waktuPengambilan.slice(0, 16)
        }

        document.getElementById('waktuPengambilan').value = formattedWaktu
      } catch (error) {
        console.error('Error setting waktu pengambilan:', error)
        document.getElementById('waktuPengambilan').value = ''
      }
    } else {
      document.getElementById('waktuPengambilan').value = ''
    }

    // Show/hide pengambilan form
    if (currentStatusPengambilan === 'Sudah Diambil') {
      pengambilanForm.style.display = 'block'
    } else {
      pengambilanForm.style.display = 'none'
    }
  }

  const modal = new bootstrap.Modal(document.getElementById('updateStatusModal'))
  modal.show()
}

async function saveStatusUpdate() {
  try {
    const servisId = document.getElementById('updateServisId').value
    const statusServis = document.getElementById('statusServis').value
    const statusPengambilan = document.getElementById('statusPengambilan').value

    let stafHandle = null
    let waktuPengambilan = null
    let buktiPengambilanUrl = null
    let buktiPengambilanPath = null

    if (statusPengambilan === 'Sudah Diambil') {
      stafHandle = document.getElementById('stafHandle').value.trim()
      const waktuInput = document.getElementById('waktuPengambilan').value
      const buktiInput = document.getElementById('buktiPengambilan')
      const fileInput = buktiInput?.files[0]

      if (!stafHandle) {
        Swal.fire({
          icon: 'warning',
          title: 'Data Belum Lengkap',
          text: 'Nama staf handle harus diisi',
        })
        return
      }

      if (!fileInput) {
        Swal.fire({
          icon: 'warning',
          title: 'Foto Wajib Diisi',
          text: 'Bukti pengambilan (foto) harus diupload saat status Sudah Diambil',
        })
        return
      }

      waktuPengambilan = waktuInput

      // Validate & compress image
      try {
        validateImageFile(fileInput)
        showLoading(true)

        Swal.fire({
          title: 'Mengupload Foto...',
          html: 'Mohon tunggu, sedang mengkompres dan mengupload foto',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading()
          },
        })

        // Compress and upload
        const compressedFile = await compressImage(fileInput)
        const uploadResult = await uploadBuktiPengambilan(compressedFile, servisId)

        buktiPengambilanUrl = uploadResult.url
        buktiPengambilanPath = uploadResult.path

        Swal.close()
      } catch (error) {
        showLoading(false)
        Swal.fire({
          icon: 'error',
          title: 'Upload Gagal',
          text: error.message,
        })
        return
      }
    }

    showLoading(true)

    try {
      // 1. Update ke Firestore
      await updateServisStatus(
        servisId,
        statusServis,
        statusPengambilan,
        stafHandle,
        waktuPengambilan,
        buktiPengambilanUrl,
        buktiPengambilanPath
      )

      // 2. PERBAIKAN SEDERHANA: Update data lokal langsung
      const updateData = {
        statusServis,
        statusPengambilan,
        stafHandle,
        waktuPengambilan: waktuPengambilan ? new Date(waktuPengambilan).toISOString() : null,
        buktiPengambilanUrl,
        buktiPengambilanPath,
      }

      // Update currentData
      const currentIndex = currentData.findIndex((item) => item.id === servisId)
      if (currentIndex !== -1) {
        currentData[currentIndex] = { ...currentData[currentIndex], ...updateData }
      }

      // Update filteredData
      const filteredIndex = filteredData.findIndex((item) => item.id === servisId)
      if (filteredIndex !== -1) {
        filteredData[filteredIndex] = { ...filteredData[filteredIndex], ...updateData }
      }

      // 3. Update cache
      if (currentMonthYear) {
        const { month, year } = currentMonthYear
        const cacheKey = `month_${month}_${year}`
        setCachedData(cacheKey, currentData)
      }

      // 4. PERBAIKAN: Re-apply filters untuk update display dengan jenisData yang benar
      const jenisDataFilter = document.getElementById('jenisDataFilter')
      const currentJenisData = jenisDataFilter ? jenisDataFilter.value : 'servis'
      applyFilters()

      // 5. Tutup modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('updateStatusModal'))
      if (modal) {
        modal.hide()
      }

      // 6. PERBAIKAN: Auto-adjust filter jika perlu
      const statusServisFilter = document.getElementById('statusServisFilter')
      if (statusServis === 'Sudah Selesai' && statusServisFilter.value === 'Belum Selesai') {
        statusServisFilter.value = 'Sudah Selesai'
        handleFilterLogic()
        applyFilters() // Re-apply dengan filter baru
      }

      // 7. Show success message
      if (statusServis === 'Sudah Selesai') {
        Swal.fire({
          icon: 'success',
          title: 'Status Berhasil Diperbarui',
          text: 'Sekarang Anda dapat menghubungi customer via WhatsApp.',
          timer: 2000,
        })
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Status berhasil diperbarui dan disimpan',
          timer: 2000,
        })
      }
    } catch (updateError) {
      console.error('Error during update process:', updateError)
      throw updateError
    }

    showLoading(false)
  } catch (error) {
    console.error('Error updating status:', error)
    showAlert('danger', 'Terjadi kesalahan saat memperbarui status: ' + error.message)
    showLoading(false)
  }
}

// PERBAIKAN: Fungsi untuk update local data dan cache secara konsisten
function updateLocalDataAndCache(servisId, updateData) {
  try {
    // Update di currentData
    const currentIndex = currentData.findIndex((item) => item.id === servisId)
    if (currentIndex !== -1) {
      Object.assign(currentData[currentIndex], updateData)
    }

    // Update di filteredData
    const filteredIndex = filteredData.findIndex((item) => item.id === servisId)
    if (filteredIndex !== -1) {
      Object.assign(filteredData[filteredIndex], updateData)
    }

    // PERBAIKAN: Update cache dengan data terbaru
    if (currentMonthYear) {
      const { month, year } = currentMonthYear
      const cacheKey = `month_${month}_${year}`
      setCachedData(cacheKey, currentData)
    }

    // PERBAIKAN: Invalidate cache terkait untuk memastikan konsistensi
    invalidateRelatedCache(servisId)

    // Save to localStorage
    saveServisCacheToStorage()

    // PERBAIKAN: Trigger event untuk notifikasi update
    notifyServisUpdate(servisId, updateData)

    console.log(`Local data and cache updated for servis ID: ${servisId}`)
  } catch (error) {
    console.error('Error updating local data and cache:', error)
  }
}

// PERBAIKAN: Fungsi untuk invalidate cache terkait
function invalidateRelatedCache(servisId) {
  try {
    if (!currentMonthYear) return

    const { month, year } = currentMonthYear

    // Hapus cache untuk laporan yang mungkin terpengaruh
    const reportCacheKeys = [
      `report_${month}_${year}`,
      `report_year_${year}`,
      `stats_${month}_${year}`,
    ]

    // Hapus cache terkait
    reportCacheKeys.forEach((key) => {
      if (localCache.has(key)) {
        console.log(`Invalidating related cache: ${key}`)
        clearCacheKey(key)
      }
    })

    // PERBAIKAN: Set timestamp untuk memaksa refresh pada query berikutnya
    updateCacheTimestamp(`month_${month}_${year}`, 0)
  } catch (error) {
    console.error('Error invalidating related cache:', error)
  }
}

// PERBAIKAN: Fungsi untuk notifikasi update servis
function notifyServisUpdate(servisId, updateData) {
  try {
    // Trigger custom event untuk notifikasi update
    const event = new CustomEvent('servisUpdated', {
      detail: {
        servisId: servisId,
        updateData: updateData,
        timestamp: Date.now(),
      },
    })
    window.dispatchEvent(event)

    // Update localStorage timestamp untuk tracking perubahan
    localStorage.setItem('lastServisUpdate', Date.now().toString())
    localStorage.setItem('lastServisUpdateId', servisId)
  } catch (error) {
    console.error('Error notifying servis update:', error)
  }
}

async function refreshData() {
  try {
    if (!currentMonthYear) return

    const { month, year } = currentMonthYear
    const cacheKey = `month_${month}_${year}`

    // PERBAIKAN: Clear specific cache untuk periode ini
    clearCacheKey(cacheKey)

    // Clear smart cache juga
    if (typeof smartServisCache !== 'undefined' && smartServisCache.clearKey) {
      smartServisCache.clearKey(cacheKey)
    }

    showCacheIndicator(false, 'Refreshing...')

    // Reload data fresh dari Firestore
    await loadServisData()

    showAlert('info', 'Data berhasil diperbarui dari server')
  } catch (error) {
    console.error('Error refreshing data:', error)
    showAlert('danger', 'Terjadi kesalahan saat memperbarui data: ' + error.message)
  }
}

function showLoading(show) {
  const refreshBtn = document.getElementById('refreshData')
  const tampilkanBtn = document.getElementById('tampilkanBtn')

  if (show) {
    document.body.style.cursor = 'wait'
    if (refreshBtn) {
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Loading...'
      refreshBtn.disabled = true
    }
    if (tampilkanBtn) {
      tampilkanBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Memuat...'
      tampilkanBtn.disabled = true
    }
  } else {
    document.body.style.cursor = 'default'
    if (refreshBtn) {
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh Data'
      refreshBtn.disabled = false
    }
    if (tampilkanBtn) {
      tampilkanBtn.innerHTML = '<i class="fas fa-search me-2"></i> Tampilkan'
      tampilkanBtn.disabled = false
    }
  }
}

function showCacheIndicator(isCache, customText = null) {
  const indicator = document.getElementById('cacheIndicator')
  if (indicator) {
    indicator.style.display = 'inline-block'

    if (customText === 'Live') {
      indicator.className = 'badge bg-success ms-2'
      indicator.innerHTML =
        '<i class="fas fa-circle fa-xs me-1" style="animation: pulse 1s infinite;"></i> Live'
    } else if (customText === 'Offline Mode') {
      indicator.className = 'badge bg-warning ms-2'
      indicator.innerHTML = '<i class="fas fa-wifi-slash me-1"></i> Offline'
    } else if (customText) {
      indicator.className = 'badge bg-info ms-2'
      indicator.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> ${customText}`
    } else if (isCache) {
      indicator.className = 'badge bg-info ms-2'
      indicator.innerHTML = '<i class="fas fa-database me-1"></i> Cache'
    } else {
      indicator.style.display = 'none'
    }
  }
}

function showAlert(type, message) {
  const alertContainer = document.getElementById('alertContainer')
  if (!alertContainer) return

  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      <i class="fas fa-${
        type === 'success'
          ? 'check-circle'
          : type === 'warning'
          ? 'exclamation-triangle'
          : type === 'danger'
          ? 'exclamation-circle'
          : 'info-circle'
      } me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `

  alertContainer.style.display = 'block'

  setTimeout(() => {
    const alert = alertContainer.querySelector('.alert')
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert)
      bsAlert.close()
    }
  }, 5000)
}

// PERBAIKAN: Handle filter logic
function handleFilterLogic() {
  const statusServisFilter = document.getElementById('statusServisFilter')
  const statusPengambilanFilter = document.getElementById('statusPengambilanFilter')

  if (statusServisFilter && statusPengambilanFilter) {
    // Jika status servis "Belum Selesai", paksa status pengambilan ke "Belum Diambil"
    if (statusServisFilter.value === 'Belum Selesai') {
      statusPengambilanFilter.value = 'Belum Diambil'
      statusPengambilanFilter.disabled = true
    } else {
      statusPengambilanFilter.disabled = false
    }
  }
}

// PERBAIKAN: Event listeners untuk sinkronisasi data
window.addEventListener('servisUpdated', function (event) {
  if (event.detail && event.detail.servisId) {
    console.log('Servis updated from another source:', event.detail.servisId)

    // Refresh data jika diperlukan
    const lastUpdate = localStorage.getItem('lastServisUpdate')
    const currentTime = Date.now()

    // Jika update terjadi dalam 30 detik terakhir, refresh data
    if (lastUpdate && currentTime - parseInt(lastUpdate) < 30000) {
      console.log('Refreshing data due to recent update')
      syncDataIfNeeded()
    }
  }
})

// PERBAIKAN: Cleanup saat window/tab ditutup
window.addEventListener('beforeunload', function () {
  // Save cache sebelum halaman ditutup
  saveServisCacheToStorage()

  // FASE 2: Cleanup real-time listener
  if (activeRealtimeListener) {
    unsubscribeFromUpdates()
    activeRealtimeListener = null
  }

  // FASE 1: Cancel ongoing fetch
  cancelOngoingFetch()
})

// PERBAIKAN: Periodic cache cleanup
setInterval(() => {
  cleanOldServisCacheEntries()
}, 60 * 60 * 1000) // Cleanup setiap 1 jam

// PERBAIKAN: Enhanced data loading dengan preloading
async function loadServisDataEnhanced() {
  try {
    showLoading(true)

    const month = parseInt(document.getElementById('monthSelector').value)
    const year = parseInt(document.getElementById('yearSelector').value)

    // Set current month/year untuk tracking
    currentMonthYear = { month, year }

    // Load data dengan optimasi cache
    currentData = await getServisDataOptimized(month, year)

    // Preload data bulan adjacent di background
    preloadAdjacentMonths(month, year)

    // Reset search
    const searchInput = document.getElementById('searchInputTable')
    if (searchInput) {
      searchInput.value = ''
    }

    // Update tracking data count
    lastKnownDataCount = currentData.length

    // Set flag bahwa data sudah loaded
    isDataLoaded = true

    // Apply filters setelah data loaded
    applyFilters()

    // Show cache indicator
    const cacheKey = `month_${month}_${year}`
    const isFromCache = localCache.has(cacheKey) && !shouldUpdateCache(cacheKey)
    showCacheIndicator(isFromCache)

    showLoading(false)
  } catch (error) {
    console.error('Error loading enhanced servis data:', error)
    showAlert('danger', 'Terjadi kesalahan saat memuat data: ' + error.message)
    showLoading(false)
    isDataLoaded = false
  }
}

// PERBAIKAN: Optimized data fetching
async function getServisDataOptimized(month, year, forceRefresh = false) {
  try {
    const cacheKey = `month_${month}_${year}`

    // Cek apakah perlu refresh berdasarkan TTL atau forceRefresh
    const needRefresh = forceRefresh || shouldUpdateCache(cacheKey)

    // Jika tidak perlu refresh dan data ada di cache, gunakan cache
    if (!needRefresh && localCache.has(cacheKey)) {
      console.log(`Using optimized cache for ${month}/${year}`)
      const cached = localCache.get(cacheKey)
      return cached.data
    }

    // Fetch data dari Firestore
    console.log(`Fetching optimized data for ${month}/${year}`)
    const data = await getServisByMonth(month, year)

    // Update cache
    setCachedData(cacheKey, data)

    // Save to localStorage
    saveServisCacheToStorage()

    return data
  } catch (error) {
    console.error('Error getting optimized servis data:', error)
    throw error
  }
}

// PERBAIKAN: Preload adjacent months data
async function preloadAdjacentMonths(currentMonth, currentYear) {
  try {
    const adjacentMonths = []

    // Bulan sebelumnya
    let prevMonth = currentMonth - 1
    let prevYear = currentYear
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear--
    }
    adjacentMonths.push({ month: prevMonth, year: prevYear })

    // Bulan selanjutnya
    let nextMonth = currentMonth + 1
    let nextYear = currentYear
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear++
    }
    adjacentMonths.push({ month: nextMonth, year: nextYear })

    // Preload data di background
    adjacentMonths.forEach(async ({ month, year }) => {
      const cacheKey = `month_${month}_${year}`
      if (!localCache.has(cacheKey)) {
        try {
          console.log(`Preloading data for ${month}/${year}`)
          const data = await getServisByMonth(month, year)
          setCachedData(cacheKey, data)
        } catch (error) {
          console.log(`Failed to preload data for ${month}/${year}:`, error.message)
        }
      }
    })
  } catch (error) {
    console.error('Error preloading adjacent months:', error)
  }
}

// PERBAIKAN: Monitor untuk data baru dari input-servis
function setupNewDataMonitoring() {
  // Listen untuk perubahan di localStorage yang menandakan data baru
  window.addEventListener('storage', function (e) {
    if (e.key === 'newServisDataAdded' && e.newValue === 'true') {
      console.log('New servis data detected from input-servis')

      // Reset flag
      localStorage.removeItem('newServisDataAdded')

      // Sync data jika sedang menampilkan data
      if (isDataLoaded && currentMonthYear) {
        syncDataIfNeeded()
      }
    }

    if (e.key === 'lastServisInputTime') {
      console.log('New servis input detected')

      // Sync data dengan delay untuk memastikan data sudah tersimpan
      setTimeout(() => {
        if (isDataLoaded && currentMonthYear) {
          syncDataIfNeeded()
        }
      }, 2000) // Delay 2 detik
    }
  })

  // Periodic check untuk data baru (fallback)
  setInterval(() => {
    if (isDataLoaded && currentMonthYear) {
      const lastInputTime = localStorage.getItem('lastServisInputTime')
      if (lastInputTime) {
        const inputTime = parseInt(lastInputTime)
        const timeDiff = Date.now() - inputTime

        // Jika ada input dalam 1 menit terakhir dan belum di-sync
        if (timeDiff < 60 * 1000 && timeDiff > lastDataCheck) {
          console.log('Periodic sync triggered by recent input')
          syncDataIfNeeded()
          lastDataCheck = Date.now()
        }
      }
    }
  }, 30 * 1000) // Check setiap 30 detik
}

// PERBAIKAN: Debug functions untuk development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  window.debugServisCache = function () {
    console.group('Servis Cache Debug Information')
    console.log('Local Cache Size:', localCache.size)
    console.log('Cache Meta Size:', cacheMeta.size)
    console.log('Cache Keys:', Array.from(localCache.keys()))
    console.log('Current Data Count:', currentData.length)
    console.log('Last Known Data Count:', lastKnownDataCount)
    console.log('Current Month/Year:', currentMonthYear)
    console.log('Is Data Loaded:', isDataLoaded)
    console.groupEnd()
  }

  window.forceDataSync = function () {
    console.log('Forcing data sync...')
    syncDataIfNeeded()
  }

  window.clearAllServisCache = function () {
    localCache.clear()
    cacheMeta.clear()
    localStorage.removeItem('servisCache')
    localStorage.removeItem('servisCacheMeta')
    console.log('All servis cache cleared')
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

// Export functions yang mungkin diperlukan
export {
  loadServisDataEnhanced as loadServisData,
  syncDataIfNeeded,
  getCachedData,
  setCachedData,
  clearCacheKey,
}
