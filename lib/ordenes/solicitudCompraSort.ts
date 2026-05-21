/** Código de solicitud (numericId / SOL-XXXX): mayor primero; empate → más reciente primero. */
export function compareSolicitudCompraByCodigoDesc(
  a: { numericId?: unknown; createdAt?: unknown },
  b: { numericId?: unknown; createdAt?: unknown },
): number {
  const diff = (Number(b.numericId) || 0) - (Number(a.numericId) || 0);
  if (diff !== 0) return diff;
  return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
}
