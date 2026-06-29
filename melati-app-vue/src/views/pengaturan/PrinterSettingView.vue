<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-gear-wide-connected me-2 text-dark"></i>
        Pengaturan Aplikasi
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/pengaturan/antrian-penutupan">Pengaturan</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Printer</li>
        </ol>
      </nav>
    </div>

    <!-- Printer settings component -->
    <PrinterSettings />
  </div>
</template>

<script setup>
import PrinterSettings from "@/components/PrinterSettings.vue";
</script>

<style scoped>
.page-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
}
</style>
