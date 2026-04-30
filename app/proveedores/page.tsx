"use client";
import { useEffect, useState } from "react";
import { ProviderService } from "@/app/services/providerService";
import { Provider } from "@/app/types/provider";
import { ProviderTable } from "@/app/components/ui/providers/ProviderTable";
import { ProviderForm } from "@/app/components/ui/providers/ProviderForm";
import {
  ProviderOrdenesModal,
  type ProveedorOrdenCompraRow,
} from "@/app/components/ui/providers/ProviderOrdenesModal";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { formatKgEs } from "@/app/lib/decimalEs";
import { buildLineasRecepcionDiff } from "@/app/lib/ordenCompraRecepcionDiff";
import { HiOutlinePlus, HiOutlineSquares2X2 } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";
import { swalConfirmDelete, swalError } from "@/lib/swal";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [ordenesModalProvider, setOrdenesModalProvider] = useState<Provider | null>(null);
  const [ordenesList, setOrdenesList] = useState<ProveedorOrdenCompraRow[]>([]);
  const [ordenesLoading, setOrdenesLoading] = useState(false);

  const { session } = useAuth();
  const codeCuenta = session?.codeCuenta ?? "";
  const idCliente = session?.clientId ?? "";

  useEffect(() => {
    if (!idCliente.trim()) {
      setProviders([]);
      return;
    }
    const unsub = ProviderService.subscribeByCodeCuenta(idCliente, codeCuenta, setProviders);
    return () => unsub();
  }, [idCliente, codeCuenta]);

  useEffect(() => {
    const pid = ordenesModalProvider?.id;
    if (!pid || !idCliente.trim()) {
      setOrdenesList([]);
      setOrdenesLoading(false);
      return;
    }
    setOrdenesLoading(true);
    const unsub = OrdenCompraService.subscribeByCodeCuenta(idCliente, codeCuenta, (list) => {
      const filtered = list.filter((o) => String(o.proveedorId ?? "").trim() === pid);
      setOrdenesList(
        filtered.map((o) => {
          const { lineasDiff, adicionales, tieneRecepcion } = buildLineasRecepcionDiff(o);
          return {
            id: o.id ?? o.numero,
            ordenCompra: o.numero,
            estado: o.estado,
            resumenProductos: (o.lineItems ?? [])
              .map((li) => {
                const medida =
                  li.pesoKg != null && Number(li.pesoKg) > 0
                    ? `${formatKgEs(Number(li.pesoKg))} kg`
                    : `${li.cantidad} u.`;
                return `${li.titleSnapshot} · ${medida}`;
              })
              .join(" · "),
            lineasDiff,
            adicionales,
            tieneRecepcion,
          };
        }),
      );
      setOrdenesLoading(false);
    });
    return () => unsub();
  }, [ordenesModalProvider?.id, idCliente, codeCuenta]);

  const handleSuccess = async (data: {
    name: string;
    nombre: string;
    telefono: string;
    email: string;
  }) => {
    if (!idCliente) return;
    if (selectedProvider?.id) {
      await ProviderService.update(idCliente, selectedProvider.id, {
        name: data.name,
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
      });
    } else {
      await ProviderService.create(data, idCliente, codeCuenta);
    }
  };

  const handleDelete = async (id: string) => {
    if (!idCliente) return;
    const ok = await swalConfirmDelete("¿Eliminar este proveedor?", "Se eliminará de forma definitiva.");
    if (!ok) return;
    try {
      await ProviderService.delete(idCliente, id);
    } catch {
      void swalError("No se pudo eliminar", "Reintentá o revisá que el proveedor no esté en uso.");
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-8">
      <header className="mb-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="app-title">Proveedores</h1>
          </div>
        </div>
        <button 
          onClick={() => { setSelectedProvider(null); setIsModalOpen(true); }}
          className="bg-[#A8D5BA] text-[#2D5A3F] px-6 py-2.5 rounded-[10px] font-semibold text-base flex items-center gap-2 hover:bg-[#97c4a9] transition-all active:scale-95"
        >
          <HiOutlinePlus strokeWidth={2.5} /> Nuevo Proveedor
        </button>
      </header>

      <ProviderTable
        providers={providers}
        onSelectProvider={(p) => {
          setOrdenesList([]);
          setOrdenesModalProvider(p);
        }}
        onEdit={(p) => {
          setSelectedProvider(p);
          setIsModalOpen(true);
        }}
        onDelete={handleDelete}
      />

      <ProviderForm
        isOpen={isModalOpen}
        provider={selectedProvider}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

      <ProviderOrdenesModal
        isOpen={ordenesModalProvider !== null}
        provider={ordenesModalProvider}
        ordenes={ordenesList}
        loading={ordenesLoading}
        onClose={() => setOrdenesModalProvider(null)}
      />
    </main>
  );
}