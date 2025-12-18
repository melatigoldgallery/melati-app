import {
  getServisDataForExport,
  exportToExcel,
  downloadPhotosAsZip,
  batchDeleteData,
  getStorageEstimate,
} from '../services/export-service.js'

let currentData = []
let exportCompleted = false
let zipCompleted = false

// Helper function to safely convert tanggal to Date
function toDate(timestamp) {
  if (!timestamp) return new Date()
  if (timestamp.toDate) return timestamp.toDate()
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000)
  if (timestamp instanceof Date) return timestamp
  return new Date(timestamp)
}

// Set default dates (today)
const today = new Date()

document.getElementById('startDate').value = today.toISOString().split('T')[0]
document.getElementById('endDate').value = today.toISOString().split('T')[0]

// Load data
document.getElementById('loadDataBtn').addEventListener('click', async () => {
  const startDate = document.getElementById('startDate').value
  const endDate = document.getElementById('endDate').value

  console.log('Load Data Button Clicked')
  console.log('Selected dates:', { startDate, endDate })

  if (!startDate || !endDate) {
    Swal.fire('Error', 'Pilih tanggal mulai dan akhir', 'error')
    return
  }

  try {
    showLoading(true)
    console.log('Fetching data from Firestore...')
    currentData = await getServisDataForExport(startDate, endDate)
    console.log('Data received:', currentData.length, 'items')

    if (currentData.length === 0) {
      console.warn('No data found with bukti pengambilan')
      Swal.fire('Info', 'Tidak ada data dengan bukti pengambilan di periode ini', 'info')
      hideCards()
      return
    }

    console.log('Data found! Displaying preview...')

    // Show data info
    const estimate = getStorageEstimate(currentData)
    document.getElementById('dataCount').textContent = currentData.length
    document.getElementById('photoCount').textContent = estimate.photoCount
    document.getElementById('storageSize').textContent = estimate.formattedSize
    document.getElementById('dataInfo').style.display = 'block'

    // Show preview
    displayPreview(currentData)
    document.getElementById('previewCard').style.display = 'block'
    document.getElementById('actionCard').style.display = 'block'

    // Reset action status
    exportCompleted = false
    zipCompleted = false
    updateDeleteButton()

    showLoading(false)
  } catch (error) {
    console.error(error)
    Swal.fire('Error', error.message, 'error')
    showLoading(false)
  }
})

// Export Excel
document.getElementById('exportExcelBtn').addEventListener('click', async () => {
  if (currentData.length === 0) return

  try {
    const startDate = document.getElementById('startDate').value
    const endDate = document.getElementById('endDate').value
    const filename = `export-bukti-${startDate}_${endDate}.xlsx`

    await exportToExcel(currentData, filename)
    exportCompleted = true
    updateDeleteButton()

    Swal.fire({
      icon: 'success',
      title: 'Export Berhasil',
      text: 'File Excel berhasil didownload',
      timer: 2000,
    })
  } catch (error) {
    console.error(error)
    Swal.fire('Error', error.message, 'error')
  }
})

// Download ZIP
document.getElementById('downloadZipBtn').addEventListener('click', async () => {
  if (currentData.length === 0) return

  try {
    showProgress('Mengunduh dan mengompres foto...')

    const startDate = document.getElementById('startDate').value
    const endDate = document.getElementById('endDate').value
    const filename = `bukti-pengambilan-${startDate}_${endDate}.zip`

    await downloadPhotosAsZip(currentData, filename, (completed, total) => {
      const percent = Math.round((completed / total) * 100)
      updateProgress(percent, `Mengunduh foto ${completed}/${total}`)
    })

    hideProgress()
    zipCompleted = true
    updateDeleteButton()

    Swal.fire({
      icon: 'success',
      title: 'Download Berhasil',
      text: 'File ZIP berhasil didownload',
      timer: 2000,
    })
  } catch (error) {
    console.error(error)
    hideProgress()
    Swal.fire('Error', error.message, 'error')
  }
})

