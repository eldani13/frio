"use client";
import React, { createContext, useContext, useState } from "react";
import type { Box, BodegaOrder } from "../../interfaces/bodega";

interface BodegaHistoryContextType {
  ingresos: Box[];
  salidas: BodegaOrder[];
  movimientosBodega: BodegaOrder[];
  addIngreso: (box: Box) => void;
  addSalida: (order: BodegaOrder) => void;
  addMovimientoBodega: (order: BodegaOrder) => void;
}

const BodegaHistoryContext = createContext<BodegaHistoryContextType | undefined>(undefined);

export const BodegaHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ingresos, setIngresos] = useState<Box[]>([]);
  const [salidas, setSalidas] = useState<BodegaOrder[]>([]);
  const [movimientosBodega, setMovimientosBodega] = useState<BodegaOrder[]>([]);

  const addIngreso = (box: Box) => setIngresos((prev) => [...prev, box]);
  const addSalida = (order: BodegaOrder) => setSalidas((prev) => [...prev, order]);
  const addMovimientoBodega = (order: BodegaOrder) => setMovimientosBodega((prev) => [...prev, order]);

  return (
    <BodegaHistoryContext.Provider value={{ ingresos, salidas, movimientosBodega, addIngreso, addSalida, addMovimientoBodega }}>
      {children}
    </BodegaHistoryContext.Provider>
  );
};

export const useBodegaHistory = () => {
  const ctx = useContext(BodegaHistoryContext);
  if (!ctx) throw new Error("useBodegaHistory debe usarse dentro de BodegaHistoryProvider");
  return ctx;
};
