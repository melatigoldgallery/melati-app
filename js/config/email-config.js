// Email Configuration for Melati Gold Shop
// Konfigurasi email untuk notifikasi pengajuan izin

const EMAIL_CONFIG = {
  // EmailJS Configuration - Ganti dengan credential EmailJS Anda
  emailjs: {
    serviceId: "service_7z4mkqi",
    templateId: "template_b3bfqkn",
    publicKey: "_V73-LdbNjkhq639I", // Ganti dengan public key EmailJS Anda
  },

  // Target Email untuk notifikasi
  notifications: {
    primary: "fattahula98@gmail.com", // Email HRD utama
    backup: "admin@melatigoldshop.com", // Email backup (opsional)
  },

  // Email Settings
  settings: {
    retryAttempts: 3,
    timeoutMs: 10000,
    enableBackup: false, // Set true jika ingin kirim ke backup email
  },

  // Validasi domain email yang diizinkan
  allowedDomains: ["melatigoldshop.com", "gmail.com", "yahoo.com"],
};

// Fungsi untuk validasi email
function validateEmailDomain(email) {
  if (!email || !email.includes("@")) return false;

  const domain = email.split("@")[1];
  return EMAIL_CONFIG.allowedDomains.includes(domain);
}

// Export untuk digunakan di module lain
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EMAIL_CONFIG, validateEmailDomain };
}
