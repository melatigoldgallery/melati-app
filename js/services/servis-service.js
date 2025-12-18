// Firebase imports
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js'
import { db } from '../configFirebase.js'

// Collection reference
const SERVIS_COLLECTION = 'servis'

// Cache untuk optimasi reads
const servisCache = new Map()
const CACHE_EXPIRATION = 5 * 60 * 1000 // 5 menit

// Smart cache system dengan optimasi reads dan LocalStorage persistence
export const smartServisCache = {
  data: new Map(),
  timestamps: new Map(),
  STORAGE_KEY: 'servis_cache_v1',

  // Dynamic cache duration berdasarkan bulan
  getCacheDuration(month, year) {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Bulan lalu atau lebih lama = cache permanent (data immutable)
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return Infinity // Permanent cache
    }

    // Bulan ini = cache 5 menit (data masih bisa berubah)
    if (year === currentYear && month === currentMonth) {
      return 5 * 60 * 1000 // 5 menit
    }

    // Bulan depan = cache 2 jam
    return 2 * 60 * 60 * 1000 // 2 jam
  },

  // Load cache dari LocalStorage saat init
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.data = new Map(parsed.data)
        this.timestamps = new Map(parsed.timestamps)
        console.log(`Loaded ${this.data.size} cached entries from storage`)
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }
  },

  // Save cache ke LocalStorage
  saveToStorage() {
    try {
      const toStore = {
        data: Array.from(this.data.entries()),
        timestamps: Array.from(this.timestamps.entries()),
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore))
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  },

  get(key) {
    const cached = this.data.get(key)
    const timestamp = this.timestamps.get(key)

    if (!cached || !timestamp) return null

    // Extract month/year dari cache key (format: servis_MM_YYYY)
    const match = key.match(/servis_(\d+)_(\d+)/)
    if (match) {
      const month = parseInt(match[1])
      const year = parseInt(match[2])
      const duration = this.getCacheDuration(month, year)

      if (Date.now() - timestamp < duration) {
        console.log(
          `✓ Cache hit: ${key} (age: ${Math.round((Date.now() - timestamp) / 1000)}s, valid: ${
            duration === Infinity ? 'permanent' : Math.round(duration / 1000) + 's'
          })`
        )
        return cached
      } else {
        console.log(`✗ Cache expired: ${key}`)
        return null
      }
    }

    return null
  },

  set(key, value) {
    this.data.set(key, [...value])
    this.timestamps.set(key, Date.now())
    this.saveToStorage() // Persist ke LocalStorage

    const match = key.match(/servis_(\d+)_(\d+)/)
    const duration = match ? this.getCacheDuration(parseInt(match[1]), parseInt(match[2])) : '5 min'
    console.log(
      `✓ Cache saved: ${key} (${value.length} items, duration: ${
        duration === Infinity ? 'permanent' : Math.round(duration / 60000) + ' min'
      })`
    )
  },

  clearKey(key) {
    this.data.delete(key)
    this.timestamps.delete(key)
    this.saveToStorage()
    console.log(`Cache cleared: ${key}`)
  },

  clearAll() {
    this.data.clear()
    this.timestamps.clear()
    localStorage.removeItem(this.STORAGE_KEY)
    console.log('All cache cleared')
  },

  // Clear cache untuk bulan tertentu (useful saat ada update data)
  clearMonth(month, year) {
    const keyPattern = `servis_${month}_${year}`
    let cleared = 0

    this.data.forEach((_, key) => {
      if (key.includes(keyPattern)) {
        this.clearKey(key)
        cleared++
      }
    })

    console.log(`Cleared ${cleared} cache entries for ${month}/${year}`)
  },
}

// Load cache from LocalStorage on init
smartServisCache.loadFromStorage()

// Enhanced broadcast system
function broadcastDataChange(action, data) {
  try {
    const event = {
      action, // 'add', 'update', 'delete', 'batch-delete'
      data,
      timestamp: Date.now(),
      source: 'servis-service',
    }

    // Broadcast ke localStorage untuk cross-tab sync
    localStorage.setItem('servisDataChange', JSON.stringify(event))

    // Remove event dari localStorage setelah broadcast (cleanup)
    setTimeout(() => localStorage.removeItem('servisDataChange'), 1000)

    // Trigger custom event untuk same-tab
    window.dispatchEvent(new CustomEvent('servisDataChanged', { detail: event }))

    console.log(`📢 Broadcast ${action}:`, data.id || `${data.length} items`)
  } catch (error) {
    console.error('Error broadcasting:', error)
  }
}

