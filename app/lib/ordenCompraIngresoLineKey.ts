/**
 * Clave por fila del formulario de ingreso (mismo orden que `lineItems` de la OC).
 * No usar solo `catalogoProductId`: varias líneas pueden repetir id y compartirían un solo kg en el mapa.
 */
export function ordenCompraIngresoLineKey(index: number): string {
  return `line:${index}`;
}
