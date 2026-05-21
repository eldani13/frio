/**
 * Ordenar órdenes de compra: más nueva primero.
 * Soporta `createdAt` como número (ms) o Timestamp de Firestore.
 */

export function ordenCompraCreatedAtMs(createdAt: unknown): number {
  if (typeof createdAt === "number" && Number.isFinite(createdAt)) return createdAt;
  if (createdAt && typeof createdAt === "object" && "toMillis" in createdAt) {
    const fn = (createdAt as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") {
      try {
        return fn.call(createdAt);
      } catch {
        return 0;
      }
    }
  }
  return 0;
}

export function compareOrdenCompraNewestFirst(
  a: { createdAt?: unknown; numericId?: unknown },
  b: { createdAt?: unknown; numericId?: unknown },
): number {
  const ma = ordenCompraCreatedAtMs(a.createdAt);
  const mb = ordenCompraCreatedAtMs(b.createdAt);
  if (mb !== ma) return mb - ma;
  return (Number(b.numericId) || 0) - (Number(a.numericId) || 0);
}

/** Código de orden (numericId / OC-XXXX): mayor primero; empate → más reciente primero. */
export function compareOrdenCompraByCodigoDesc(
  a: { numericId?: unknown; createdAt?: unknown },
  b: { numericId?: unknown; createdAt?: unknown },
): number {
  const diff = (Number(b.numericId) || 0) - (Number(a.numericId) || 0);
  if (diff !== 0) return diff;
  return compareOrdenCompraNewestFirst(a, b);
}
