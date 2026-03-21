"use client";
import { useEffect, useState } from "react";
import { ProviderService } from "@/app/services/providerService";
import { Provider } from "@/app/types/provider";
import { ProviderTable } from "@/app/components/ui/providers/ProviderTable";
import { ProviderForm } from "@/app/components/ui/providers/ProviderForm";
import { HiOutlinePlus } from "react-icons/hi2";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const load = async () => setProviders(await ProviderService.getAll());
  useEffect(() => { load(); }, []);

  const handleSuccess = async (name: string) => {
    if (selectedProvider?.id) {
      await ProviderService.update(selectedProvider.id, { name });
    } else {
      await ProviderService.create(name);
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
        <div>
          <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">Proveedores</h1>
          <p className="text-[#2D5A3F]/60 text-[14px]">Listado de proveedores</p>
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