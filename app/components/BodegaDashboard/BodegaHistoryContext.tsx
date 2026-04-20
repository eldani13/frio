"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  AlertHistoryEntry,
  BodegaOrder,
  Box,
  DispatchedHistoryEntry,
  HistoryState,
} from "../../interfaces/bodega";
import { useAuth } from "@/app/context/AuthContext";
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
  addDespachado: (entry: DispatchedHistoryEntry) => void;
}

const BodegaHistoryContext = createContext<BodegaHistoryContextType | undefined>(undefined);

export const BodegaHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryState>(defaultHistoryState);
  const [warehouseId, setWarehouseIdState] = useState<string>(DEFAULT_WAREHOUSE_ID);
  const previousWarehouseIdRef = useRef<string | null>(null);

  /** Solo limpiar historial en memoria cuando cambia la bodega (no en cada render). */
  const setWarehouseId = useCallback((id: string) => {
    const next = (id || DEFAULT_WAREHOUSE_ID).trim() || DEFAULT_WAREHOUSE_ID;
    setWarehouseIdState(next);
  }, []);

  useEffect(() => {
    if (previousWarehouseIdRef.current === null) {
      previousWarehouseIdRef.current = warehouseId;
      return;
    }
    if (previousWarehouseIdRef.current !== warehouseId) {
      previousWarehouseIdRef.current = warehouseId;
      setHistory(defaultHistoryState);
    }
  }, [warehouseId]);

  /**
   * No suscribir a Firestore hasta tener sesión: si `request.auth` es null las reglas
   * deniegan la lectura (p. ej. en la pantalla de login el provider igual está montado).
   */
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setHistory(defaultHistoryState);
      return;
    }
    const unsub = subscribeHistoryState(warehouseId, (cloud) => {
      setHistory(cloud);
    });
    return unsub;
  }, [warehouseId, authLoading, session]);

  const persist = useCallback(
    (updater: (prev: HistoryState) => HistoryState) => {
      setHistory((prev) => {
        const next = updater(prev);
        saveHistoryState(warehouseId, next).catch((err) => {
          console.error("[bodega] saveHistoryState:", err);
        });
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
      persist((prev) => {
        const withoutDup = prev.salidas.filter((o) => o.id !== order.id);
        return { ...prev, salidas: [...withoutDup, order] };
      });
    },
    [persist],
  );

  const addMovimientoBodega = useCallback(
    (order: BodegaOrder) => {
      persist((prev) => {
        const withoutDup = prev.movimientosBodega.filter((o) => o.id !== order.id);
        return { ...prev, movimientosBodega: [...withoutDup, order] };
      });
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

  const addDespachado = useCallback(
    (entry: DispatchedHistoryEntry) => {
      persist((prev) => ({
        ...prev,
        despachadosHistorial: [...(prev.despachadosHistorial ?? []), entry],
      }));
    },
    [persist],
  );

  const value: BodegaHistoryContextType = {
    ...history,
    despachadosHistorial: history.despachadosHistorial ?? [],
    warehouseId,
    setWarehouseId,
    addIngreso,
    addSalida,
    addMovimientoBodega,
    addAlerta,
    addDespachado,
  };

  return <BodegaHistoryContext.Provider value={value}>{children}</BodegaHistoryContext.Provider>;
};

export const useBodegaHistory = () => {
  const ctx = useContext(BodegaHistoryContext);
  if (!ctx) throw new Error("useBodegaHistory debe usarse dentro de BodegaHistoryProvider");
  return ctx;
};
