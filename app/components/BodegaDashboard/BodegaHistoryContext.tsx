"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AlertHistoryEntry, BodegaOrder, Box, HistoryState } from "../../interfaces/bodega";
import {
  DEFAULT_WAREHOUSE_ID,
  defaultHistoryState,
  saveHistoryState,
  subscribeHistoryState,
} from "../../../lib/bodegaCloudState";

interface BodegaHistoryContextType extends HistoryState {
  warehouseId: string;
  setWarehouseId: (id: string) => void;
  addIngreso: (box: Box) => void;
  addSalida: (order: BodegaOrder) => void;
  addMovimientoBodega: (order: BodegaOrder) => void;
  addAlerta: (alert: AlertHistoryEntry) => void;
}

const BodegaHistoryContext = createContext<BodegaHistoryContextType | undefined>(undefined);

export const BodegaHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryState>(defaultHistoryState);
  const isRemoteUpdate = useRef(false);
  const [warehouseId, setWarehouseIdState] = useState<string>(DEFAULT_WAREHOUSE_ID);

  useEffect(() => {
    const unsub = subscribeHistoryState(warehouseId, (cloud) => {
      isRemoteUpdate.current = true;
      setHistory(cloud);
    });
    return unsub;
  }, [warehouseId]);

  const persist = useCallback(
    (updater: (prev: HistoryState) => HistoryState) => {
      setHistory((prev) => {
        const next = updater(prev);
        if (isRemoteUpdate.current) {
          isRemoteUpdate.current = false;
          return next;
        }
        saveHistoryState(warehouseId, next).catch(() => {});
        return next;
      });
    },
    [warehouseId],
  );

  const addIngreso = useCallback(
    (box: Box) => {
      persist((prev) => ({ ...prev, ingresos: [...prev.ingresos, box] }));
    },
    [persist],
  );

  const addSalida = useCallback(
    (order: BodegaOrder) => {
      persist((prev) => ({ ...prev, salidas: [...prev.salidas, order] }));
    },
    [persist],
  );

  const addMovimientoBodega = useCallback(
    (order: BodegaOrder) => {
      persist((prev) => ({ ...prev, movimientosBodega: [...prev.movimientosBodega, order] }));
    },
    [persist],
  );

  const addAlerta = useCallback(
    (alert: AlertHistoryEntry) => {
      persist((prev) => {
        const exists = prev.alertas.some(
          (item) => item.id === alert.id && item.createdAtMs === alert.createdAtMs,
        );
        if (exists) return prev;
        return { ...prev, alertas: [...prev.alertas, alert] };
      });
    },
    [persist],
  );

  const value: BodegaHistoryContextType = {
    ...history,
    warehouseId,
    setWarehouseId: (id: string) => {
      setHistory(defaultHistoryState);
      setWarehouseIdState(id || DEFAULT_WAREHOUSE_ID);
    },
    addIngreso,
    addSalida,
    addMovimientoBodega,
    addAlerta,
  };

  return <BodegaHistoryContext.Provider value={value}>{children}</BodegaHistoryContext.Provider>;
};

export const useBodegaHistory = () => {
  const ctx = useContext(BodegaHistoryContext);
  if (!ctx) throw new Error("useBodegaHistory debe usarse dentro de BodegaHistoryProvider");
  return ctx;
};
