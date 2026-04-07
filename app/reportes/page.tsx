"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdBusiness, MdFactory, MdShoppingCart } from "react-icons/md";
import { HiOutlineArrowRight, HiOutlineTruck } from "react-icons/hi2";
import { BiPackage, BiArrowBack } from "react-icons/bi";
import { useAuth } from "@/app/context/AuthContext";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import type { WarehouseMeta } from "@/app/interfaces/bodega";
import { fetchFridemInventoryRows } from "@/lib/fridemInventory";
import { fetchWarehouseStateOnce } from "@/lib/bodegaCloudState";
import { totalKgInternoDesdeSlots } from "@/lib/bodegaInternalInventoryRows";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import type { OrdenCompra } from "@/app/types/ordenCompra";

import BodegaExtModule from "@/app/components/ui/reportes/bodegasexternas/page";
import BodegaIntModule from "@/app/components/ui/reportes/bodegasinternas/page";
import CompradorModule from "@/app/components/ui/reportes/compradores/page";
import ProveedorModule from "@/app/components/ui/reportes/proveedores/page";
import TransportesModule from "@/app/components/ui/reportes/transportes/page";

type ModuloTipo = "PROVEEDOR" | "TRANSPORTE" | "BODEGA_INT" | "BODEGA_EXT" | "COMPRADOR" | null;
type BodegaStep = "list" | "detail";

function warehousesForTipo(list: WarehouseMeta[], tipo: "interna" | "externa"): WarehouseMeta[] {
  if (tipo === "interna") return list.filter((b) => b.status === "interna");
  return list.filter((b) => b.status === "externa" || b.status === "external");
}

function sumRowsKg(
  rows: Awaited<ReturnType<typeof fetchFridemInventoryRows>>,
): number {
  return rows.reduce((acc, current) => {
    const k = current.kilosActual ?? current.kilos;
    return acc + (Number.isFinite(k) ? Number(k) : 0);
  }, 0);
}

/** Mismos estados que el listado «Proveedores» en reportes. */
const ESTADOS_OC_TARJETA_PROVEEDOR = new Set(["iniciado", "en curso", "transporte"]);

function ordenCuentaParaTarjetaProveedor(o: OrdenCompra): boolean {
  return ESTADOS_OC_TARJETA_PROVEEDOR.has((o.estado ?? "").trim().toLowerCase());
}

/** Suma kg pedidos en líneas (igual que el pie del listado proveedores). */
function totalKgDesdeOrdenesProveedor(ordenes: OrdenCompra[]): number {
  return ordenes.filter(ordenCuentaParaTarjetaProveedor).reduce((acc, o) => {
    for (const li of o.lineItems ?? []) {
      const pk = li.pesoKg;
      if (pk != null && Number.isFinite(Number(pk)) && Number(pk) > 0) {
        acc += Number(pk);
      }
    }
    return acc;
  }, 0);
}

const EXTERNAL_GRID_TOTAL_MAX_WAIT_MS = 2000;