// Listen to cross-tab broadcasts
window.addEventListener('storage', (e) => {
  if (e.key === 'servisDataChange' && e.newValue) {
    try {
      const event = JSON.parse(e.newValue)
      if (event.source !== 'servis-service') return

      console.log(`📡 Received cross-tab event: ${event.action}`)
      window.dispatchEvent(new CustomEvent('servisDataChanged', { detail: event }))
    } catch (error) {
      console.error('Error parsing storage event:', error)
    }
  }
})

// Fungsi untuk menghapus multiple data servis
export async function deleteMultipleServisData(docIds) {
  try {
    const deletePromises = docIds.map((docId) => deleteDoc(doc(db, SERVIS_COLLECTION, docId)))

    await Promise.all(deletePromises)

    // Update cache dan broadcast
    updateCacheAfterMultipleDelete(docIds)
    broadcastDataChange('batch-delete', { ids: docIds, count: docIds.length })

    return true
  } catch (error) {
    console.error('Error deleting multiple servis data:', error)
    throw error
  }
}

// Server-side filtering dengan Firestore query
export async function getServisByMonthWithFilters(
  month,
  year,
  statusServis = '',
  statusPengambilan = ''
) {
  try {
    const cacheKey = `servis_${month}_${year}_${statusServis}_${statusPengambilan}`

    // Cek smartCache
    const cachedData = smartServisCache.get(cacheKey)
    if (cachedData) return cachedData

    console.log(`⚡ Fetching filtered data from Firestore: ${month}/${year}`)
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`

    // Build query dengan server-side filters
    let constraints = [where('tanggal', '>=', startDate), where('tanggal', '<=', endDate)]

    // Add status filters jika ada (server-side)
    if (statusServis) {
      constraints.push(where('statusServis', '==', statusServis))
    }
    if (statusPengambilan) {
      constraints.push(where('statusPengambilan', '==', statusPengambilan))
    }

    constraints.push(orderBy('tanggal', 'desc'))

    const q = query(collection(db, SERVIS_COLLECTION), ...constraints)
    const querySnapshot = await getDocs(q)

    const servisData = []
    querySnapshot.forEach((doc) => {
      servisData.push({ id: doc.id, ...doc.data() })
    })

    // Simpan ke smartCache
    smartServisCache.set(cacheKey, servisData)
    console.log(`✓ Filtered query: ${servisData.length} records (${querySnapshot.size} reads)`)

    return servisData
  } catch (error) {
    console.error('Error getting filtered servis data:', error)
    throw error
  }
}

// Fungsi untuk update cache setelah multiple delete
function updateCacheAfterMultipleDelete(docIds) {
  // Clear smart cache untuk bulan yang terpengaruh
  docIds.forEach((docId) => {
    // Extract month/year dari data yang dihapus jika perlu
    // Untuk sekarang, clear cache bulan ini
    const now = new Date()
    smartServisCache.clearMonth(now.getMonth() + 1, now.getFullYear())
  })

  // Legacy cache update
  servisCache.forEach((cached, key) => {
    if (cached.data) {
      const filteredArray = cached.data.filter((item) => !docIds.includes(item.id))
      servisCache.set(key, {
        data: filteredArray,
        timestamp: Date.now(),
      })
    }
  })
}

// Tambahkan fungsi update servis data
export async function updateServisData(servisId, updateData) {
  try {
    const servisRef = doc(db, SERVIS_COLLECTION, servisId)
    const dataToUpdate = {
      ...updateData,
      updatedAt: Timestamp.now(),
    }

    await updateDoc(servisRef, dataToUpdate)

    // Clear cache bulan ini saat ada update
    const now = new Date()
    smartServisCache.clearMonth(now.getMonth() + 1, now.getFullYear())

    // Broadcast update event
    broadcastDataChange('update', { id: servisId, ...dataToUpdate })

    return true
  } catch (error) {
    console.error('Error updating servis data:', error)
    throw error
  }
}

// Fungsi untuk update cache secara spesifik
function updateCacheAfterEdit(docId, updatedData) {
  servisCache.forEach((cached, key) => {
    if (key.startsWith('date_') && cached.data) {
      const updatedArray = cached.data.map((item) =>
        item.id === docId ? { ...item, ...updatedData } : item
      )
      servisCache.set(key, {
        data: updatedArray,
        timestamp: Date.now(),
      })
    }
  })
}

// Tambahkan function ini di file servis-service.js
export async function deleteServisData(servisId) {
  try {
    const servisRef = doc(db, SERVIS_COLLECTION, servisId)
    await deleteDoc(servisRef)

    // Clear cache bulan ini saat ada delete
    const now = new Date()
    smartServisCache.clearMonth(now.getMonth() + 1, now.getFullYear())

    // Broadcast delete event
    broadcastDataChange('delete', { id: servisId })

    return true
  } catch (error) {
    console.error('Error deleting servis data:', error)
    throw error
  }
}

// Fungsi untuk update cache setelah delete
function updateCacheAfterDelete(docId) {
  servisCache.forEach((cached, key) => {
    if (key.startsWith('date_') && cached.data) {
      const filteredArray = cached.data.filter((item) => item.id !== docId)
      servisCache.set(key, {
        data: filteredArray,
        timestamp: Date.now(),
      })
    }
  })
}

// Fungsi untuk menyimpan data servis
export async function saveServisData(servisData) {
  try {
    const docRef = await addDoc(collection(db, SERVIS_COLLECTION), {
      ...servisData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      statusServis: 'Belum Selesai',
      statusPengambilan: 'Belum Diambil',
      stafHandle: null,
      waktuPengambilan: null,
    })

    // Update cache secara spesifik
    const newData = {
      id: docRef.id,
      ...servisData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      statusServis: 'Belum Selesai',
      statusPengambilan: 'Belum Diambil',
      stafHandle: null,
      waktuPengambilan: null,
    }

    updateCacheAfterAdd(newData)

    return docRef.id
  } catch (error) {
    console.error('Error saving servis data:', error)
    throw error
  }
}

// Fungsi untuk update cache setelah add
function updateCacheAfterAdd(newData) {
  const dateKey = `date_${newData.tanggal}`
  if (servisCache.has(dateKey)) {
    const cached = servisCache.get(dateKey)
    cached.data.unshift(newData) // Tambah di awal array
    servisCache.set(dateKey, {
      data: cached.data,
      timestamp: Date.now(),
    })
  }
}

// Fungsi untuk mengambil data servis berdasarkan tanggal
export async function getServisByDate(date) {
  try {
    const cacheKey = `date_${date}`

    // Cek cache terlebih dahulu
    if (servisCache.has(cacheKey)) {
      const cached = servisCache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_EXPIRATION) {
        console.log('Using cached data for date:', date)
        return cached.data
      }
    }

    // Create date range to support both ISO string and date string formats
    const startDate = `${date}T00:00:00`
    const endDate = `${date}T23:59:59`

    const q = query(
      collection(db, SERVIS_COLLECTION),
      where('tanggal', '>=', date),
      where('tanggal', '<=', endDate),
      orderBy('tanggal', 'asc'),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    const servisData = []

    querySnapshot.forEach((doc) => {
      servisData.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    // Simpan ke cache
    servisCache.set(cacheKey, {
      data: servisData,
      timestamp: Date.now(),
    })

    console.log(`Loaded ${servisData.length} servis records for date:`, date)
    return servisData
  } catch (error) {
    console.error('Error getting servis by date:', error)
    throw error
  }
}

// Fungsi untuk mengambil data servis berdasarkan bulan dan tahun
export async function getServisByMonth(month, year, statusPengambilan = 'all') {
  try {
    const cacheKey = `servis_${month}_${year}_${statusPengambilan}`

    // Cek smartCache terlebih dahulu (dengan LocalStorage persistence)
    const cachedData = smartServisCache.get(cacheKey)
    if (cachedData) {
      return cachedData
    }

    console.log(`⚡ Fetching from Firestore: ${month}/${year}`)
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`

    let q = query(
      collection(db, SERVIS_COLLECTION),
      where('tanggal', '>=', startDate),
      where('tanggal', '<=', endDate),
      orderBy('tanggal', 'desc')
    )

    const querySnapshot = await getDocs(q)
    let servisData = []

    querySnapshot.forEach((doc) => {
      servisData.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    // Filter berdasarkan status pengambilan jika diperlukan
    if (statusPengambilan !== 'all') {
      servisData = servisData.filter((item) => item.statusPengambilan === statusPengambilan)
    }

    // Simpan ke smartCache dengan LocalStorage persistence
    smartServisCache.set(cacheKey, servisData)

    console.log(
      `✓ Loaded ${servisData.length} servis records (${querySnapshot.size} reads) for ${month}/${year}`
    )
    return servisData
  } catch (error) {
    console.error('Error getting servis by month:', error)
    throw error
  }
}

// Real-time listener management
let activeListener = null

// Subscribe ke real-time updates untuk bulan tertentu
export function subscribeToMonthUpdates(month, year, onUpdate) {
  // Unsubscribe listener sebelumnya jika ada
  if (activeListener) {
    activeListener()
    console.log('🔌 Previous listener detached')
  }

  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`

  const q = query(
    collection(db, SERVIS_COLLECTION),
    where('tanggal', '>=', startDate),
    where('tanggal', '<=', endDate),
    orderBy('tanggal', 'desc')
  )

  activeListener = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const fromCache = snapshot.metadata.fromCache

    if (!fromCache && !snapshot.metadata.hasPendingWrites) {
      const servisData = []
      snapshot.forEach((doc) => {
        servisData.push({ id: doc.id, ...doc.data() })
      })

      console.log(
        `🔄 Real-time update: ${servisData.length} records (${
          snapshot.docChanges().length
        } changes)`
      )
      onUpdate(servisData, snapshot.docChanges())
    }
  })

  console.log(`📡 Subscribed to real-time updates for ${month}/${year}`)
  return activeListener
}

// Unsubscribe dari real-time updates
export function unsubscribeFromUpdates() {
  if (activeListener) {
    activeListener()
    activeListener = null
    console.log('🔌 Listener detached')
  }
}

// Fungsi untuk search data servis
export async function searchServis(searchTerm, date = null) {
  try {
    let q

    if (date) {
      q = query(
        collection(db, SERVIS_COLLECTION),
        where('tanggal', '==', date),
        orderBy('createdAt', 'desc')
      )
    } else {
      q = query(
        collection(db, SERVIS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(100) // Batasi hasil untuk efisiensi
      )
    }

    const querySnapshot = await getDocs(q)
    let servisData = []

    querySnapshot.forEach((doc) => {
      servisData.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    // Filter berdasarkan search term di client side
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      servisData = servisData.filter(
        (item) =>
          item.namaCustomer?.toLowerCase().includes(term) ||
          item.noHp?.includes(term) ||
          item.namaBarang?.toLowerCase().includes(term)
      )
    }

    return servisData
  } catch (error) {
    console.error('Error searching servis:', error)
    throw error
  }
}

// Fungsi untuk update status servis
export async function updateServisStatus(
  servisId,
  statusServis,
  statusPengambilan,
  stafHandle = null,
  waktuPengambilan = null,
  buktiPengambilanUrl = null,
  buktiPengambilanPath = null
) {
  try {
    const servisRef = doc(db, SERVIS_COLLECTION, servisId)

    const updateData = {
      statusServis,
      statusPengambilan,
      updatedAt: Timestamp.now(),
    }

    if (statusPengambilan === 'Sudah Diambil' && stafHandle && waktuPengambilan) {
      updateData.stafHandle = stafHandle
      updateData.waktuPengambilan = Timestamp.fromDate(new Date(waktuPengambilan))

      // Add photo URL and path if provided
      if (buktiPengambilanUrl) {
        updateData.buktiPengambilanUrl = buktiPengambilanUrl
      }
      if (buktiPengambilanPath) {
        updateData.buktiPengambilanPath = buktiPengambilanPath
      }
    } else if (statusPengambilan === 'Belum Diambil') {
      updateData.stafHandle = null
      updateData.waktuPengambilan = null
      updateData.buktiPengambilanUrl = null
      updateData.buktiPengambilanPath = null
    }

    await updateDoc(servisRef, updateData)

    // Broadcast status update event
    broadcastDataChange('update', { id: servisId, ...updateData })

    return true
  } catch (error) {
    console.error('Error updating servis status:', error)
    throw error
  }
}

// Fungsi untuk update cache setelah status update
function updateCacheAfterStatusUpdate(docId, updateData) {
  servisCache.forEach((cached, key) => {
    if (cached.data) {
      const updatedArray = cached.data.map((item) =>
        item.id === docId ? { ...item, ...updateData } : item
      )
      servisCache.set(key, {
        data: updatedArray,
        timestamp: Date.now(),
      })
    }
  })
}

// Tambahkan fungsi untuk filter data dengan cache key yang lebih spesifik
export async function getServisByDateWithFilters(date, statusServis = '', statusPengambilan = '') {
  try {
    const cacheKey = `date_${date}_${statusServis}_${statusPengambilan}`

    // Cek cache terlebih dahulu
    if (servisCache.has(cacheKey)) {
      const cached = servisCache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_EXPIRATION) {
        console.log('Using cached filtered data for date:', date)
        return cached.data
      }
    }

    // Ambil data dasar dari cache atau firestore
    let baseData = await getServisByDate(date)

    // Filter data berdasarkan status
    let filteredData = baseData

    if (statusServis) {
      filteredData = filteredData.filter((item) => item.statusServis === statusServis)
    }

    if (statusPengambilan) {
      filteredData = filteredData.filter((item) => item.statusPengambilan === statusPengambilan)
    }

    // Simpan hasil filter ke cache
    servisCache.set(cacheKey, {
      data: filteredData,
      timestamp: Date.now(),
    })

    return filteredData
  } catch (error) {
    console.error('Error getting filtered servis data:', error)
    throw error
  }
}

// Fungsi untuk clear cache
export function clearServisCache() {
  servisCache.clear()
}
