"use client";
import { useEffect, useState } from "react";
import { ProviderService } from "@/app/services/providerService";
import { Provider } from "@/app/types/provider";
import { ProviderTable } from "@/app/components/ui/providers/ProviderTable";
import { ProviderForm } from "@/app/components/ui/providers/ProviderForm";
import { HiOutlinePlus, HiOutlineSquares2X2 } from "react-icons/hi2";
import { useAuth } from "@/app/context/AuthContext";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const { session } = useAuth();
  const codeCuenta = session?.codeCuenta;
  const load = async () => setProviders(await ProviderService.getAll(codeCuenta || ""));
  useEffect(() => { load(); }, []);

  const handleSuccess = async (name: string) => {
    if (selectedProvider?.id) {
      await ProviderService.update(selectedProvider.id, { name });
    } else {
      await ProviderService.create(name, codeCuenta || "");
    }
    await load();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar este proveedor definitivamente?")) {
      await ProviderService.delete(id);
      await load();
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-8 font-['Inter']">
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
        onEdit={(p) => { setSelectedProvider(p); setIsModalOpen(true); }} 
        onDelete={handleDelete} 
      />

      <ProviderForm 
        isOpen={isModalOpen} 
        provider={selectedProvider}
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleSuccess} 
      />
    </main>
  );
}