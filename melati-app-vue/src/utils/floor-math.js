export function calculateReconciliationStatus(fisikQty, sistemQty) {
  const fisik = Number(fisikQty || 0);
  const sistem = Number(sistemQty || 0);
  const variance = fisik - sistem;

  if (variance === 0) return { status: "klop", variance: 0 };
  if (variance < 0) return { status: "kurang", variance };
  return { status: "lebih", variance };
}

export function getSafeQty(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