const ReportesSection = () => {
  const { session, loading: authLoading } = useAuth();
  const codeCuenta = session?.codeCuenta ?? "";
  const idCliente = session?.clientId ?? "";

  const [activeModule, setActiveModule] = useState<ModuloTipo>(null);
  const [bodegaStep, setBodegaStep] = useState<BodegaStep | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<{ id: string; name: string } | null>(null);
  const [externalTotalKg, setExternalTotalKg] = useState(0);
  /** En la grilla: evita mostrar 0 Kg indefinidamente mientras llega el inventario externo */
  const [externalTotalGridLoading, setExternalTotalGridLoading] = useState(false);

  const [internalTotalKg, setInternalTotalKg] = useState(0);
  const [internalTotalGridLoading, setInternalTotalGridLoading] = useState(false);

  const [proveedorTotalKg, setProveedorTotalKg] = useState(0);
  const [proveedorTotalGridLoading, setProveedorTotalGridLoading] = useState(false);

  const [warehouseRows, setWarehouseRows] = useState<WarehouseMeta[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  const bodegaTipo = activeModule === "BODEGA_INT" ? "interna" : activeModule === "BODEGA_EXT" ? "externa" : null;

  const loadWarehouses = useCallback(async () => {
    if (!codeCuenta.trim()) {
      setWarehouseRows([]);
      return;
    }
    setWarehousesLoading(true);
    try {
      const list = await AsignarBodegaService.getWarehousesByCode(codeCuenta);
      setWarehouseRows(list ?? []);
    } catch {
      setWarehouseRows([]);
    } finally {
      setWarehousesLoading(false);
    }
  }, [codeCuenta]);

  const enPasoListadoBodegas =
    (activeModule === "BODEGA_INT" || activeModule === "BODEGA_EXT") && bodegaStep === "list";

  useEffect(() => {
    if (authLoading) return;
    if (!enPasoListadoBodegas) return;
    void loadWarehouses();
  }, [authLoading, enPasoListadoBodegas, loadWarehouses]);

  // Total Kg en la tarjeta "Bodega externa" de la grilla: suma todas las bodegas externas en paralelo.
  // A los 2 s como máximo dejamos de mostrar placeholder aunque sigan llegando respuestas.
  useEffect(() => {
    if (authLoading || activeModule !== null) return;
    if (!codeCuenta.trim()) {
      setExternalTotalKg(0);
      setExternalTotalGridLoading(false);
      return;
    }

    let cancelled = false;
    setExternalTotalKg(0);
    setExternalTotalGridLoading(true);

    const stopLoadingTimer = window.setTimeout(() => {
      if (!cancelled) setExternalTotalGridLoading(false);
    }, EXTERNAL_GRID_TOTAL_MAX_WAIT_MS);

    void (async () => {
      try {
        const list = await AsignarBodegaService.getWarehousesByCode(codeCuenta);
        if (cancelled) return;
        const externas = warehousesForTipo(list ?? [], "externa");
        if (externas.length === 0) {
          setExternalTotalKg(0);
          setExternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
          return;
        }

        await Promise.all(
          externas.map((w) =>
            fetchFridemInventoryRows(w.id)
              .then((rows) => {
                if (cancelled) return;
                const kg = sumRowsKg(rows);
                setExternalTotalKg((prev) => prev + kg);
              })
              .catch(() => {}),
          ),
        );
        if (!cancelled) {
          setExternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
        }
      } catch {
        if (!cancelled) {
          setExternalTotalKg(0);
          setExternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(stopLoadingTimer);
    };
  }, [authLoading, activeModule, codeCuenta]);

  // Total kg tarjeta «Proveedor»: órdenes Iniciado / En curso / Transporte (misma lógica que el listado).
  useEffect(() => {
    if (authLoading || activeModule !== null) return;
    if (!codeCuenta.trim() || !idCliente.trim()) {
      setProveedorTotalKg(0);
      setProveedorTotalGridLoading(false);
      return;
    }

    let cancelled = false;
    setProveedorTotalKg(0);
    setProveedorTotalGridLoading(true);

    const stopLoadingTimer = window.setTimeout(() => {
      if (!cancelled) setProveedorTotalGridLoading(false);
    }, EXTERNAL_GRID_TOTAL_MAX_WAIT_MS);

    void (async () => {
      try {
        const list = await OrdenCompraService.getAll(idCliente, codeCuenta);
        if (cancelled) return;
        setProveedorTotalKg(totalKgDesdeOrdenesProveedor(list));
        setProveedorTotalGridLoading(false);
        window.clearTimeout(stopLoadingTimer);
      } catch {
        if (!cancelled) {
          setProveedorTotalKg(0);
          setProveedorTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(stopLoadingTimer);
    };
  }, [authLoading, activeModule, codeCuenta, idCliente]);

  // Total kg en la tarjeta "Bodega interna": suma mapas de todas las internas (grilla inicial o listado de bodegas).
  useEffect(() => {
    if (authLoading) return;
    const enVistaAgregada =
      activeModule === null || (activeModule === "BODEGA_INT" && bodegaStep === "list");
    if (!enVistaAgregada) return;
    if (!codeCuenta.trim()) {
      setInternalTotalKg(0);
      setInternalTotalGridLoading(false);
      return;
    }

    let cancelled = false;
    setInternalTotalKg(0);
    setInternalTotalGridLoading(true);

    const stopLoadingTimer = window.setTimeout(() => {
      if (!cancelled) setInternalTotalGridLoading(false);
    }, EXTERNAL_GRID_TOTAL_MAX_WAIT_MS);

    void (async () => {
      try {
        const list = await AsignarBodegaService.getWarehousesByCode(codeCuenta);
        if (cancelled) return;
        const internas = warehousesForTipo(list ?? [], "interna");
        if (internas.length === 0) {
          setInternalTotalKg(0);
          setInternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
          return;
        }

        await Promise.all(
          internas.map((w) =>
            fetchWarehouseStateOnce(w.id)
              .then((state) => {
                if (cancelled) return;
                const kg = totalKgInternoDesdeSlots(state.slots ?? []);
                setInternalTotalKg((prev) => prev + kg);
              })
              .catch(() => {}),
          ),
        );
        if (!cancelled) {
          setInternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
        }
      } catch {
        if (!cancelled) {
          setInternalTotalKg(0);
          setInternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(stopLoadingTimer);
    };
  }, [authLoading, activeModule, bodegaStep, codeCuenta]);

  const listTitle =
    activeModule === "BODEGA_INT"
      ? "Bodegas internas de tu cuenta"
      : activeModule === "BODEGA_EXT"
        ? "Bodegas externas de tu cuenta"
        : "";

  const warehousesForListStep = useMemo(() => {
    if (activeModule === "BODEGA_INT") return warehousesForTipo(warehouseRows, "interna");
    if (activeModule === "BODEGA_EXT") return warehousesForTipo(warehouseRows, "externa");
    return [];
  }, [activeModule, warehouseRows]);

  const openModuleFromGrid = (id: ModuloTipo) => {
    setActiveModule(id);
    if (id === "BODEGA_INT" || id === "BODEGA_EXT") {
      setBodegaStep("list");
      setSelectedWarehouse(null);
    } else {
      setBodegaStep(null);
      setSelectedWarehouse(null);
    }
  };

  const handleBack = () => {
    if ((activeModule === "BODEGA_INT" || activeModule === "BODEGA_EXT") && bodegaStep === "detail") {
      setBodegaStep("list");
      setSelectedWarehouse(null);
      return;
    }
    setActiveModule(null);
    setBodegaStep(null);
    setSelectedWarehouse(null);
  };

  const modulos = [
    {
      id: "PROVEEDOR",
      label: "Proveedor",
      value:
        proveedorTotalGridLoading && proveedorTotalKg === 0
          ? "(…)"
          : `(${proveedorTotalKg.toLocaleString("es-CO", { maximumFractionDigits: 2 })} Kg)`,
      icon: <MdBusiness size={28} />,
      color: "bg-white",
    },
    { id: "TRANSPORTE", label: "Transporte", value: "(0 Kg)", icon: <HiOutlineTruck size={28} />, color: "bg-white" },
    {
      id: "BODEGA_INT",
      label: "Bodega interna",
      value:
        internalTotalGridLoading && internalTotalKg === 0
          ? "(…)"
          : `(${internalTotalKg.toLocaleString("es-CO", { maximumFractionDigits: 2 })} Kg)`,
      icon: <BiPackage size={28} />,
      color: "bg-white",
    },
    {
      id: "BODEGA_EXT",
      label: "Bodega externa",
      value:
        externalTotalGridLoading && externalTotalKg === 0
          ? "(…)"
          : `(${externalTotalKg.toLocaleString("es-CO", { maximumFractionDigits: 2 })} Kg)`,
      icon: <MdFactory size={28} />,
      color: "bg-white",
    },
    { id: "COMPRADOR", label: "Ventas", value: "(0 Kg)", icon: <MdShoppingCart size={28} />, color: "bg-white" },
  ];

  if (!activeModule) {
    return (
      <section className="rounded-2xl bg-[#f8fafc] p-8 shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-8 text-center uppercase tracking-wider">Inventario de Mercancía</h2>

        <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
          {modulos.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => openModuleFromGrid(m.id as ModuloTipo)}
              className={`
                ${m.id === "PROVEEDOR" || m.id === "TRANSPORTE" || m.id === "COMPRADOR" ? "col-span-2" : "col-span-1"}
                group flex items-center justify-center gap-6 p-6 rounded-2xl border border-slate-200 
                bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.98]
              `}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f172a] text-white shadow-lg group-hover:bg-slate-800 transition-colors">
                {m.icon}
              </div>

              <div className="text-left">
                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {m.label} <span className="text-slate-500 font-medium text-lg">{m.value}</span>
                </h3>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-3 px-6 py-3 border-2 border-[#A8D5BA] rounded-2xl bg-white text-slate-900 hover:bg-[#A8D5BA]/10 transition-all active:scale-95 font-bold shadow-sm cursor-pointer mb-6"
      >
        <BiArrowBack size={26} className="text-[#3a5a40]" />
        <span className="text-[18px]">Regresar</span>
      </button>

      {enPasoListadoBodegas && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-2">{listTitle}</h2>

          {authLoading ? (
            <p className="text-slate-400 text-sm italic py-8 text-center">Cargando sesión…</p>
          ) : !codeCuenta.trim() ? (
            <p className="text-slate-500 text-sm rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              Tu sesión no tiene código de cuenta. No se pueden listar bodegas vinculadas.
            </p>
          ) : warehousesLoading ? (
            <p className="text-slate-400 text-sm italic py-8 text-center">Cargando bodegas…</p>
          ) : warehousesForListStep.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-500 text-sm">
              No hay bodegas {bodegaTipo === "interna" ? "internas" : "externas"} asignadas a esta cuenta. Podés
              vincularlas desde Asignaciones en el menú del cliente.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {warehousesForListStep.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWarehouse({ id: b.id, name: b.name ?? "Sin nombre" });
                      setBodegaStep("detail");
                    }}
                    className="group w-full flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#A8D5BA] hover:shadow-md active:scale-[0.99]"
                  >
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                          b.status === "interna" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        }`}
                      >
                        {b.status === "interna" ? "Interna" : "Externa"}
                      </span>
                      <p className="mt-2 text-lg font-bold text-slate-900">{b.name ?? "Sin nombre"}</p>
                    </div>
                    <HiOutlineArrowRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeModule === "BODEGA_INT" && bodegaStep === "detail" && (
        <BodegaIntModule
          key={selectedWarehouse?.id ?? "int"}
          warehouseId={selectedWarehouse?.id}
          warehouseName={selectedWarehouse?.name}
          onTotalChange={setInternalTotalKg}
        />
      )}
      {activeModule === "BODEGA_EXT" && bodegaStep === "detail" && (
        <BodegaExtModule
          key={selectedWarehouse?.id ?? "ext"}
          warehouseId={selectedWarehouse?.id}
          warehouseName={selectedWarehouse?.name}
          onTotalChange={setExternalTotalKg}
        />
      )}

      {activeModule === "COMPRADOR" && <CompradorModule />}
      {activeModule === "PROVEEDOR" && <ProveedorModule />}
      {activeModule === "TRANSPORTE" && <TransportesModule />}
    </section>
  );
};

export default ReportesSection;
