export function getSafeAmount(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function normalizePaymentMethod(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function resolveReceiptPayment({ metodeBayar, totalHarga, jumlahBayar, kembalian }) {
  const metode = normalizePaymentMethod(metodeBayar);
  const total = getSafeAmount(totalHarga);

  if (metode === "dp" || metode === "free") {
    return {
      metodeBayar: metode,
      totalHarga: total,
      jumlahBayar: 0,
      kembalian: 0,
    };
  }

  const paidInput = getSafeAmount(jumlahBayar);
  const effectiveJumlahBayar = paidInput > 0 ? paidInput : total;

  const changeInput = Number(kembalian);
  const effectiveKembalian =
    Number.isFinite(changeInput) && changeInput >= 0 ? changeInput : Math.max(0, effectiveJumlahBayar - total);

  return {
    metodeBayar: metode,
    totalHarga: total,
    jumlahBayar: effectiveJumlahBayar,
    kembalian: effectiveKembalian,
  };
}

export function resolveReprintReceiptPayment(trx) {
  const metodeBayar = normalizePaymentMethod(trx?.metodePembayaran || trx?.metodeBayar);
  const totalHarga = getSafeAmount(trx?.totalHarga);

  if (metodeBayar === "dp" || metodeBayar === "free") {
    return {
      metodeBayar,
      totalHarga,
      jumlahBayar: 0,
      kembalian: 0,
    };
  }

  const paidRaw = Number(trx?.jumlahBayar ?? trx?.bayar ?? trx?.nominalBayar ?? 0);
  const jumlahBayar = Number.isFinite(paidRaw) && paidRaw > 0 ? paidRaw : totalHarga;

  const changeRaw = Number(trx?.kembalian ?? 0);
  const kembalian = Number.isFinite(changeRaw) && changeRaw >= 0 ? changeRaw : Math.max(0, jumlahBayar - totalHarga);

  return {
    metodeBayar,
    totalHarga,
    jumlahBayar,
    kembalian,
  };
}
