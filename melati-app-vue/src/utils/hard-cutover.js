/**
 * Hard cutover helper: floor-scoped reads only.
 */

/**
 * Read from floor-scoped path only.
 *
 * @param {Function} floorReader - async function that reads from floor-scoped path
 * @returns {Promise<any>} Floor-scoped data
 */
export async function readWithFloorFallback(floorReader, legacyReader) {
  return await floorReader();
}

/**
 * Check if floor-scoped data is properly migrated
 * Returns true if floor data exists and is non-empty
 */
export async function isFloorMigrated(floorReader) {
  try {
    const data = await floorReader();
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === "object") return Object.keys(data).length > 0;
    return data !== null && data !== undefined;
  } catch {
    return false;
  }
}

/**
 * **After Migration Stabilization**: Read from floor-scoped path ONLY, no fallback.
 * Use this after migration is verified complete and validated for 1+ weeks.
 * (Strategy B: keep legacy as backup but read from L1 only)
 *
 * @param {Function} floorReader - async function that reads from floor-scoped path (L1)
 * @returns {Promise<any>} Floor-scoped data only, or error if unavailable
 */
export async function readWithL1Only(floorReader) {
  const data = await floorReader();
  if (data !== null && data !== undefined) {
    return data;
  }
  return null;
}
