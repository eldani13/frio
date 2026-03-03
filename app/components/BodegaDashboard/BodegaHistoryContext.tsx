"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Box, BodegaOrder } from "../../interfaces/bodega";

const HISTORY_STORAGE_KEY = "bodegaHistoryV2";

type AlertHistoryEntry = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  createdAtMs: number;
  meta?: string;
};

type HistoryState = {
  ingresos: Box[];
  salidas: BodegaOrder[];
  movimientosBodega: BodegaOrder[];
  alertas: AlertHistoryEntry[];
};

const defaultHistory: HistoryState = {
  ingresos: [],
  salidas: [],
  movimientosBodega: [],
  alertas: [],
};

interface BodegaHistoryContextType extends HistoryState {
  addIngreso: (box: Box) => void;
  addSalida: (order: BodegaOrder) => void;
  addMovimientoBodega: (order: BodegaOrder) => void;
  addAlerta: (alert: AlertHistoryEntry) => void;
}

const BodegaHistoryContext = createContext<BodegaHistoryContextType | undefined>(undefined);

const loadHistory = (): HistoryState => {
  if (typeof window === "undefined") return defaultHistory;
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return defaultHistory;
    const parsed = JSON.parse(raw);
    const ingresos = Array.isArray(parsed?.ingresos)
      ? parsed.ingresos.map((box: any) => ({
          ...box,
          client:
            typeof box?.client === "string"
              ? box.client
              : typeof box?.customer === "string"
                ? box.customer
                : "cliente1",
        }))
      : [];
    const salidas = Array.isArray(parsed?.salidas)
      ? parsed.salidas.map((order: any) => ({
          ...order,
          client: typeof order?.client === "string" ? order.client : undefined,
          autoId: typeof order?.autoId === "string" ? order.autoId : undefined,
          boxName: typeof order?.boxName === "string" ? order.boxName : undefined,
        }))
      : [];
    const movimientosBodega = Array.isArray(parsed?.movimientosBodega)
      ? parsed.movimientosBodega.map((order: any) => ({
          ...order,
          client: typeof order?.client === "string" ? order.client : undefined,
          autoId: typeof order?.autoId === "string" ? order.autoId : undefined,
          boxName: typeof order?.boxName === "string" ? order.boxName : undefined,
        }))
      : [];
    const alertas = Array.isArray(parsed?.alertas)
      ? parsed.alertas.map((alert: any) => ({
          ...alert,
          meta: typeof alert?.meta === "string" ? alert.meta : alert?.meta,
        }))
      : [];
    return {
      ingresos,
      salidas,
      movimientosBodega,
      alertas,
    } satisfies HistoryState;
  } catch {
    return defaultHistory;
  }
};

export const BodegaHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryState>(() => loadHistory());

  const persist = useCallback((updater: (prev: HistoryState) => HistoryState) => {
    setHistory((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  }, []);

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

  // Mantener sincronizado entre pestañas
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === HISTORY_STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          const ingresos = Array.isArray(parsed?.ingresos)
            ? parsed.ingresos.map((box: any) => ({
                ...box,
                client:
                  typeof box?.client === "string"
                    ? box.client
                    : typeof box?.customer === "string"
                      ? box.customer
                      : "cliente1",
              }))
            : [];
          const salidas = Array.isArray(parsed?.salidas)
            ? parsed.salidas.map((order: any) => ({
                ...order,
                client: typeof order?.client === "string" ? order.client : undefined,
                autoId: typeof order?.autoId === "string" ? order.autoId : undefined,
                boxName: typeof order?.boxName === "string" ? order.boxName : undefined,
              }))
            : [];
          const movimientosBodega = Array.isArray(parsed?.movimientosBodega)
            ? parsed.movimientosBodega.map((order: any) => ({
                ...order,
                client: typeof order?.client === "string" ? order.client : undefined,
                autoId: typeof order?.autoId === "string" ? order.autoId : undefined,
                boxName: typeof order?.boxName === "string" ? order.boxName : undefined,
              }))
            : [];
          const alertas = Array.isArray(parsed?.alertas)
            ? parsed.alertas.map((alert: any) => ({
                ...alert,
                meta: typeof alert?.meta === "string" ? alert.meta : alert?.meta,
              }))
            : [];
          setHistory({
            ingresos,
            salidas,
            movimientosBodega,
            alertas,
          });
        } catch {
          // ignore parse errors
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handler);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handler);
      }
    };
  }, []);

  const value: BodegaHistoryContextType = {
    ...history,
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
