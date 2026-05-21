"use client";
import React, { useEffect, useMemo, useState } from "react";
import { MdBusiness, MdFactory, MdShoppingCart } from "react-icons/md";
import { HiOutlineArrowRight, HiOutlineTruck } from "react-icons/hi2";
import { BiPackage, BiArrowBack } from "react-icons/bi";
import { useAuth } from "@/app/context/AuthContext";
import { AsignarBodegaService } from "@/app/services/asignarbodegaService";
import type { WarehouseMeta } from "@/app/interfaces/bodega";
import { fetchFridemInventoryRows } from "@/lib/fridem/fridemInventory";
import { fetchHistoryStateOnce, fetchWarehouseStateOnce } from "@/lib/bodega/bodegaCloudState";
import {
  buildIngresoRecordByAutoId,
  totalKgInternoDesdeSlots,
} from "@/lib/bodega/bodegaInternalInventoryRows";
import { kilosPedidoLineItem } from "@/app/lib/ordenCompraLineKgPedido";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { CatalogoService } from "@/app/services/catalogoService";
import { OrdenVentaService } from "@/app/services/ordenVentaService";
import {
  kgEsperadoLineaVentaEnViaje,
  ViajeVentaTransporteService,
} from "@/app/services/viajeVentaTransporteService";
import type { Catalogo } from "@/app/types/catalogo";
import type { OrdenCompra } from "@/app/types/ordenCompra";
import type { VentaEnCurso } from "@/app/types/ventaCuenta";

import BodegaExtModule from "@/app/components/ui/reportes/bodegasexternas/page";
import { disponibilidadVistasExternas } from "@/app/components/ui/reportes/bodegasexternas/viewAvailability";
import { cuentaExternaTieneReporteEmbed } from "@/app/components/ui/reportes/bodegasexternas/externaReportEmbed";
import BodegaIntModule from "@/app/components/ui/reportes/bodegasinternas/page";
import CompradorModule from "@/app/components/ui/reportes/compradores/page";
import ProveedorModule from "@/app/components/ui/reportes/proveedores/page";
import TransportesModule from "@/app/components/ui/reportes/transportes/page";
import {
  etiquetaKgTarjetaInventario,
  moduloInventarioPermiteEntrada,
  type InventarioModuloCardState,
} from "./inventarioMercanciaGrid";
import type { ModuloTipo } from "./inventarioMercanciaTypes";

type ModuloActivo = ModuloTipo | null;
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

/** Misma regla que el listado «En inventario venta»: solo ventas cerradas ok o no ok. */
const ESTADOS_VENTA_TARJETA = new Set(["cerrado(ok)", "cerrado(no ok)"]);

function totalKgDesdeVentasCompradorInventario(ventas: VentaEnCurso[], catalogos: Catalogo[]): number {
  let acc = 0;
  for (const v of ventas) {
    if (!ESTADOS_VENTA_TARJETA.has(String(v.estado ?? "").trim().toLowerCase())) continue;
    for (const li of v.lineItems ?? []) {
      const k = kgEsperadoLineaVentaEnViaje(li, catalogos);
      acc += Number.isFinite(k) ? k : 0;
    }
  }
  return acc;
}

function ordenCuentaParaTarjetaProveedor(o: OrdenCompra): boolean {
  return ESTADOS_OC_TARJETA_PROVEEDOR.has((o.estado ?? "").trim().toLowerCase());
}

/** Suma kg pedidos en líneas (misma regla que el listado «En inventario proveedores»). */
function totalKgDesdeOrdenesProveedor(ordenes: OrdenCompra[]): number {
  return ordenes.filter(ordenCuentaParaTarjetaProveedor).reduce((acc, o) => {
    for (const li of o.lineItems ?? []) {
      acc += kilosPedidoLineItem(li);
    }
    return acc;
  }, 0);
}

const EXTERNAL_GRID_TOTAL_MAX_WAIT_MS = 2000;

