// File ini menangani kontrol akses menu berdasarkan role pengguna
import { authService } from './configFirebase.js';

// Fungsi untuk memeriksa apakah pengguna adalah admin
async function isAdmin() {
    try {
        // Gunakan pendekatan yang lebih langsung dan konsisten
        const sessionUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

        // Periksa username dan role
        const isAdminUser = sessionUser.username === 'adminmelati' || sessionUser.role === 'admin';

        return isAdminUser;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// Fungsi untuk menyembunyikan menu supervisor dengan pendekatan yang lebih kuat
async function setupMenuVisibility() {
    const adminAccess = await isAdmin();

    if (!adminAccess) {

        // Pendekatan 1: Tambahkan CSS dengan !important
        const style = document.createElement('style');
        style.textContent = `
            .supervisor-toggle, .supervisor-menu, #supervisorSubmenu, .edit-btn, #exportExcelBtn, #deleteDataBtn, #hapusData, .aksi {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                overflow: hidden !important;
                position: absolute !important;
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);

        // Pendekatan 2: Hapus elemen dari DOM
        const supervisorElements = document.querySelectorAll('.supervisor-toggle, .supervisor-menu, #supervisorSubmenu');

        supervisorElements.forEach(element => {
            try {
                // Hapus elemen dari DOM
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            } catch (e) {
                console.error("Error removing element:", e);
            }
        });
    } else {
        console.log("User is admin, keeping supervisor menu visible");
    }
}

// Jalankan setup dengan delay untuk memastikan DOM sudah siap sepenuhnya
document.addEventListener('DOMContentLoaded', function() {
    // Tunggu sedikit lebih lama untuk memastikan Bootstrap selesai
    setTimeout(setupMenuVisibility, 300);
});

// Export fungsi untuk digunakan di file lain jika diperlukan
export { isAdmin, setupMenuVisibility };
