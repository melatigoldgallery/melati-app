// Email Notification Service for Leave Requests
// Service untuk mengirim notifikasi email pengajuan izin

class EmailNotificationService {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  // Inisialisasi EmailJS
  init() {
    try {
      if (typeof emailjs === "undefined") {
        console.warn("EmailJS library not loaded");
        return false;
      }

      emailjs.init(EMAIL_CONFIG.emailjs.publicKey);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize EmailJS:", error);
      return false;
    }
  }

  // Format data pengajuan izin untuk email
  formatLeaveRequestData(leaveData) {
    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const dayCount = this.calculateDays(leaveData.startDate, leaveData.endDate);

    // Format data sesuai dengan template EmailJS
    return {
      // Variables untuk template EmailJS
      employee_id: leaveData.employeeId || "",
      employee_name: leaveData.employeeName || "Karyawan",
      leave_type: leaveData.leaveType || "",
      start_date: formatDate(leaveData.startDate),
      end_date: formatDate(leaveData.endDate),
      day_count: dayCount,
      reason: leaveData.reason || "Tidak ada alasan",
      submission_time: new Date().toLocaleString("id-ID"),

      // Variables untuk Contact Us fallback (jika diperlukan)
      from_name: leaveData.employeeName || "Karyawan",
      from_email: EMAIL_CONFIG.notifications.primary,
      subject: `Pengajuan Izin Baru - ${leaveData.employeeName} - ${formatDate(leaveData.startDate)}`,
      message: `Pengajuan izin ${leaveData.leaveType} dari ${leaveData.employeeName} (${leaveData.employeeId})`,
    };
  }

  // Hitung jumlah hari
  calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Kirim notifikasi email
  async sendLeaveRequestNotification(leaveData) {
    if (!this.isInitialized) {
      throw new Error("EmailJS not initialized");
    }

    try {
      const emailData = this.formatLeaveRequestData(leaveData);

      console.log("� Sending leave request notification...");

      const response = await emailjs.send(
        EMAIL_CONFIG.emailjs.serviceId,
        EMAIL_CONFIG.emailjs.templateId,
        emailData,
        EMAIL_CONFIG.emailjs.publicKey
      );

      console.log("✅ Email notification sent successfully");
      return {
        success: true,
        message: "Notifikasi email berhasil dikirim ke HRD",
        response: response,
      };
    } catch (error) {
      console.error("❌ Failed to send email notification:", error);

      // Retry jika bukan error konfigurasi
      if (error.status !== 400 && error.status !== 422) {
        return await this.retryEmailSend(leaveData, 1);
      }

      throw new Error(`Gagal mengirim email: ${error.text || error.message}`);
    }
  }

  // Retry pengiriman email
  async retryEmailSend(leaveData, attempt) {
    if (attempt > EMAIL_CONFIG.settings.retryAttempts) {
      throw new Error("Gagal mengirim email setelah beberapa percobaan");
    }

    console.log(`🔄 Retrying email send, attempt ${attempt}...`);

    // Delay sebelum retry
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));

    try {
      const emailData = this.formatLeaveRequestData(leaveData);
      const response = await emailjs.send(
        EMAIL_CONFIG.emailjs.serviceId,
        EMAIL_CONFIG.emailjs.templateId,
        emailData,
        EMAIL_CONFIG.emailjs.publicKey
      );

      return {
        success: true,
        message: `Notifikasi email berhasil dikirim (percobaan ke-${attempt})`,
        response: response,
      };
    } catch (error) {
      return await this.retryEmailSend(leaveData, attempt + 1);
    }
  }
}

// Instance global
const emailNotificationService = new EmailNotificationService();

// Export untuk digunakan di module lain
if (typeof module !== "undefined" && module.exports) {
  module.exports = EmailNotificationService;
}