const ReportesSection = () => {
  const { session, loading: authLoading } = useAuth();
  const codeCuenta = session?.codeCuenta ?? "";
  const idCliente = session?.clientId ?? "";

  const [activeModule, setActiveModule] = useState<ModuloActivo>(null);
  /** Bodega externa en grilla: true si alguna vista (listado, gráfico o reporte) tiene datos en la cuenta. */
  const [externalModuloAplica, setExternalModuloAplica] = useState(false);
  const [bodegaStep, setBodegaStep] = useState<BodegaStep | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<{ id: string; name: string } | null>(null);
  const [externalTotalKg, setExternalTotalKg] = useState(0);
  /** En la grilla: evita mostrar 0 Kg indefinidamente mientras llega el inventario externo */
  const [externalTotalGridLoading, setExternalTotalGridLoading] = useState(false);

  const [internalTotalKg, setInternalTotalKg] = useState(0);
  const [internalTotalGridLoading, setInternalTotalGridLoading] = useState(false);

  const [proveedorTotalKg, setProveedorTotalKg] = useState(0);
  const [proveedorTotalGridLoading, setProveedorTotalGridLoading] = useState(false);

  const [transporteTotalKg, setTransporteTotalKg] = useState(0);
  const [transporteTotalGridLoading, setTransporteTotalGridLoading] = useState(false);

  const [compradorTotalKg, setCompradorTotalKg] = useState(0);
  const [compradorTotalGridLoading, setCompradorTotalGridLoading] = useState(false);

  const [warehouseRows, setWarehouseRows] = useState<WarehouseMeta[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  const bodegaTipo = activeModule === "BODEGA_INT" ? "interna" : activeModule === "BODEGA_EXT" ? "externa" : null;

  const enPasoListadoBodegas =
    (activeModule === "BODEGA_INT" || activeModule === "BODEGA_EXT") && bodegaStep === "list";

  useEffect(() => {
    if (authLoading || !codeCuenta.trim()) {
      setWarehouseRows([]);
      setWarehousesLoading(false);
      return;
    }
    setWarehousesLoading(true);
    const unsub = AsignarBodegaService.subscribeWarehousesByCode(
      codeCuenta,
      (list) => {
        setWarehouseRows(list ?? []);
        setWarehousesLoading(false);
      },
      () => setWarehousesLoading(false),
    );
    return () => unsub();
  }, [authLoading, codeCuenta]);

  // Total Kg en la tarjeta "Bodega externa" de la grilla: suma todas las bodegas externas en paralelo.
  // A los 2 s como máximo dejamos de mostrar placeholder aunque sigan llegando respuestas.
  useEffect(() => {
    if (authLoading || activeModule !== null) return;
    if (!codeCuenta.trim()) {
      setExternalTotalKg(0);
      setExternalModuloAplica(false);
      setExternalTotalGridLoading(false);
      return;
    }

    let cancelled = false;
    setExternalTotalKg(0);
    setExternalModuloAplica(cuentaExternaTieneReporteEmbed(codeCuenta));
    setExternalTotalGridLoading(true);

    const stopLoadingTimer = window.setTimeout(() => {
      if (!cancelled) setExternalTotalGridLoading(false);
    }, EXTERNAL_GRID_TOTAL_MAX_WAIT_MS);

    void (async () => {
      try {
        if (cancelled) return;
        const externas = warehousesForTipo(warehouseRows, "externa");
        const cc = codeCuenta.trim();
        let moduloAplica = cuentaExternaTieneReporteEmbed(cc);
        let totalKgAcc = 0;

        if (externas.length === 0) {
          if (!cancelled) {
            setExternalTotalKg(0);
            setExternalModuloAplica(moduloAplica);
            setExternalTotalGridLoading(false);
            window.clearTimeout(stopLoadingTimer);
          }
          return;
        }

        const partes = await Promise.all(
          externas.map(async (w) => {
            try {
              const rows = await fetchFridemInventoryRows(w.id, (w.codeCuenta ?? cc).trim() || undefined);
              const vistas = disponibilidadVistasExternas(rows, false, null, w.codeCuenta ?? cc);
              return {
                kg: sumRowsKg(rows),
                tieneVista: vistas.listado || vistas.grafico || vistas.reporte,
              };
            } catch {
              return { kg: 0, tieneVista: false };
            }
          }),
        );
        if (!cancelled) {
          for (const p of partes) {
            totalKgAcc += p.kg;
            if (p.tieneVista) moduloAplica = true;
          }
          setExternalTotalKg(totalKgAcc);
          setExternalModuloAplica(moduloAplica);
          setExternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
        }
      } catch {
        if (!cancelled) {
          setExternalTotalKg(0);
          setExternalModuloAplica(cuentaExternaTieneReporteEmbed(codeCuenta));
          setExternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(stopLoadingTimer);
    };
  }, [authLoading, activeModule, codeCuenta, warehouseRows]);

  // Total kg tarjeta «Proveedor»: órdenes Iniciado / En curso / Transporte (misma lógica que el listado).
  useEffect(() => {
    if (authLoading || activeModule !== null) return;
    if (!codeCuenta.trim() || !idCliente.trim()) {
      setProveedorTotalKg(0);
      setProveedorTotalGridLoading(false);
      return;
    }

    setProveedorTotalKg(0);
    setProveedorTotalGridLoading(true);

    const stopLoadingTimer = window.setTimeout(() => {
      setProveedorTotalGridLoading(false);
    }, EXTERNAL_GRID_TOTAL_MAX_WAIT_MS);

    const unsub = OrdenCompraService.subscribeByCodeCuenta(idCliente, codeCuenta, (list) => {
      setProveedorTotalKg(totalKgDesdeOrdenesProveedor(list));
      setProveedorTotalGridLoading(false);
      window.clearTimeout(stopLoadingTimer);
    });

    return () => {
      unsub();
      window.clearTimeout(stopLoadingTimer);
    };
  }, [authLoading, activeModule, codeCuenta, idCliente]);

  // Total kg tarjeta «Transporte»: suma kg estimados de todos los viajes de venta En curso (misma fuente que el listado).
  useEffect(() => {
    if (authLoading || activeModule !== null) return;
    if (!codeCuenta.trim() || !idCliente.trim()) {
      setTransporteTotalKg(0);
      setTransporteTotalGridLoading(false);
      return;
    }

    setTransporteTotalKg(0);
    setTransporteTotalGridLoading(true);

    const stopLoadingTimer = window.setTimeout(() => {
      setTransporteTotalGridLoading(false);
    }, EXTERNAL_GRID_TOTAL_MAX_WAIT_MS);

    const unsub = ViajeVentaTransporteService.subscribeEnCursoParaCuenta(idCliente, codeCuenta, (viajes) => {
      const kg = viajes.reduce((acc, v) => {
        const k = Number(v.kgTotalEstimado);
        return acc + (Number.isFinite(k) && k > 0 ? k : 0);
      }, 0);
      setTransporteTotalKg(kg);
      setTransporteTotalGridLoading(false);
      window.clearTimeout(stopLoadingTimer);
    });

    return () => {
      unsub();
      window.clearTimeout(stopLoadingTimer);
    };
  }, [authLoading, activeModule, codeCuenta, idCliente]);

  // Total kg tarjeta «Ventas»: mismas líneas y estados que el listado «En inventario venta» (cerradas ok / no ok).
  useEffect(() => {
    if (authLoading || activeModule !== null) return;
    if (!codeCuenta.trim() || !idCliente.trim()) {
      setCompradorTotalKg(0);
      setCompradorTotalGridLoading(false);
      return;
    }

    setCompradorTotalKg(0);
    setCompradorTotalGridLoading(true);

    const stopLoadingTimer = window.setTimeout(() => {
      setCompradorTotalGridLoading(false);
    }, EXTERNAL_GRID_TOTAL_MAX_WAIT_MS);

    const cc = codeCuenta.trim();
    let ventas: VentaEnCurso[] = [];
    let cats: Catalogo[] = [];
    const emit = () => {
      const ventasCuenta = ventas.filter((v) => String(v.codeCuenta ?? "").trim() === cc);
      setCompradorTotalKg(totalKgDesdeVentasCompradorInventario(ventasCuenta, cats));
      setCompradorTotalGridLoading(false);
      window.clearTimeout(stopLoadingTimer);
    };
    const u1 = OrdenVentaService.subscribe(idCliente, (list) => {
      ventas = list;
      emit();
    });
    const u2 = CatalogoService.subscribeByCodeCuenta(idCliente, codeCuenta, (list) => {
      cats = list;
      emit();
    });

    return () => {
      u1();
      u2();
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
        if (cancelled) return;
        const internas = warehousesForTipo(warehouseRows, "interna");
        if (internas.length === 0) {
          setInternalTotalKg(0);
          setInternalTotalGridLoading(false);
          window.clearTimeout(stopLoadingTimer);
          return;
        }

        await Promise.all(
          internas.map((w) =>
            Promise.all([fetchWarehouseStateOnce(w.id), fetchHistoryStateOnce(w.id)])
              .then(([state, hist]) => {
                if (cancelled) return;
                const ingresoRecordsByAutoId = buildIngresoRecordByAutoId(
                  (hist.ingresos ?? []) as Record<string, unknown>[],
                );
                const kg = totalKgInternoDesdeSlots(state.slots ?? [], {
                  ingresoRecordsByAutoId,
                });
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
  }, [authLoading, activeModule, bodegaStep, codeCuenta, warehouseRows]);

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

  const modulosGrid = useMemo((): InventarioModuloCardState[] => {
    return [
      {
        id: "PROVEEDOR",
        label: "Proveedor",
        kg: proveedorTotalKg,
        loading: proveedorTotalGridLoading,
        aplica: !proveedorTotalGridLoading && proveedorTotalKg > 0,
      },
      {
        id: "TRANSPORTE",
        label: "Transporte",
        kg: transporteTotalKg,
        loading: transporteTotalGridLoading,
        aplica: !transporteTotalGridLoading && transporteTotalKg > 0,
      },
      {
        id: "BODEGA_INT",
        label: "Bodega interna",
        kg: internalTotalKg,
        loading: internalTotalGridLoading,
        aplica: !internalTotalGridLoading && internalTotalKg > 0,
      },
      {
        id: "BODEGA_EXT",
        label: "Bodega externa",
        kg: externalTotalKg,
        loading: externalTotalGridLoading,
        aplica: !externalTotalGridLoading && externalModuloAplica,
      },
      {
        id: "COMPRADOR",
        label: "Ventas",
        kg: compradorTotalKg,
        loading: compradorTotalGridLoading,
        aplica: !compradorTotalGridLoading && compradorTotalKg > 0,
      },
    ];
  }, [
    proveedorTotalKg,
    proveedorTotalGridLoading,
    transporteTotalKg,
    transporteTotalGridLoading,
    internalTotalKg,
    internalTotalGridLoading,
    externalTotalKg,
    externalTotalGridLoading,
    externalModuloAplica,
    compradorTotalKg,
    compradorTotalGridLoading,
  ]);

  const openModuleFromGrid = (id: ModuloTipo) => {
    const card = modulosGrid.find((m) => m.id === id);
    if (card && !moduloInventarioPermiteEntrada(card)) return;
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

  const modulosIconos: Record<ModuloTipo, React.ReactNode> = {
    PROVEEDOR: <MdBusiness size={28} />,
    TRANSPORTE: <HiOutlineTruck size={28} />,
    BODEGA_INT: <BiPackage size={28} />,
    BODEGA_EXT: <MdFactory size={28} />,
    COMPRADOR: <MdShoppingCart size={28} />,
  };

  if (!activeModule) {
    return (
      <section className="rounded-2xl bg-[#f8fafc] p-8 shadow-sm border border-slate-200">
        <h2 className="app-title mb-8 text-center uppercase tracking-wider">Inventario de Mercancía</h2>

        <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
          {modulosGrid.map((m) => {
            const puedeEntrar = moduloInventarioPermiteEntrada(m);
            const etiqueta = etiquetaKgTarjetaInventario(m.loading, m.kg, m.aplica);
            const anchoCompleto =
              m.id === "PROVEEDOR" || m.id === "TRANSPORTE" || m.id === "COMPRADOR";
            return (
              <button
                key={m.id}
                type="button"
                disabled={!puedeEntrar}
                title={puedeEntrar ? undefined : "No aplica: no hay datos en este módulo"}
                onClick={() => openModuleFromGrid(m.id)}
                className={`
                  ${anchoCompleto ? "col-span-2" : "col-span-1"}
                  group flex items-center justify-center gap-6 p-6 rounded-2xl border
                  ${puedeEntrar ? "border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.98]" : "border-slate-100 bg-slate-50 cursor-not-allowed opacity-75"}
                  transition-all
                `}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-colors ${
                    puedeEntrar
                      ? "bg-[#0f172a] text-white group-hover:bg-slate-800"
                      : "bg-slate-300 text-slate-500"
                  }`}
                >
                  {modulosIconos[m.id]}
                </div>

                <div className="text-left">
                  <h3 className="app-title leading-tight">
                    {m.label}{" "}
                    <span
                      className={`font-medium text-base ${
                        m.aplica ? "text-slate-500" : "text-slate-400 italic"
                      }`}
                    >
                      {etiqueta}
                    </span>
                  </h3>
                </div>
              </button>
            );
          })}
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
        <span className="text-base">Regresar</span>
      </button>

      {enPasoListadoBodegas && (
        <div className="max-w-2xl mx-auto">
          <h2 className="app-title mb-2">{listTitle}</h2>

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
                        className={`text-base font-bold uppercase tracking-widest px-2 py-1 rounded ${
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
          codeCuenta={codeCuenta.trim() || undefined}
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
