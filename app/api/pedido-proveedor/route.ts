import { NextResponse } from "next/server";
import { PEDIDO_PROVEEDOR_WEBHOOK_URL } from "@/app/config/pedidoProveedorIntegracion";
import type { SolicitudLineItem } from "@/app/types/solicitudCompra";

type BodyIn = {
  idcliente?: string;
  codeCuenta?: string;
  lineItems?: SolicitudLineItem[];
  estado?: string;
  proveedor_nombre?: string;
  proveedorCode?: string;
  proveedorId?: string;
  telefono?: string;
};

export async function POST(req: Request) {
  let parsed: BodyIn;
  try {
    parsed = (await req.json()) as BodyIn;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const idcliente = String(parsed.idcliente ?? "").trim();
  const codeCuenta = String(parsed.codeCuenta ?? "").trim();
  const items = parsed.lineItems;
  const proveedor_nombre = String(parsed.proveedor_nombre ?? "").trim();
  const proveedorCode = String(parsed.proveedorCode ?? "").trim();
  const proveedorId = String(parsed.proveedorId ?? "").trim();
  const telefono = String(parsed.telefono ?? "").trim();

  if (!idcliente || !codeCuenta || !items?.length) {
    return NextResponse.json(
      { error: "Faltan idcliente, codeCuenta o lineItems." },
      { status: 400 },
    );
  }
  if (!proveedor_nombre || !proveedorCode || !proveedorId || !telefono) {
    return NextResponse.json(
      {
        error:
          "Faltan datos del proveedor (nombre, código, id o teléfono). Deben venir de la base de datos.",
      },
      { status: 400 },
    );
  }

  const estado = String(parsed.estado ?? "Iniciado").trim() || "Iniciado";

  const outbound = {
    proveedor_nombre,
    proveedorCode,
    proveedorId,
    telefono,
    estado,
    lineItems: items.map((li) => ({
      catalogoProductId: li.catalogoProductId,
      codeSnapshot: li.codeSnapshot != null ? String(li.codeSnapshot) : "",
      titleSnapshot: li.titleSnapshot ?? "",
      cantidad: String(li.pesoKg),
    })),
    idcliente,
    codeCuenta,
  };

  try {
    const res = await fetch(PEDIDO_PROVEEDOR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outbound),
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: text?.slice(0, 500) || `Webhook respondió ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error de red hacia n8n";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