// Delete data
document.getElementById('deleteDataBtn').addEventListener('click', async () => {
  if (currentData.length === 0) return

  const result = await Swal.fire({
    title: 'Konfirmasi Hapus',
    html: `Anda akan menghapus <strong>${currentData.length} data</strong> beserta foto dari database dan storage.<br><br>
           <span class="text-danger">Tindakan ini TIDAK BISA dibatalkan!</span><br><br>
           Pastikan file Excel dan ZIP sudah tersimpan dengan aman.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
    input: 'checkbox',
    inputPlaceholder: 'Saya sudah backup data Excel dan ZIP',
  })

  if (!result.isConfirmed || !result.value) {
    if (result.isConfirmed) {
      Swal.fire('Info', 'Centang checkbox untuk konfirmasi', 'info')
    }
    return
  }

  try {
    showProgress('Menghapus data dan foto...')

    const dataIds = currentData.map((item) => item.id)
    const deleteResult = await batchDeleteData(dataIds, (completed, total) => {
      const percent = Math.round((completed / total) * 100)
      updateProgress(percent, `Menghapus ${completed}/${total}`)
    })

    hideProgress()

    await Swal.fire({
      icon: 'success',
      title: 'Hapus Berhasil',
      html: `<strong>${deleteResult.deleted}</strong> data berhasil dihapus<br>
             <strong>${deleteResult.deletedPhotos}</strong> foto dihapus dari storage<br>
             ${
               deleteResult.failed > 0
                 ? `<span class="text-warning">${deleteResult.failed} gagal dihapus</span>`
                 : ''
             }`,
      timer: 3000,
    })

    // Reset
    currentData = []
    hideCards()
    document.getElementById('dataInfo').style.display = 'none'
  } catch (error) {
    console.error(error)
    hideProgress()
    Swal.fire('Error', error.message, 'error')
  }
})

function displayPreview(data) {
  const tbody = document.getElementById('previewTableBody')
  tbody.innerHTML = ''

  data.forEach((item, index) => {
    const row = document.createElement('tr')
    const tanggalDate = toDate(item.tanggal)
    const waktuPengambilanDate = item.waktuPengambilan ? toDate(item.waktuPengambilan) : null

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${tanggalDate.toLocaleDateString('id-ID')}</td>
      <td>${item.namaCustomer}</td>
      <td>${item.namaBarang}</td>
      <td>${waktuPengambilanDate ? waktuPengambilanDate.toLocaleString('id-ID') : '-'}</td>
      <td>
        <a href="${item.buktiPengambilanUrl}" target="_blank" class="btn btn-sm btn-info">
          <i class="fas fa-image"></i>
        </a>
      </td>
    `
    tbody.appendChild(row)
  })
}

function updateDeleteButton() {
  const btn = document.getElementById('deleteDataBtn')
  btn.disabled = !(exportCompleted && zipCompleted)

  if (exportCompleted && zipCompleted) {
    btn.classList.remove('btn-secondary')
    btn.classList.add('btn-danger')
  }
}

function hideCards() {
  document.getElementById('previewCard').style.display = 'none'
  document.getElementById('actionCard').style.display = 'none'
}

function showProgress(text) {
  document.getElementById('progressContainer').style.display = 'block'
  document.getElementById('progressBar').style.width = '0%'
  document.getElementById('progressBar').textContent = '0%'
  document.getElementById('progressText').textContent = text
}

function updateProgress(percent, text) {
  document.getElementById('progressBar').style.width = percent + '%'
  document.getElementById('progressBar').textContent = percent + '%'
  document.getElementById('progressText').textContent = text
}

function hideProgress() {
  document.getElementById('progressContainer').style.display = 'none'
}

function showLoading(show) {
  const btn = document.getElementById('loadDataBtn')
  if (show) {
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Memuat...'
  } else {
    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-search me-2"></i>Muat Data'
  }
}
