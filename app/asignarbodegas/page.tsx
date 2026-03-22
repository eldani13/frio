"use client";
import { useState } from "react";
import { BodegaAsignarModal } from "@/app/components/ui/bodegas/bodegaForm";

export default function AsignarBodegasPage() {
  const [modalOpen, setModalOpen] = useState(true);

  const handleRefresh = async () => {
    // Aquí puedes poner lógica para refrescar una tabla en la página si existiera
    console.log("Bodega actualizada con éxito");
  };


// Dentro de AsignarBodegasPage
// El clientId debe venir de tu estado global de usuario o auth
//const clientId = user.clientId; 
const clientId = "WDQrT48iinQT9P9TvWyY";

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Gestión de Bodegas</h1>
      <BodegaAsignarModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={handleRefresh}
        clientId={clientId} // <--- Pasamos el ID del cliente
      />
    </div>
  );
}