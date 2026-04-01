import type { Client } from "@/app/interfaces/bodega";

export function clientLabelFromList(
  clientField: string,
  clients: Pick<Client, "id" | "name">[],
): string {
  if (!clientField?.trim()) return "—";
  const t = clientField.trim();
  const byId = clients.find((c) => c.id === t);
  if (byId) return byId.name;
  const byName = clients.find((c) => c.name.trim() === t);
  if (byName) return byName.name;
  return clientField;
}

export function formatBoxQuantityKg(quantityKg: number | undefined): string {
  if (typeof quantityKg !== "number" || !Number.isFinite(quantityKg)) return "—";
  return `${quantityKg} kg`;
}
