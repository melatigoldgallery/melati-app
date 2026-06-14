// composables/useAlert.js
// Wrapper SweetAlert2 sebagai composable
import Swal from "sweetalert2";

export function useAlert() {
  const swal = (message, icon = "success") => {
    const isSuccess = icon === "success";
    return Swal.fire({
      icon,
      title: isSuccess ? "Berhasil" : "Informasi",
      text: message,
      showConfirmButton: !isSuccess,
      confirmButtonText: "OK",
      timer: isSuccess ? 1800 : undefined,
    });
  };

  const toast = (message, icon = "success") =>
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });

  const confirm = (options = {}) =>
    Swal.fire({
      title: options.title || "Konfirmasi",
      text: options.text || (options.html ? undefined : "Apakah Anda yakin?"),
      html: options.html,
      icon: options.icon || "warning",
      showCancelButton: true,
      confirmButtonColor: "#c8a96e",
      cancelButtonColor: "#6c757d",
      confirmButtonText: options.confirmText || options.confirmButtonText || "Ya, lanjutkan",
      cancelButtonText: options.cancelButtonText || "Batal",
    });

  const error = (message, detail = "") => Swal.fire({ icon: "error", title: message, text: detail || undefined });

  const success = (message) =>
    Swal.fire({ icon: "success", title: "Berhasil", text: message, timer: 1800, showConfirmButton: false });

  return { toast, swal, confirm, error, success };
}
