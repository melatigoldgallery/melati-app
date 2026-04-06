<template>
  <div class="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center px-3">
    <i class="bi bi-shield-exclamation display-1 text-warning mb-3"></i>
    <h2 class="fw-bold">Akses Ditolak</h2>
    <p class="text-muted">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    <div class="d-flex gap-2">
      <RouterLink to="/dashboard" class="btn btn-primary">
        <i class="bi bi-house me-1"></i>
        Dashboard
      </RouterLink>
      <button class="btn btn-outline-secondary" @click="auth.logout().then(() => $router.push('/login'))">
        <i class="bi bi-box-arrow-right me-1"></i>
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore();
</script>
