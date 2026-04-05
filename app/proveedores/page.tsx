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
import { HiOutlinePlus, HiOutlineSquares2X2 } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";

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

  const load = async () => {
    if (!idCliente) {
      setProviders([]);
      return;
    }
    setProviders(await ProviderService.getAll(idCliente, codeCuenta));
  };

  useEffect(() => {
    void load();
  }, [idCliente, codeCuenta]);

  useEffect(() => {
    if (!ordenesModalProvider?.id || !idCliente.trim()) {
      setOrdenesList([]);
      return;
    }
    let cancelled = false;
    setOrdenesLoading(true);
    void OrdenCompraService.getByProveedor(idCliente, codeCuenta, ordenesModalProvider.id)
      .then((list) => {
        if (cancelled) return;
        setOrdenesList(
          list.map((o) => ({
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
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setOrdenesList([]);
      })
      .finally(() => {
        if (!cancelled) setOrdenesLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!idCliente) return;
    if (window.confirm("¿Eliminar este proveedor definitivamente?")) {
      await ProviderService.delete(idCliente, id);
      await load();
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-8 font-['Inter']">
      <header className="mb-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#f8edb1] rounded-2xl text-[#2D5A3F]">
            <HiOutlineSquares2X2 size={28} />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Proveedores</h1>           
          </div>
        </div>
        <button 
          onClick={() => { setSelectedProvider(null); setIsModalOpen(true); }}
          className="bg-[#A8D5BA] text-[#2D5A3F] px-6 py-2.5 rounded-[10px] font-semibold text-[14px] flex items-center gap-2 hover:bg-[#97c4a9] transition-all active:scale-95"
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