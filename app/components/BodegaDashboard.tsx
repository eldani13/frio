"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useBodegaHistory } from "./BodegaDashboard/BodegaHistoryContext";
import EstadoBodegaSection from "./BodegaDashboard/EstadoBodegaSection";
import IngresosSection from "./BodegaDashboard/IngresosSection";
import OrdenesJefeSection from "./BodegaDashboard/OrdenesJefeSection";
import DespachadosSection from "./BodegaDashboard/DespachadosSection";
import ReportesSection from "./BodegaDashboard/ReportesSection";
import CustodioOrdenesCompraTab from "./BodegaDashboard/CustodioOrdenesCompraTab";
import CustodioOrdenesVentaTab from "./BodegaDashboard/CustodioOrdenesVentaTab";
import { TransporteViajesPanel } from "./BodegaDashboard/TransporteViajesPanel";
import { OrdenCompraService } from "@/app/services/ordenCompraService";
import { OrdenVentaService } from "@/app/services/ordenVentaService";
import { ViajeVentaTransporteService } from "@/app/services/viajeVentaTransporteService";
import { TruckService } from "@/app/services/camionService";
import type { Camion } from "@/app/types/camion";
import type { VentaPendienteCartonaje } from "@/app/types/ventaCuenta";
import { SolicitudProcesamientoService } from "@/app/services/solicitudProcesamientoService";
import type { SolicitudProcesamiento } from "@/app/types/solicitudProcesamiento";
import { CatalogoService } from "@/app/services/catalogoService";
import type { Catalogo } from "@/app/types/catalogo";
import { primarioCatalogoPorId } from "@/app/lib/procesamientoDisplay";
import {
  almacenProductCodeFromCatalogo,
  boxesWithAlmacenProductCodeFilled,
  slotsWithAlmacenProductCodeFilled,
} from "@/lib/almacenProductCode";
import { normalizeProcesamientoEstado } from "@/app/types/solicitudProcesamiento";
import { procesamientoUbicacionCompletaEnMapa } from "@/app/lib/pendientesMovimientoProcesamiento";
import {
  BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS,
  BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS,
  BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS,
  BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS,
} from "@/app/lib/bodegaDisplay";
import {
  deductSlotsAfterProcesamientoTerminado,
  findSlotPrimarioParaDevolverDesperdicio,
  tareaColaOperarioToSolicitudInventario,
  type ResultadoDescuentoProcesamiento,
} from "@/lib/procesamientoInventarioBodega";
import { planSalidaVentaDesdeMapa } from "@/lib/ventaSalidaBodegaMatch";
import type { IngresoDesdeOrdenCompraPayload } from "./BodegaDashboard/OcOrdenIngresoPanel";
import type { IngresoDesdeOrdenVentaPayload } from "./BodegaDashboard/OcOrdenVentaIngresoPanel";
import { AiTwotoneAppstore } from "react-icons/ai";
import { SlGraph } from "react-icons/sl";
import { FaBoxOpen } from "react-icons/fa6";
import {
  FiAlertTriangle,
  FiClipboard,
} from "react-icons/fi";
import { BodegaZonaEstadoModalShell } from "./bodega/BodegaZonaEstadoModalShell";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db, getSecondaryAuth } from "../../lib/firebaseClient";
import Header from "./bodega/Header";
import MessageBanner from "./bodega/MessageBanner";
import ConfiguratorPanel from "./bodega/ConfiguratorPanel";
import type {
  AlertAssignment,
  AlertHistoryEntry,
  AlertItem,
  BodegaOrder,
  BodegaStats,
  Client,
  ConfigUser,
  Box,
  OrderSource,
  OrderType,
  ProcesamientoOrigenOrden,
  Role,
  Slot,
} from "../interfaces/bodega";
import RequestsQueue from "./bodega/RequestsQueue";
import LoginCard from "./bodega/LoginCard";
import { LoginPolariaBackdrop } from "./bodega/LoginPolariaBackdrop";
import { kgSobranteParaDevolucionMapa, unidadesSecundarioEnterasParaMapa } from "@/app/lib/sobranteKg";
import {
  DEFAULT_WAREHOUSE_ID,
  ensureHistoryState,
  ensureWarehouseState,
  saveWarehouseState,
  subscribeWarehouseState,
} from "../../lib/bodegaCloudState";
import {
  coerceKgFromUnknown,
  kgFromFirestoreSlotRecord,
  slotTracePartialFromRecord,
} from "../../lib/coerceBodegaKg";
import { fetchFridemSlots } from "../../lib/fridemInventory";
import {
  getLoginRoleShortcuts,
  loginRoleShortcutsEnabled,
} from "../../lib/loginRolePresets";
import { BiTask } from "react-icons/bi";
import { MdOutlinePointOfSale } from "react-icons/md";

// --- SESION DESDE FIREBASE ---
type Session = {
  uid: string;
  email: string | null;
  role: Role;
  displayName: string;
  clientId?: string;
  /** Código de cuenta (`clientes/{id}.code`), para consultas en vivo por cuenta. */
  codeCuenta?: string;
};

type UserProfile = {
  role: Role;
  displayName: string;
  clientId?: string;
};

/** `users` = perfil legado / Auth; `usuarios` = catálogo que lee el dashboard (asignar operario, etc.). */
type LoadedUserProfile = UserProfile & { profileCollection: "users" | "usuarios" };

// --- TIPOS Y CONSTANTES ---
const DEFAULT_TOTAL_SLOTS = 12;
const WAREHOUSE_ID = DEFAULT_WAREHOUSE_ID;

/** > este valor (°C) dispara alertas de temperatura (misma regla que reportes / jefe). */
const HIGH_TEMP_ALERT_THRESHOLD = 5;

/**
 * Firestore o ediciones manuales pueden guardar la temperatura como string;
 * si solo aceptamos `number`, se pierde el valor y no hay alertas en tiempo real.
 */
function coerceTemperatureFromCloud(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = Number(String(value).trim().replace(",", "."));
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function etiquetaRolColaProcesamiento(r: Role | string | undefined): string {
  const key = String(r ?? "").toLowerCase().trim();
  if (key === "procesador") return "Procesador";
  if (key === "operario") return "Operario";
  if (key === "operador") return "Operador bodega";
  return key ? String(r) : "";
}

type AlertReason = "no_tuve_tiempo" | "no_quise" | "no_pude";

type WarehouseMeta = {
  id: string;
  name?: string;
  status?: string;
  capacity?: number;
  disabled?: boolean;
  createdAt?: string;
  disabledAt?: string;
  codeCuenta?: string;
};

type ZoneKey = "entrada" | "bodega" | "salida";
type ModalKind = "alertas" | "tareas";

type DetailItem = {
  id: string;
  title: string;
  description: string;
  meta?: string;
};

const defaultStats: BodegaStats = {
  ingresos: 0,
  salidas: 0,
  movimientosBodega: 0,
};

const ALERT_REASONS: Array<{ value: AlertReason; label: string }> = [
  { value: "no_tuve_tiempo", label: "No tuve tiempo" },
  { value: "no_quise", label: "No quise" },
  { value: "no_pude", label: "No pude" },
];
const ALERT_DELAY_MS = 2 * 60 * 1000;
const ALERT_ORDER_PREFIX = "alerta-orden-";
const ALERT_REPORT_PREFIX = "alerta-fallo-";

function orderIsOverdue(order: BodegaOrder, alertClock: number): boolean {
  return alertClock - order.createdAtMs >= ALERT_DELAY_MS;
}

/** Casillero con caja registrada (nombre o autoId). */
function boxCasilleroConCaja(box: Box): boolean {
  return Boolean(String(box.autoId ?? "").trim() || String(box.name ?? "").trim());
}

const normalizeCapacity = (value?: number) => {
  if (typeof value !== "number") return DEFAULT_TOTAL_SLOTS;
  const safe = Math.max(0, Math.floor(value));
  return Number.isFinite(safe) ? safe : DEFAULT_TOTAL_SLOTS;
};

const createInitialSlots = (size = DEFAULT_TOTAL_SLOTS): Slot[] =>
  Array.from({ length: Math.max(0, size) }, (_, index) => ({
    position: index + 1,
    autoId: "",
    name: "",
    temperature: null,
    client: "",
  }));

/** Al vaciar una posición del mapa se eliminan también trazas guardadas en el slot. */
const CLEARED_BODEGA_SLOT_PATCH: Partial<Slot> = {
  autoId: "",
  name: "",
  temperature: null,
  client: "",
  quantityKg: undefined,
  ordenCompraId: undefined,
  ordenCompraClienteId: undefined,
  ordenVentaId: undefined,
  ordenVentaClienteId: undefined,
  rd: undefined,
  renglon: undefined,
  lote: undefined,
  marca: undefined,
  embalaje: undefined,
  pesoUnitario: undefined,
  piezas: undefined,
  caducidad: undefined,
  fechaIngreso: undefined,
  llaveUnica: undefined,
  procesamientoSecundarioTitulo: undefined,
  procesamientoUnidadesSecundario: undefined,
  procesamientoSolicitudId: undefined,
  procesamientoDesperdicioDevueltoSolicitudId: undefined,
  catalogoProductId: undefined,
  almacenProductCode: undefined,
};

const padNumber = (value: number, length: number) =>
  String(value).padStart(length, "0");

const getDateStamp = (date: Date) =>
  `${date.getFullYear()}${padNumber(date.getMonth() + 1, 2)}${padNumber(
    date.getDate(),
    2,
  )}`;

const createAutoId = (() => {
  const counters: Record<string, number> = {};
  return (prefix: string) => {
    const dateStamp = getDateStamp(new Date());
    const key = `${prefix}:${dateStamp}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return `${prefix}-${dateStamp}-${padNumber(counters[key], 3)}`;
  };
})();

const isValidRole = (value: unknown): value is Role =>
  value === "custodio" ||
  value === "administrador" ||
  value === "operario" ||
  value === "procesador" ||
  value === "jefe" ||
  value === "cliente" ||
  value === "configurador" ||
  value === "operadorCuentas" ||
  value === "transporte";

const normalizeSlots = (value: unknown, expectedSize = DEFAULT_TOTAL_SLOTS): Slot[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const target = normalizeCapacity(expectedSize);
  const map = new Map<number, Slot>();

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const position = typeof record.position === "number" ? Math.floor(record.position) : NaN;
    if (!Number.isFinite(position) || position < 1) {
      continue;
    }
    const autoId = record.autoId;
    const name = record.name;
    const temperature = record.temperature;
    const client = record.client;

    const legacyName = typeof record.itemId === "string" ? record.itemId : "";
    const normalizedName = typeof name === "string" ? name : legacyName;
    const normalizedAutoId =
      typeof autoId === "string"
        ? autoId
        : normalizedName
          ? createAutoId("BOX")
          : "";
    const normalizedTemp = coerceTemperatureFromCloud(temperature);
    const normalizedClient =
      typeof client === "string"
        ? client
        : typeof record.customer === "string"
          ? record.customer
          : "";
    const quantityKg = kgFromFirestoreSlotRecord(record);
    const traceFromRecord = slotTracePartialFromRecord(record) as Partial<Slot>;
    const procSecTituloRaw = record.procesamientoSecundarioTitulo;
    const procSecTitulo =
      typeof procSecTituloRaw === "string" && procSecTituloRaw.trim()
        ? procSecTituloRaw.trim().slice(0, 240)
        : undefined;
    const procSecU = coerceKgFromUnknown(record.procesamientoUnidadesSecundario);
    const procSecUnits =
      procSecU !== undefined && Number.isFinite(procSecU) && procSecU > 0 ? procSecU : undefined;
    const procSolRaw = record.procesamientoSolicitudId;
    const procSolId =
      typeof procSolRaw === "string" && procSolRaw.trim() ? procSolRaw.trim() : undefined;
    const procDespDevRaw = record.procesamientoDesperdicioDevueltoSolicitudId;
    const procDespDevId =
      typeof procDespDevRaw === "string" && procDespDevRaw.trim()
        ? procDespDevRaw.trim().slice(0, 120)
        : undefined;
    const catalogoProductIdRaw = record.catalogoProductId;
    const catalogoProductId =
      typeof catalogoProductIdRaw === "string" && catalogoProductIdRaw.trim()
        ? catalogoProductIdRaw.trim()
        : undefined;
    const almacenProductCodeRaw = record.almacenProductCode;
    const almacenProductCode =
      typeof almacenProductCodeRaw === "string" && almacenProductCodeRaw.trim()
        ? almacenProductCodeRaw.trim()
        : undefined;
    const ordenCompraId =
      typeof record.ordenCompraId === "string" && record.ordenCompraId.trim()
        ? record.ordenCompraId.trim()
        : undefined;
    const ordenCompraClienteId =
      typeof record.ordenCompraClienteId === "string" && record.ordenCompraClienteId.trim()
        ? record.ordenCompraClienteId.trim()
        : undefined;
    const ordenVentaId =
      typeof record.ordenVentaId === "string" && record.ordenVentaId.trim()
        ? record.ordenVentaId.trim()
        : undefined;
    const ordenVentaClienteId =
      typeof record.ordenVentaClienteId === "string" && record.ordenVentaClienteId.trim()
        ? record.ordenVentaClienteId.trim()
        : undefined;

    map.set(position, {
      position,
      autoId: normalizedAutoId,
      name: normalizedName,
      temperature: normalizedTemp,
      client: normalizedClient,
      ...(quantityKg !== undefined ? { quantityKg } : {}),
      ...traceFromRecord,
      ...(procSecTitulo ? { procesamientoSecundarioTitulo: procSecTitulo } : {}),
      ...(procSecUnits !== undefined ? { procesamientoUnidadesSecundario: procSecUnits } : {}),
      ...(procSolId ? { procesamientoSolicitudId: procSolId } : {}),
      ...(procDespDevId ? { procesamientoDesperdicioDevueltoSolicitudId: procDespDevId } : {}),
      ...(catalogoProductId ? { catalogoProductId } : {}),
      ...(almacenProductCode ? { almacenProductCode } : {}),
      ...(ordenCompraId ? { ordenCompraId } : {}),
      ...(ordenCompraClienteId ? { ordenCompraClienteId } : {}),
      ...(ordenVentaId ? { ordenVentaId } : {}),
      ...(ordenVentaClienteId ? { ordenVentaClienteId } : {}),
    });
  }

  /** Siempre 1…target: antes se apilaban primero las posiciones “presentes” y los huecos al final (p. ej. 1 abajo). */
  const result: Slot[] = [];
  for (let pos = 1; pos <= target; pos += 1) {
    const existing = map.get(pos);
    if (existing) {
      result.push(existing);
    } else {
      result.push({ position: pos, autoId: "", name: "", temperature: null, client: "" });
    }
  }

  return result;
};

const resizeSlotsToCapacity = (slots: Slot[], capacity: number) =>
  normalizeSlots(slots, capacity) ?? createInitialSlots(capacity);

const readQuantityKg = (item: Box | Slot | undefined): number | undefined => {
  if (!item) return undefined;
  return kgFromFirestoreSlotRecord(item as unknown as Record<string, unknown>);
};

/** Referencia a la OC en Firestore (cliente + id documento), si la caja/slot la trae. */
const readOrdenCompraRefs = (
  item: Box | Slot | undefined,
): { ordenCompraId: string; ordenCompraClienteId: string } | null => {
  if (!item) return null;
  const oid =
    "ordenCompraId" in item && typeof item.ordenCompraId === "string"
      ? item.ordenCompraId.trim()
      : "";
  const cid =
    "ordenCompraClienteId" in item && typeof item.ordenCompraClienteId === "string"
      ? item.ordenCompraClienteId.trim()
      : "";
  if (!oid || !cid) return null;
  return { ordenCompraId: oid, ordenCompraClienteId: cid };
};

const readOrdenVentaRefs = (
  item: Box | Slot | undefined,
): { ordenVentaId: string; ordenVentaClienteId: string } | null => {
  if (!item) return null;
  const oid =
    "ordenVentaId" in item && typeof item.ordenVentaId === "string"
      ? item.ordenVentaId.trim()
      : "";
  const cid =
    "ordenVentaClienteId" in item && typeof item.ordenVentaClienteId === "string"
      ? item.ordenVentaClienteId.trim()
      : "";
  if (!oid || !cid) return null;
  return { ordenVentaId: oid, ordenVentaClienteId: cid };
};

const filterBoxesByCapacity = (items: Box[], capacity: number) =>
  items.filter((item) => item.position <= capacity);

const filterOrdersByCapacity = (items: BodegaOrder[], capacity: number) =>
  items.filter((order) => {
    /** Origen virtual (pos. 0): no filtrar por `capacity` del almacén para no perder órdenes pendientes si el cupo en Firestore no coincide con el mapa. */
    if (order.type === "a_bodega" && order.sourceZone === "procesamiento") {
      return true;
    }
    const within = (value?: number) => typeof value !== "number" || value <= capacity;
    return within(order.sourcePosition) && within(order.targetPosition);
  });

const normalizeBoxes = (value: unknown): Box[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const boxes: Box[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const client = record.client;
    const rawPos = record.position;
    const positionNum = Math.floor(
      typeof rawPos === "number" && Number.isFinite(rawPos)
        ? rawPos
        : Number(String(rawPos ?? "").trim()),
    );
    if (!Number.isFinite(positionNum) || positionNum < 1) {
      continue;
    }
    const temperature = coerceTemperatureFromCloud(record.temperature);
    if (temperature === null) {
      continue;
    }

    const legacyName = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name : legacyName;
    const autoId =
      typeof record.autoId === "string"
        ? record.autoId
        : name
          ? createAutoId("BOX")
          : "";
    const quantityKg = kgFromFirestoreSlotRecord(record);
    const ordenCompraId =
      typeof record.ordenCompraId === "string" && record.ordenCompraId.trim()
        ? record.ordenCompraId.trim()
        : undefined;
    const ordenCompraClienteId =
      typeof record.ordenCompraClienteId === "string" && record.ordenCompraClienteId.trim()
        ? record.ordenCompraClienteId.trim()
        : undefined;
    const ordenVentaId =
      typeof record.ordenVentaId === "string" && record.ordenVentaId.trim()
        ? record.ordenVentaId.trim()
        : undefined;
    const ordenVentaClienteId =
      typeof record.ordenVentaClienteId === "string" && record.ordenVentaClienteId.trim()
        ? record.ordenVentaClienteId.trim()
        : undefined;
    const catalogoProductIdRaw = record.catalogoProductId;
    const catalogoProductId =
      typeof catalogoProductIdRaw === "string" && catalogoProductIdRaw.trim()
        ? catalogoProductIdRaw.trim()
        : undefined;
    const almacenProductCodeRaw = record.almacenProductCode;
    const almacenProductCode =
      typeof almacenProductCodeRaw === "string" && almacenProductCodeRaw.trim()
        ? almacenProductCodeRaw.trim()
        : undefined;

    boxes.push({
      position: positionNum,
      autoId,
      name: name ?? "",
      temperature,
      client:
        typeof client === "string"
          ? client
          : typeof record.customer === "string"
            ? record.customer
            : "cliente1",
      ...(quantityKg !== undefined ? { quantityKg } : {}),
      ...(ordenCompraId ? { ordenCompraId } : {}),
      ...(ordenCompraClienteId ? { ordenCompraClienteId } : {}),
      ...(ordenVentaId ? { ordenVentaId } : {}),
      ...(ordenVentaClienteId ? { ordenVentaClienteId } : {}),
      ...(catalogoProductId ? { catalogoProductId } : {}),
      ...(almacenProductCode ? { almacenProductCode } : {}),
    });
  }

  return boxes;
};

const normalizeOrders = (value: unknown): BodegaOrder[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const orders: BodegaOrder[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const id = record.id;
    const type = record.type;
    const createdAt = record.createdAt;
    const createdBy = record.createdBy;
    const createdAtMs = record.createdAtMs;
    if (
      typeof id !== "string" ||
      (type !== "a_bodega" && type !== "a_salida" && type !== "revisar")
    ) {
      continue;
    }

    const sz = record.sourceZone;
    const sourceZone: OrderSource =
      sz === "bodega"
        ? "bodega"
        : sz === "salida"
          ? "salida"
          : sz === "procesamiento"
            ? "procesamiento"
            : "ingresos";

    let procesamientoOrigen: ProcesamientoOrigenOrden | undefined;
    let sourcePosition: number | null = null;

    if (sourceZone === "procesamiento") {
      const po = record.procesamientoOrigen;
      if (typeof po !== "object" || po === null) {
        continue;
      }
      const pr = po as Record<string, unknown>;
      const cuentaClientId = typeof pr.cuentaClientId === "string" ? pr.cuentaClientId.trim() : "";
      const solicitudId = typeof pr.solicitudId === "string" ? pr.solicitudId.trim() : "";
      if (!cuentaClientId || !solicitudId) {
        continue;
      }
      const uv = pr.unidadPrimarioVisualizacion;
      const rd = pr.rolDevolucion;
      const rolDevolucion =
        rd === "desperdicio" || rd === "procesado" ? rd : undefined;
      const skRaw = pr.sobranteKg;
      const sobranteKgParsed =
        typeof skRaw === "number" && Number.isFinite(skRaw) ? Math.max(0, skRaw) : undefined;
      const dkRaw = pr.desperdicioKg;
      const desperdicioKgLegacy =
        typeof dkRaw === "number" && Number.isFinite(dkRaw) ? Math.max(0, dkRaw) : undefined;
      const productoSecundarioIdRaw = pr.productoSecundarioId;
      const productoSecundarioId =
        typeof productoSecundarioIdRaw === "string" && productoSecundarioIdRaw.trim()
          ? productoSecundarioIdRaw.trim()
          : undefined;
      const cap = (k: string) => {
        const v = pr[k];
        return typeof v === "string" && v.trim() ? v.trim() : undefined;
      };
      const catalogoAlmacenCodePrimario = cap("catalogoAlmacenCodePrimario");
      const catalogoAlmacenCodeSecundario = cap("catalogoAlmacenCodeSecundario");
      procesamientoOrigen = {
        cuentaClientId,
        solicitudId,
        numero: typeof pr.numero === "string" ? pr.numero : "",
        productoPrimarioTitulo:
          typeof pr.productoPrimarioTitulo === "string" ? pr.productoPrimarioTitulo : "",
        productoSecundarioTitulo:
          typeof pr.productoSecundarioTitulo === "string" ? pr.productoSecundarioTitulo : "",
        productoPrimarioId: typeof pr.productoPrimarioId === "string" ? pr.productoPrimarioId : undefined,
        ...(productoSecundarioId ? { productoSecundarioId } : {}),
        cantidadPrimario:
          typeof pr.cantidadPrimario === "number" && Number.isFinite(pr.cantidadPrimario)
            ? pr.cantidadPrimario
            : 0,
        unidadPrimarioVisualizacion:
          uv === "peso" || uv === "cantidad" ? uv : undefined,
        estimadoUnidadesSecundario:
          typeof pr.estimadoUnidadesSecundario === "number" &&
          Number.isFinite(pr.estimadoUnidadesSecundario)
            ? pr.estimadoUnidadesSecundario
            : pr.estimadoUnidadesSecundario === null
              ? null
              : undefined,
        ...(rolDevolucion ? { rolDevolucion } : {}),
        ...(sobranteKgParsed !== undefined ? { sobranteKg: sobranteKgParsed } : {}),
        ...(desperdicioKgLegacy !== undefined ? { desperdicioKg: desperdicioKgLegacy } : {}),
        ...(catalogoAlmacenCodePrimario ? { catalogoAlmacenCodePrimario } : {}),
        ...(catalogoAlmacenCodeSecundario ? { catalogoAlmacenCodeSecundario } : {}),
      };
      sourcePosition =
        typeof record.sourcePosition === "number" && Number.isFinite(record.sourcePosition)
          ? record.sourcePosition
          : 0;
    } else {
      sourcePosition =
        typeof record.sourcePosition === "number"
          ? record.sourcePosition
          : typeof record.boxPosition === "number"
            ? record.boxPosition
            : null;
      if (sourcePosition === null) {
        continue;
      }
    }

    const targetPosition =
      typeof record.targetPosition === "number"
        ? record.targetPosition
        : undefined;

    const normalizedCreatedAtMs =
      typeof createdAtMs === "number" && Number.isFinite(createdAtMs)
        ? createdAtMs
        : Date.now();

    const createdAtStr =
      typeof createdAt === "string"
        ? createdAt
        : new Date(normalizedCreatedAtMs).toLocaleString("es-CO");

    orders.push({
      id,
      type,
      sourcePosition,
      sourceZone,
      targetPosition,
      createdAt: createdAtStr,
      createdAtMs: normalizedCreatedAtMs,
      createdBy: isValidRole(createdBy) ? (createdBy as Role) : "custodio",
      client: typeof record.client === "string" ? record.client : undefined,
      autoId: typeof record.autoId === "string" ? record.autoId : undefined,
      boxName: typeof record.boxName === "string" ? record.boxName : undefined,
      ...(procesamientoOrigen ? { procesamientoOrigen } : {}),
    });
  }

  return orders;
};

function solicitudLikeFromProcesamientoOrigen(po: ProcesamientoOrigenOrden): SolicitudProcesamiento {
  const uv = po.unidadPrimarioVisualizacion;
  return {
    id: po.solicitudId,
    clientId: po.cuentaClientId,
    codeCuenta: "",
    clientName: "",
    creadoPorNombre: "",
    creadoPorUid: "",
    numero: po.numero,
    numericId: 0,
    productoPrimarioId: po.productoPrimarioId ?? "",
    productoPrimarioTitulo: po.productoPrimarioTitulo,
    productoSecundarioId: po.productoSecundarioId ?? "",
    productoSecundarioTitulo: po.productoSecundarioTitulo,
    cantidadPrimario: po.cantidadPrimario,
    unidadPrimarioVisualizacion: uv === "peso" || uv === "cantidad" ? uv : "peso",
    fecha: "",
    estado: normalizeProcesamientoEstado("Pendiente"),
  };
}

const createOrderId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `orden-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const createAlertId = (prefix: string) =>
  `${prefix}${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const sortByPosition = <T extends { position: number }>(items: T[]) =>
  [...items].sort((a, b) => a.position - b.position);

const getNextIngresoPosition = (boxes: Box[], capacity?: number) => {
  const max = capacity && capacity > 0 ? capacity : undefined;
  const occupied = new Set(boxes.map((box) => box.position));
  if (max) {
    for (let next = 1; next <= max; next++) {
      if (!occupied.has(next)) return next;
    }
    return 0;
  }
  let next = 1;
  while (occupied.has(next)) {
    next += 1;
  }
  return next;
};

/** Primer hueco libre en zona de salida (1..capacity). 0 = sin cupo (antes se devolvía `capacity` aunque estuviera ocupado). */
const getNextSalidaPosition = (boxes: Box[], reserved?: Set<number>, capacity?: number) => {
  const max = capacity && capacity > 0 ? capacity : undefined;
  const occupied = new Set(boxes.map((box) => box.position));
  if (reserved) {
    reserved.forEach((position) => occupied.add(position));
  }
  if (max) {
    for (let next = 1; next <= max; next++) {
      if (!occupied.has(next)) return next;
    }
    return 0;
  }
  let next = 1;
  while (occupied.has(next)) {
    next += 1;
  }
  return next;
};

const loadUserProfile = async (uid: string): Promise<LoadedUserProfile & { codeCuenta?: string }> => {
  const primaryRef = doc(db, "users", uid);
  const primarySnap = await getDoc(primaryRef);
  if (primarySnap.exists()) {
    const data = primarySnap.data() as Partial<UserProfile> & { name?: string };
    if (!data.role) {
      throw new Error("El perfil de usuario no tiene rol definido");
    }
    const base: LoadedUserProfile & { codeCuenta?: string } = {
      role: data.role as Role,
      displayName: data.displayName ?? data.name ?? "Usuario",
      clientId: data.clientId,
      profileCollection: "users",
    };
    if (base.clientId?.trim()) {
      try {
        const cSnap = await getDoc(doc(db, "clientes", base.clientId.trim()));
        const code = (cSnap.data()?.code ?? "").toString().trim();
        if (code) base.codeCuenta = code;
      } catch {
        /* ignorar */
      }
    }
    return base;
  }

  const secondaryRef = doc(db, "usuarios", uid);
  const secondarySnap = await getDoc(secondaryRef);
  if (!secondarySnap.exists()) {
    throw new Error("El perfil de usuario no existe en Firestore (users o usuarios)");
  }
  const data = secondarySnap.data() as Partial<UserProfile> & { name?: string };
  if (!data.role) {
    throw new Error("El perfil de usuario no tiene rol definido");
  }
  const base: LoadedUserProfile & { codeCuenta?: string } = {
    role: data.role as Role,
    displayName: data.displayName ?? data.name ?? "Usuario",
    clientId: data.clientId,
    profileCollection: "usuarios",
  };
  if (base.clientId?.trim()) {
    try {
      const cSnap = await getDoc(doc(db, "clientes", base.clientId.trim()));
      const code = (cSnap.data()?.code ?? "").toString().trim();
      if (code) base.codeCuenta = code;
    } catch {
      /* ignorar */
    }
  }
  return base;
};

/** Misma forma que `fetchUsers`: un documento de la colección `usuarios`. */
function configUserFromUsuariosDocSnap(
  docSnap: QueryDocumentSnapshot,
  sanitizeClientCode: (s: string) => string,
): ConfigUser {
  const data = docSnap.data() as {
    name?: string;
    displayName?: string;
    role?: Role;
    code?: string;
    clientId?: string;
    email?: string;
    createdAt?: { toMillis?: () => number };
    createdBy?: string | null;
    createdByRole?: Role | null;
    disabled?: boolean;
    disabledAt?: { toMillis?: () => number };
  };
  const createdAtMs =
    data.createdAt && typeof data.createdAt.toMillis === "function"
      ? data.createdAt.toMillis()
      : undefined;
  const disabledAtMs =
    data.disabledAt && typeof data.disabledAt.toMillis === "function"
      ? data.disabledAt.toMillis()
      : undefined;
  return {
    id: docSnap.id,
    name: (data.name ?? data.displayName ?? "").toString().trim() || "Sin nombre",
    code: sanitizeClientCode(data.code ?? ""),
    role: (data.role ?? "operario") as Role,
    clientId: data.clientId ?? "",
    email: data.email ?? "",
    createdAtMs,
    createdAt: createdAtMs ? new Date(createdAtMs).toLocaleString("es-CO") : undefined,
    createdBy: data.createdBy ?? null,
    createdByRole: data.createdByRole ?? null,
    disabled: Boolean(data.disabled),
    disabledAt: disabledAtMs ? new Date(disabledAtMs).toLocaleString("es-CO") : undefined,
  };
}

/**
 * Si el login resolvió solo `users/{uid}`, el jefe no ve a ese usuario en `getDocs(usuarios)` hasta que exista
 * fila en `usuarios`. Las reglas no permiten listar `users` de terceros, así que replicamos aquí (merge).
 */
async function mirrorUsersProfileToUsuariosIfNeeded(
  uid: string,
  profile: LoadedUserProfile,
  email: string | null,
) {
  if (profile.profileCollection !== "users") return;
  await setDoc(
    doc(db, "usuarios", uid),
    {
      role: profile.role,
      displayName: profile.displayName,
      name: profile.displayName,
      email: email ?? "",
      clientId: profile.clientId ?? "",
      disabled: false,
    },
    { merge: true },
  );
}

export default function BodegaDashboard() {
  const [_selectedBoxModal, setSelectedBoxModal] = useState<Box | Slot | null>(null);
  const [editTempModal, setEditTempModal] = useState<{
    position: number;
    autoId: string;
    name: string;
    temperature: number | null;
  } | null>(null);
  const [orderModalType, setOrderModalType] = React.useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "estado"
    | "ingresos"
    | "ordenesCompraCustodio"
    | "ordenesVentaCustodio"
    | "salida"
    | "ordenes"
    | "solicitudes"
    | "despachados"
    | "actividades"
    | "alertas"
    | "reportes"
    | "configuracion"
  >("estado");

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Logout error", err);
    }
    setSession(null);
    setLoginUser("");
    setLoginPassword("");
    setLoginError("");
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const credentials = await signInWithEmailAndPassword(auth, loginUser, loginPassword);
      const profile = await loadUserProfile(credentials.user.uid);
      try {
        await mirrorUsersProfileToUsuariosIfNeeded(
          credentials.user.uid,
          profile,
          credentials.user.email ?? loginUser,
        );
      } catch (mirrorErr) {
        console.warn("[bodega] No se pudo sincronizar perfil a usuarios:", mirrorErr);
      }
      setSession({
        uid: credentials.user.uid,
        email: credentials.user.email ?? loginUser,
        role: profile.role,
        displayName: profile.displayName,
        clientId: profile.clientId,
        codeCuenta: profile.codeCuenta,
      });
      setLoginUser("");
      setLoginPassword("");
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err && "message" in err
          ? (err as { message: string }).message
          : "Error al iniciar sesión";
      setLoginError(message);
      setSession(null);
    }
  };

  const [loginUser, setLoginUser] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  /** Pulso para que clientes en Reportes vuelvan al submenú de vistas al pulsar Menú en el header */
  const [reportesClienteMenuNonce, setReportesClienteMenuNonce] = useState(0);
  const [configuradorMenuNonce, setConfiguradorMenuNonce] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSession(null);
        return;
      }
      try {
        const profile = await loadUserProfile(user.uid);
        try {
          await mirrorUsersProfileToUsuariosIfNeeded(user.uid, profile, user.email ?? null);
        } catch (mirrorErr) {
          console.warn("[bodega] No se pudo sincronizar perfil a usuarios:", mirrorErr);
        }
        setSession({
          uid: user.uid,
          email: user.email ?? null,
          role: profile.role,
          displayName: profile.displayName,
          clientId: profile.clientId,
          codeCuenta: profile.codeCuenta,
        });
      } catch (err: unknown) {
        const message =
          typeof err === "object" && err && "message" in err
            ? (err as { message: string }).message
            : "No se pudo cargar el perfil de usuario";
        setLoginError(message);
        setSession(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const [slots, setSlots] = useState<Slot[]>(() => createInitialSlots());
  const [message, setMessage] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>(WAREHOUSE_ID);
  const [warehouseName, setWarehouseName] = useState<string>("");
  const [warehouses, setWarehouses] = useState<WarehouseMeta[]>([]);
  const [warehouseCapacity, setWarehouseCapacity] = useState<number>(DEFAULT_TOTAL_SLOTS);
  const [newWarehouseName, setNewWarehouseName] = useState<string>("");
  const [newWarehouseCapacity, setNewWarehouseCapacity] = useState<string>("");
  const [warehouseSaving, setWarehouseSaving] = useState<boolean>(false);
  const [warehousesLoading, setWarehousesLoading] = useState<boolean>(false);
  const [inboundBoxes, setInboundBoxes] = useState<Box[]>([]);
  const [outboundBoxes, setOutboundBoxes] = useState<Box[]>([]);
  const [dispatchedBoxes, setDispatchedBoxes] = useState<Box[]>([]);
  const [orders, setOrders] = useState<BodegaOrder[]>([]);
  const [stats, setStats] = useState<BodegaStats>(defaultStats);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [assignedAlerts, setAssignedAlerts] = useState<AlertAssignment[]>([]);
  const [alertasOperario, setAlertasOperario] = useState<
    Array<{ position: number;[key: string]: unknown }>
  >([]);
  const [alertasOperarioSolved, setAlertasOperarioSolved] = useState<number[]>([]);
  const [tareasProcesamientoOperario, setTareasProcesamientoOperario] = useState<Array<Record<string, unknown>>>([]);
  const [llamadasJefe, setLlamadasJefe] = useState<Array<Record<string, unknown>>>([]);
  const [alertClock, setAlertClock] = useState(() => Date.now());
  const [statusModal, setStatusModal] = useState<{
    zone: ZoneKey;
    kind: ModalKind;
  } | null>(null);
  const [resolveModalAlert, setResolveModalAlert] = useState<AlertItem | null>(null);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [assignedAlertsPanelOpen, setAssignedAlertsPanelOpen] = useState(false);
  const [tempFixZone, setTempFixZone] = useState<OrderSource>("ingresos");
  const [tempFixPosition, setTempFixPosition] = useState<number>(1);
  const [tempFixValue, setTempFixValue] = useState<string>("");

  const [, setIngresoPosition] = useState<number>(1);
  const [ingresoName, setIngresoName] = useState<string>("");
  const [ingresoTemp, setIngresoTemp] = useState<string>("");
  const [ingresoQuantityKg, setIngresoQuantityKg] = useState<string>("");
  const [ingresoClientId, setIngresoClientId] = useState<string>("");
  const [clientFilterId, setClientFilterId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientCode, setNewClientCode] = useState<string>("");
  const [clientsLoading, setClientsLoading] = useState<boolean>(false);
  const [clientSaving, setClientSaving] = useState<boolean>(false);

  const [users, setUsers] = useState<ConfigUser[]>([]);
  const [newUserName, setNewUserName] = useState<string>("");
  const [newUserCode, setNewUserCode] = useState<string>("");
  const [newUserRole, setNewUserRole] = useState<Role>("operario");
  const [newUserClientId, setNewUserClientId] = useState<string>("");
  const [newUserEmail, setNewUserEmail] = useState<string>("");
  const [newUserPassword, setNewUserPassword] = useState<string>("");
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [userSaving, setUserSaving] = useState<boolean>(false);

  const [bodegaOrderSourcePosition, setBodegaOrderSourcePosition] = useState<number>(1);
  const [bodegaOrderTargetPosition, setBodegaOrderTargetPosition] = useState<number>(1);
  const [ingresoOrderSourcePosition, setIngresoOrderSourcePosition] = useState<number>(1);
  const [ingresoOrderTargetPosition, setIngresoOrderTargetPosition] = useState<number>(1);
  const [salidaSourcePosition, setSalidaSourcePosition] = useState<number>(1);
  const [salidaTargetPosition, setSalidaTargetPosition] = useState<number>(1);
  const [reviewSourceZone, setReviewSourceZone] = useState<OrderSource>("ingresos");
  const [reviewSourcePosition, setReviewSourcePosition] = useState<number>(1);

  const [searchId, setSearchId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const [cloudReady, setCloudReady] = useState(false);
  const remoteUpdate = React.useRef(false);
  const lastSavedSnapshot = React.useRef<string>("");
  const clientsLoadedRef = React.useRef(false);

  const currentWarehouse = useMemo(
    () => warehouses.find((item) => item.id === warehouseId) ?? null,
    [warehouses, warehouseId],
  );

  const isExternalWarehouse = useMemo(() => {
    const status = currentWarehouse?.status;
    return status === "externa" || status === "external";
  }, [currentWarehouse]);

  /**
   * Evita re-suscribirse a `warehouses/{id}/state/main` cuando solo cambia la referencia de `currentWarehouse`
   * (p. ej. al refrescar la lista de bodegas): cada re-suscripción puede disparar un snapshot y pisar estado local.
   */
  const warehouseStateSubscribeSignal = useMemo(
    () => (isExternalWarehouse ? String(currentWarehouse?.name ?? "").trim() : "__internal__"),
    [isExternalWarehouse, currentWarehouse?.name],
  );

  const loadWarehouses = useCallback(async () => {
    setWarehousesLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "warehouses"));
      let items: WarehouseMeta[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as {
          name?: string;
          status?: string;
          capacity?: number;
          disabled?: boolean;
          createdAt?: { toMillis?: () => number };
          disabledAt?: { toMillis?: () => number };
          codeCuenta?: string;
        };
        const createdAtMs =
          data.createdAt && typeof data.createdAt.toMillis === "function"
            ? data.createdAt.toMillis()
            : undefined;
        const disabledAtMs =
          data.disabledAt && typeof data.disabledAt.toMillis === "function"
            ? data.disabledAt.toMillis()
            : undefined;
        return {
          id: docSnap.id,
          name: data.name,
          status: data.status,
          capacity: typeof data.capacity === "number" ? data.capacity : undefined,
          disabled: Boolean(data.disabled),
          createdAt: createdAtMs ? new Date(createdAtMs).toLocaleString("es-CO") : undefined,
          disabledAt: disabledAtMs ? new Date(disabledAtMs).toLocaleString("es-CO") : undefined,
          codeCuenta: (data.codeCuenta ?? "").toString(),
        };
      });

      // Ensure default exists and is present in the list
      const ensureDefault = async () => {
        const defaultRef = doc(db, "warehouses", DEFAULT_WAREHOUSE_ID);
        const defaultSnap = await getDoc(defaultRef);
        if (!defaultSnap.exists()) {
          await setDoc(defaultRef, {
            name: "default",
            status: "interna",
            capacity: 0,
            disabled: false,
            createdAt: serverTimestamp(),
            codeCuenta: "",
          });
        }
        if (!items.some((item) => item.id === DEFAULT_WAREHOUSE_ID)) {
          items = [
            {
              id: DEFAULT_WAREHOUSE_ID,
              name: "default",
              status: "interna",
              capacity: 0,
              disabled: false,
              createdAt: undefined,
              disabledAt: undefined,
              codeCuenta: "",
            },
            ...items,
          ];
        }
      };

      if (!items.length) {
        await ensureDefault();
      } else {
        await ensureDefault();
      }

      setWarehouses(items);
      if (items.length && !items.some((item) => item.id === warehouseId)) {
        setWarehouseId(items[0].id);
      }
    } catch (err) {
      console.warn("No se pudo cargar la lista de bodegas", err);
      // Fallback: ensure at least the default entry so the selector is usable
      setWarehouses([
        {
          id: DEFAULT_WAREHOUSE_ID,
          name: "default",
          status: "interna",
          capacity: 0,
          disabled: false,
          createdAt: undefined,
          disabledAt: undefined,
          codeCuenta: "",
        },
      ]);
      if (!warehouseId) {
        setWarehouseId(DEFAULT_WAREHOUSE_ID);
      }
    } finally {
      setWarehousesLoading(false);
    }
  }, [warehouseId]);

  const resolveCapacityForWarehouse = useCallback(
    (id: string, fallbackSlots?: number) => {
      const match = warehouses.find((item) => item.id === id);
      if (match && typeof match.capacity === "number") {
        return normalizeCapacity(match.capacity);
      }
      if (typeof fallbackSlots === "number" && fallbackSlots > 0) {
        return normalizeCapacity(fallbackSlots);
      }
      return DEFAULT_TOTAL_SLOTS;
    },
    [warehouses],
  );

  const handleSelectWarehouse = useCallback(
    (id: string) => {
      if (!id || id === warehouseId) return;
      setCloudReady(false);
      remoteUpdate.current = false;
      lastSavedSnapshot.current = "";
      const capacity = resolveCapacityForWarehouse(id, warehouseCapacity);
      setWarehouseCapacity(capacity);
      setSlots(createInitialSlots(capacity));
      setInboundBoxes([]);
      setOutboundBoxes([]);
      setDispatchedBoxes([]);
      setOrders([]);
      setStats(defaultStats);
      setWarehouseName("");
      setAlerts([]);
      setAssignedAlerts([]);
      setAlertasOperario([]);
      setAlertasOperarioSolved([]);
      setTareasProcesamientoOperario([]);
      setLlamadasJefe([]);
      setWarehouseId(id);
    },
    [resolveCapacityForWarehouse, warehouseCapacity, warehouseId],
  );

  const handleCreateWarehouse = useCallback(
    async (arg?: string | { status: "interna" | "externa" }, capacityInput?: number) => {
      if (!session) {
        setMessage("Debes iniciar sesión para crear bodegas.");
        return;
      }
      const name =
        typeof arg === "string" ? arg.trim() : (newWarehouseName ?? "").trim();
      const capacityRaw = capacityInput ?? Number(newWarehouseCapacity);
      const capacity = Number.isFinite(capacityRaw) && capacityRaw >= 0 ? capacityRaw : 0;
      const isExterna =
        typeof arg === "object" && arg !== null && arg.status === "externa";
      const firestoreStatus = isExterna ? "externa" : "interna";
      const codeCuenta = (session.clientId ?? "").toString();
      if (!name) {
        setMessage("Ingresa un nombre para la bodega.");
        return;
      }

      setWarehouseSaving(true);
      setWarehousesLoading(true);
      try {
        const ref = await addDoc(collection(db, "warehouses"), {
          name: name || "Nueva bodega",
          status: firestoreStatus,
          capacity,
          disabled: false,
          createdAt: serverTimestamp(),
          codeCuenta,
        });
        await Promise.all([ensureWarehouseState(ref.id), ensureHistoryState(ref.id)]);
        const createdAtMs = Date.now();
        const meta: WarehouseMeta = {
          id: ref.id,
          name: name || "Nueva bodega",
          status: firestoreStatus,
          capacity,
          disabled: false,
          createdAt: new Date(createdAtMs).toLocaleString("es-CO"),
          codeCuenta,
        };
        setWarehouses((prev) => {
          const exists = prev.some((item) => item.id === ref.id);
          return exists ? prev : [...prev, meta];
        });
        setNewWarehouseName("");
        setNewWarehouseCapacity("");
        await loadWarehouses();
        handleSelectWarehouse(ref.id);
        setMessage("Bodega creada correctamente.");
      } catch (err) {
        const code =
          typeof err === "object" && err && "code" in err
            ? (err as { code?: string }).code
            : undefined;
        console.error("No se pudo crear la bodega", err);
        setMessage(
          code
            ? `No se pudo crear la bodega. Error: ${code}`
            : "No se pudo crear la bodega. Revisa permisos o conexión.",
        );
      } finally {
        setWarehouseSaving(false);
        setWarehousesLoading(false);
      }
    },
    [handleSelectWarehouse, loadWarehouses, newWarehouseCapacity, newWarehouseName, session],
  );

  const sanitizeClientCode = useCallback((value: string) => {
    const normalized = (value ?? "")
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "")
      .slice(0, 5);
    return normalized ? normalized.padEnd(5, "0") : "";
  }, []);

  const generateClientCode = useCallback((value: string) => {
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
    const seed = normalized
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rand = Math.floor(Math.random() * 36 ** 2);
    const codeNumber = (seed + rand) % 36 ** 5;
    return codeNumber.toString(36).toUpperCase().padStart(5, "0");
  }, []);

  const fetchWarehouses = useCallback(async () => {
    await loadWarehouses();
  }, [loadWarehouses]);

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "clientes"));
      const items: Client[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as {
          name?: string;
          code?: string;
          createdAt?: { toMillis?: () => number };
          createdBy?: string | null;
          createdByRole?: Role | null;
          disabled?: boolean;
          disabledAt?: { toMillis?: () => number };
        };
        const createdAtMs =
          data.createdAt && typeof data.createdAt.toMillis === "function"
            ? data.createdAt.toMillis()
            : undefined;
        const disabledAtMs =
          data.disabledAt && typeof data.disabledAt.toMillis === "function"
            ? data.disabledAt.toMillis()
            : undefined;
        return {
          id: docSnap.id,
          name: (data.name ?? "").toString().trim() || "Sin nombre",
          code: (data.code ?? "").toString().trim() || docSnap.id,
          createdAtMs,
          createdAt: createdAtMs ? new Date(createdAtMs).toLocaleString("es-CO") : undefined,
          createdBy: data.createdBy ?? null,
          createdByRole: data.createdByRole ?? null,
          disabled: Boolean(data.disabled),
          disabledAt: disabledAtMs ? new Date(disabledAtMs).toLocaleString("es-CO") : undefined,
        };
      });

      items.sort(
        (a, b) =>
          (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0) || a.name.localeCompare(b.name, "es"),
      );
      setClients(items);
    } catch (err) {
      console.error("No se pudieron cargar los clientes", err);
      setMessage(
        "No se pudieron cargar los clientes. Revisa permisos de Firestore para la colección clientes.",
      );
    } finally {
      setClientsLoading(false);
    }
  }, [setMessage]);

  const handleCreateClient = useCallback(async () => {
    const value = newClientName.trim();
    if (!value) {
      setMessage("Ingresa un nombre de cliente.");
      return;
    }
    if (!session) {
      setMessage("Debes iniciar sesión como configurador para crear clientes.");
      return;
    }

    setClientSaving(true);
    try {
      const code = sanitizeClientCode(newClientCode) || generateClientCode(value);
      const docRef = await addDoc(collection(db, "clientes"), {
        name: value,
        code,
        createdAt: serverTimestamp(),
        createdBy: session.uid,
        createdByRole: session.role,
        disabled: false,
      });
      const createdAtMs = Date.now();
      const newClient: Client = {
        id: docRef.id,
        name: value,
        code,
        createdAt: new Date(createdAtMs).toLocaleString("es-CO"),
        createdAtMs,
        createdBy: session.uid,
        createdByRole: session.role,
        disabled: false,
      };
      setClients((prev) => [newClient, ...prev]);
      setNewClientName("");
      setNewClientCode("");
      clientsLoadedRef.current = true;
      setMessage("Cliente creado correctamente.");
    } catch (err) {
      console.error("No se pudo crear el cliente", err);
      setMessage("No se pudo crear el cliente. Revisa permisos o conexión.");
    } finally {
      setClientSaving(false);
    }
  }, [generateClientCode, newClientCode, newClientName, session]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "usuarios"));
      const items = snapshot.docs
        .map((d) => configUserFromUsuariosDocSnap(d, sanitizeClientCode))
        .sort(
          (a, b) =>
            (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0) || a.name.localeCompare(b.name, "es"),
        );
      setUsers(items);
    } catch (err) {
      console.error("No se pudieron cargar los usuarios", err);
      setMessage("No se pudieron cargar los usuarios. Revisa permisos de Firestore.");
    } finally {
      setUsersLoading(false);
    }
  }, [sanitizeClientCode]);

  const handleCreateUser = useCallback(async () => {
    const name = newUserName.trim();
    const email = newUserEmail.trim();
    const password = newUserPassword.trim();
    if (!name) {
      setMessage("Ingresa un nombre de usuario.");
      return;
    }
    if (!email) {
      setMessage("Ingresa un correo para el usuario.");
      return;
    }
    if (!password) {
      setMessage("Ingresa una clave para el usuario.");
      return;
    }
    if (!session) {
      setMessage("Debes iniciar sesión como configurador para crear usuarios.");
      return;
    }

    setUserSaving(true);
    try {
      const code = sanitizeClientCode(newUserCode) || generateClientCode(name);
      const secondaryAuth = getSecondaryAuth();
      const credentials = await createUserWithEmailAndPassword(secondaryAuth, email, password);

      await setDoc(doc(db, "usuarios", credentials.user.uid), {
        name,
        code,
        role: newUserRole,
        clientId: newUserClientId.trim(),
        email,
        displayName: name,
        createdAt: serverTimestamp(),
        createdBy: session.uid,
        createdByRole: session.role,
        disabled: false,
      });

      const createdAtMs = Date.now();
      const newUser: ConfigUser = {
        id: credentials.user.uid,
        name,
        code,
        role: newUserRole,
        clientId: newUserClientId.trim(),
        email,
        createdAt: new Date(createdAtMs).toLocaleString("es-CO"),
        createdAtMs,
        createdBy: session.uid,
        createdByRole: session.role,
        disabled: false,
      };
      setUsers((prev) => {
        const rest = prev.filter((u) => u.id !== newUser.id);
        return [newUser, ...rest];
      });
      setNewUserName("");
      setNewUserCode("");
      setNewUserClientId("");
      setNewUserEmail("");
      setNewUserPassword("");
      setMessage("Usuario creado correctamente.");

      await signOut(secondaryAuth);
    } catch (err) {
      console.error("No se pudo crear el usuario", err);
      setMessage("No se pudo crear el usuario. Revisa permisos o conexión.");
    } finally {
      setUserSaving(false);
    }
  }, [generateClientCode, newUserClientId, newUserCode, newUserEmail, newUserName, newUserPassword, newUserRole, sanitizeClientCode, session]);

  const toggleUserDisabled = useCallback(
    async (userId: string, nextDisabled: boolean) => {
      try {
        await updateDoc(doc(db, "usuarios", userId), {
          disabled: nextDisabled,
          disabledAt: nextDisabled ? serverTimestamp() : null,
        });
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  disabled: nextDisabled,
                  disabledAt: nextDisabled ? new Date().toLocaleString("es-CO") : undefined,
                }
              : user,
          ),
        );
        setMessage(nextDisabled ? "Usuario deshabilitado." : "Usuario habilitado.");
      } catch (err) {
        console.error("No se pudo actualizar el usuario", err);
        setMessage("No se pudo actualizar el usuario. Revisa permisos o conexión.");
      }
    },
    [],
  );

  const handleUpdateUser = useCallback(
    async (userId: string, payload: { name: string; role: Role; clientId: string }) => {
      const name = payload.name.trim();
      const clientId = payload.clientId.trim();
      if (!name) {
        setMessage("El nombre es requerido.");
        return;
      }
      try {
        await updateDoc(doc(db, "usuarios", userId), {
          name,
          role: payload.role,
          clientId,
        });
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, name, role: payload.role, clientId } : user,
          ),
        );
        setMessage("Usuario actualizado.");
      } catch (err) {
        console.error("No se pudo editar el usuario", err);
        setMessage("No se pudo editar el usuario. Revisa permisos o conexión.");
      }
    },
    [],
  );

  const toggleClientDisabled = useCallback(
    async (clientId: string, nextDisabled: boolean) => {
      try {
        await updateDoc(doc(db, "clientes", clientId), {
          disabled: nextDisabled,
          disabledAt: nextDisabled ? serverTimestamp() : null,
        });
        setClients((prev) =>
          prev.map((client) =>
            client.id === clientId
              ? {
                  ...client,
                  disabled: nextDisabled,
                  disabledAt: nextDisabled ? new Date().toLocaleString("es-CO") : undefined,
                }
              : client,
          ),
        );
        setMessage(nextDisabled ? "Cliente deshabilitado." : "Cliente habilitado.");
      } catch (err) {
        console.error("No se pudo actualizar el cliente", err);
        setMessage("No se pudo actualizar el cliente. Revisa permisos o conexión.");
      }
    },
    [],
  );

  const handleUpdateClient = useCallback(
    async (clientId: string, payload: { name: string; code: string }) => {
      const name = payload.name.trim();
      const code = payload.code.trim();
      if (!name || !code) {
        setMessage("Nombre y código son requeridos.");
        return;
      }

      try {
        await updateDoc(doc(db, "clientes", clientId), { name, code });
        setClients((prev) =>
          prev.map((client) => (client.id === clientId ? { ...client, name, code } : client)),
        );
        setMessage("Cliente actualizado.");
      } catch (err) {
        console.error("No se pudo editar el cliente", err);
        setMessage("No se pudo editar el cliente. Revisa permisos o conexión.");
      }
    },
    [],
  );

  const handleUpdateWarehouse = useCallback(
    async (
      warehouseIdParam: string,
      payload: { name: string; capacity: number; status?: "interna" | "externa" },
    ) => {
      const name = payload.name.trim();
      const capacity = Number.isFinite(payload.capacity) && payload.capacity >= 0 ? payload.capacity : 0;
      if (!name) {
        setMessage("Nombre de bodega requerido.");
        return;
      }
      const nextStatus =
        payload.status === undefined
          ? undefined
          : payload.status === "externa"
            ? "externa"
            : "interna";
      try {
        await updateDoc(doc(db, "warehouses", warehouseIdParam), {
          name,
          capacity,
          ...(nextStatus !== undefined ? { status: nextStatus } : {}),
        });
        setWarehouses((prev) =>
          prev.map((item) =>
            item.id === warehouseIdParam
              ? { ...item, name, capacity, ...(nextStatus !== undefined ? { status: nextStatus } : {}) }
              : item,
          ),
        );
        if (warehouseId === warehouseIdParam) {
          setWarehouseCapacity(capacity);
          setSlots((prev) => resizeSlotsToCapacity(prev, capacity));
          setInboundBoxes((prev) => filterBoxesByCapacity(prev, capacity));
          setOutboundBoxes((prev) => filterBoxesByCapacity(prev, capacity));
          setDispatchedBoxes((prev) => filterBoxesByCapacity(prev, capacity));
          setOrders((prev) => filterOrdersByCapacity(prev, capacity));
          setSelectedPosition((prev) => (prev && prev <= capacity ? prev : null));
        }
        setMessage("Bodega actualizada.");
      } catch (err) {
        console.error("No se pudo editar la bodega", err);
        setMessage("No se pudo editar la bodega. Revisa permisos o conexión.");
      }
    },
    [],
  );

  const toggleWarehouseDisabled = useCallback(
    async (warehouseId: string, nextDisabled: boolean) => {
      try {
        await updateDoc(doc(db, "warehouses", warehouseId), {
          disabled: nextDisabled,
          disabledAt: nextDisabled ? serverTimestamp() : null,
        });
        setWarehouses((prev) =>
          prev.map((item) =>
            item.id === warehouseId
              ? {
                  ...item,
                  disabled: nextDisabled,
                  disabledAt: nextDisabled ? new Date().toLocaleString("es-CO") : undefined,
                }
              : item,
          ),
        );
        setMessage(nextDisabled ? "Bodega deshabilitada." : "Bodega habilitada.");
      } catch (err) {
        console.error("No se pudo actualizar la bodega", err);
        setMessage("No se pudo actualizar la bodega. Revisa permisos o conexión.");
      }
    },
    [],
  );

  const loadExternalWarehouseData = useCallback(async (externalId: string, externalName?: string) => {
    if (!externalId) return;
    setCloudReady(false);
    setMessage("");
    try {
      const slotsFromExternal = await fetchFridemSlots(externalId);
      if (!slotsFromExternal.length) {
        setMessage(
          "No se encontraron datos en la bodega externa. Revisa la base externa (Firestore o Realtime) y la URL de Realtime (NEXT_PUBLIC_FRIDEM_DATABASE_URL).",
        );
      }
      const capacity = slotsFromExternal.length || DEFAULT_TOTAL_SLOTS;
      setWarehouseCapacity(capacity);
      setSlots(
        slotsFromExternal.length
          ? resizeSlotsToCapacity(slotsFromExternal, capacity)
          : createInitialSlots(capacity),
      );
      setInboundBoxes([]);
      setOutboundBoxes([]);
      setDispatchedBoxes([]);
      setOrders([]);
      setStats(defaultStats);
      setWarehouseName(externalName ?? "Bodega externa");
      setAlerts([]);
      setAssignedAlerts([]);
      setAlertasOperario([]);
      setAlertasOperarioSolved([]);
      setTareasProcesamientoOperario([]);
      setLlamadasJefe([]);
    } catch (err) {
      console.warn("No se pudo cargar la bodega externa", err);
      setMessage("No se pudo cargar la bodega externa. Revisa consola y credenciales.");
      setSlots(createInitialSlots());
    } finally {
      setCloudReady(true);
    }
  }, []);

  useEffect(() => {
    setIsHydrated(true);
    setDateLabel(new Date().toLocaleDateString("es-CO"));
    setWarehouseId(WAREHOUSE_ID);
  }, []);

  useEffect(() => {
    if (!session) {
      setWarehouses([]);
      return;
    }
    const role = session.role;
    const codeCuenta = String(session.codeCuenta ?? "").trim();
    const cuentaEnTiempoReal =
      (role === "cliente" || role === "operadorCuentas") && Boolean(codeCuenta);
    if (cuentaEnTiempoReal) {
      setWarehousesLoading(true);
      const qWh = query(collection(db, "warehouses"), where("codeCuenta", "==", codeCuenta));
      const unsub = onSnapshot(
        qWh,
        (snapshot) => {
          const items: WarehouseMeta[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as {
              name?: string;
              status?: string;
              capacity?: number;
              disabled?: boolean;
              createdAt?: { toMillis?: () => number };
              disabledAt?: { toMillis?: () => number };
              codeCuenta?: string;
            };
            const createdAtMs =
              data.createdAt && typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : undefined;
            const disabledAtMs =
              data.disabledAt && typeof data.disabledAt.toMillis === "function"
                ? data.disabledAt.toMillis()
                : undefined;
            return {
              id: docSnap.id,
              name: data.name,
              status: data.status,
              capacity: typeof data.capacity === "number" ? data.capacity : undefined,
              disabled: Boolean(data.disabled),
              createdAt: createdAtMs ? new Date(createdAtMs).toLocaleString("es-CO") : undefined,
              disabledAt: disabledAtMs ? new Date(disabledAtMs).toLocaleString("es-CO") : undefined,
              codeCuenta: (data.codeCuenta ?? "").toString(),
            };
          });
          setWarehouses(items);
          setWarehouseId((wid) => {
            if (items.length && !items.some((item) => item.id === wid)) {
              return items[0]!.id;
            }
            return wid;
          });
          setWarehousesLoading(false);
        },
        (err) => {
          console.warn("Suscripción bodegas por cuenta:", err);
          setWarehousesLoading(false);
        },
      );
      return () => unsub();
    }
    void loadWarehouses();
    return undefined;
  }, [session, loadWarehouses]);

  useEffect(() => {
    const capacity = resolveCapacityForWarehouse(warehouseId);
    setWarehouseCapacity(capacity);
    setSlots((prev) => resizeSlotsToCapacity(prev, capacity));
    setInboundBoxes((prev) => filterBoxesByCapacity(prev, capacity));
    setOutboundBoxes((prev) => filterBoxesByCapacity(prev, capacity));
    setDispatchedBoxes((prev) => filterBoxesByCapacity(prev, capacity));
    setOrders((prev) => filterOrdersByCapacity(prev, capacity));
    setSelectedPosition((prev) => (prev && prev <= capacity ? prev : null));
  }, [resolveCapacityForWarehouse, warehouseId]);

  useEffect(() => {
    if (!session || !warehouseId) {
      setCloudReady(false);
      return;
    }

    if (isExternalWarehouse) {
      loadExternalWarehouseData(warehouseId, currentWarehouse?.name);
      return;
    }

    const unsubscribe = subscribeWarehouseState(warehouseId, (cloud) => {
      remoteUpdate.current = true;
      const resolvedCapacity = resolveCapacityForWarehouse(
        warehouseId,
        Array.isArray(cloud.slots) ? cloud.slots.length : undefined,
      );
      setWarehouseCapacity(resolvedCapacity);
      const normalizedSlots = normalizeSlots(cloud.slots, resolvedCapacity) ?? createInitialSlots(resolvedCapacity);
      setSlots(normalizedSlots);
      const normalizedInbound = cloud.inboundBoxes?.length ? normalizeBoxes(cloud.inboundBoxes) ?? [] : [];
      const normalizedOutbound = cloud.outboundBoxes?.length ? normalizeBoxes(cloud.outboundBoxes) ?? [] : [];
      const normalizedDispatched = cloud.dispatchedBoxes?.length ? normalizeBoxes(cloud.dispatchedBoxes) ?? [] : [];
      const normalizedOrders = cloud.orders?.length ? normalizeOrders(cloud.orders) ?? [] : [];
      setInboundBoxes(filterBoxesByCapacity(normalizedInbound, resolvedCapacity));
      setOutboundBoxes(filterBoxesByCapacity(normalizedOutbound, resolvedCapacity));
      setDispatchedBoxes(filterBoxesByCapacity(normalizedDispatched, resolvedCapacity));
      setOrders(filterOrdersByCapacity(normalizedOrders, resolvedCapacity));
      setStats(cloud.stats ?? defaultStats);
      setWarehouseName(cloud.warehouseName ?? "");
      setAlerts(cloud.alerts ?? []);
      setAssignedAlerts(cloud.assignedAlerts ?? []);
      setAlertasOperario(cloud.alertasOperario ?? []);
      setAlertasOperarioSolved(cloud.alertasOperarioSolved ?? []);
      setTareasProcesamientoOperario(cloud.tareasProcesamientoOperario ?? []);
      setLlamadasJefe(cloud.llamadasJefe ?? []);
      setCloudReady(true);
    });

    return () => unsubscribe();
  }, [
    isExternalWarehouse,
    loadExternalWarehouseData,
    resolveCapacityForWarehouse,
    session,
    warehouseId,
    warehouseStateSubscribeSignal,
  ]);

  useEffect(() => {
    const p = getNextIngresoPosition(inboundBoxes, warehouseCapacity);
    setIngresoPosition(p > 0 ? p : 1);
  }, [inboundBoxes, warehouseCapacity]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setAlertClock(Date.now());
    }, 30000);
    return () => window.clearInterval(timerId);
  }, []);

  /** Si la temperatura en bodega vuelve a subir (p. ej. cambio en Firestore), ya no debe ocultarse como "resuelta". */
  useEffect(() => {
    const hotBodega = new Set<number>();
    for (const s of slots) {
      if (!s.autoId?.trim()) continue;
      if (
        typeof s.temperature === "number" &&
        Number.isFinite(s.temperature) &&
        s.temperature > HIGH_TEMP_ALERT_THRESHOLD
      ) {
        hotBodega.add(s.position);
      }
    }
    setAlertasOperarioSolved((prev) => {
      const next = prev.filter((p) => !hotBodega.has(p));
      return next.length === prev.length ? prev : next;
    });
  }, [slots]);

  /** Si el mapa ya marca temperatura OK, no dejar filas en `alertasOperario` (sincroniza con Firestore vía save automático). */
  useEffect(() => {
    if (!cloudReady || isExternalWarehouse || alertasOperario.length === 0) return;

    const liveTempForAlertRow = (a: (typeof alertasOperario)[number]): number | null => {
      const pos = Number(a.position);
      const zone = ((a as { zone?: OrderSource }).zone ?? "bodega") as OrderSource;
      if (zone === "bodega") {
        const s = slots.find((x) => x.position === pos);
        return coerceTemperatureFromCloud(s?.temperature ?? null);
      }
      if (zone === "ingresos") {
        const b = inboundBoxes.find((x) => x.position === pos);
        return coerceTemperatureFromCloud(b?.temperature ?? null);
      }
      const b = outboundBoxes.find((x) => x.position === pos);
      return coerceTemperatureFromCloud(b?.temperature ?? null);
    };

    const pruned = alertasOperario.filter((a) => {
      const t = liveTempForAlertRow(a);
      if (t === null) return true;
      return t > HIGH_TEMP_ALERT_THRESHOLD;
    });
    if (pruned.length === alertasOperario.length) return;
    setAlertasOperario(pruned);
  }, [
    alertasOperario,
    cloudReady,
    inboundBoxes,
    isExternalWarehouse,
    outboundBoxes,
    slots,
  ]);

  const occupiedCount = useMemo(
    () => slots.filter((slot) => slot.autoId.trim() !== "").length,
    [slots],
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.position === selectedPosition) ?? null,
    [slots, selectedPosition],
  );

  const freeSlots = useMemo(
    () => slots.filter((slot) => !slot.autoId.trim()).map((slot) => slot.position),
    [slots],
  );

  const reservedBodegaTargets = useMemo(() => {
    const reserved = new Set<number>();
    orders.forEach((order) => {
      if (order.type !== "a_bodega") {
        return;
      }
      if (typeof order.targetPosition === "number") {
        reserved.add(order.targetPosition);
      }
    });
    return reserved;
  }, [orders]);

  const reservedSalidaTargets = useMemo(() => {
    const reserved = new Set<number>();
    orders.forEach((order) => {
      if (order.type !== "a_salida") {
        return;
      }
      if (typeof order.targetPosition === "number") {
        reserved.add(order.targetPosition);
      }
    });
    return reserved;
  }, [orders]);

  const availableBodegaTargets = useMemo(
    () => freeSlots.filter((position) => !reservedBodegaTargets.has(position)),
    [freeSlots, reservedBodegaTargets],
  );

  const bodegaBoxes = useMemo(
    () =>
      slots
        .filter((slot) => slot.autoId.trim())
        .map((slot) => ({
          position: slot.position,
          autoId: slot.autoId,
          name: slot.name,
          temperature: slot.temperature ?? 0,
          client: slot.client,
        })),
    [slots],
  );

  const pendingSourceKeys = useMemo(() => {
    const keys = new Set<string>();
    orders.forEach((order) => {
      if (order.sourceZone === "procesamiento" && order.procesamientoOrigen) {
        const rol = order.procesamientoOrigen.rolDevolucion ?? "procesado";
        keys.add(
          `procesamiento:${order.procesamientoOrigen.cuentaClientId}:${order.procesamientoOrigen.solicitudId}:${rol}`,
        );
      } else {
        keys.add(`${order.sourceZone}:${order.sourcePosition}`);
      }
    });
    return keys;
  }, [orders]);

  const availableInboundForOrders = useMemo(
    () => inboundBoxes.filter((box) => !pendingSourceKeys.has(`ingresos:${box.position}`)),
    [inboundBoxes, pendingSourceKeys],
  );

  const availableBodegaForOrders = useMemo(
    () => bodegaBoxes.filter((box) => !pendingSourceKeys.has(`bodega:${box.position}`)),
    [bodegaBoxes, pendingSourceKeys],
  );

  const warehouseCodeCuentaStr = String(currentWarehouse?.codeCuenta ?? "").trim();

  const clientIdsParaSolicitudesBodega = useMemo(() => {
    if (!warehouseCodeCuentaStr) return [];
    return clients
      .filter((c) => !c.disabled && String(c.code ?? "").trim() === warehouseCodeCuentaStr)
      .map((c) => c.id.trim())
      .filter(Boolean);
  }, [clients, warehouseCodeCuentaStr]);

  /** Incluye cuentas que tienen carga en mapa/ingreso/salida aunque no estén en la lista «procesamiento». */
  const clientIdsParaCatalogoBodega = useMemo(() => {
    const set = new Set<string>(clientIdsParaSolicitudesBodega);
    for (const s of slots) {
      const c = String(s.client ?? "").trim();
      if (c) set.add(c);
    }
    for (const b of inboundBoxes) {
      const c = String(b.client ?? "").trim();
      if (c) set.add(c);
    }
    for (const b of outboundBoxes) {
      const c = String(b.client ?? "").trim();
      if (c) set.add(c);
    }
    return [...set];
  }, [clientIdsParaSolicitudesBodega, slots, inboundBoxes, outboundBoxes]);

  /** Clave estable para dependencias de efectos (evita arrays en deps y avisos de tamaño variable en dev). */
  const productosCatalogoClientIdsKey = useMemo(
    () => [...clientIdsParaCatalogoBodega].sort((a, b) => a.localeCompare(b)).join("|"),
    [clientIdsParaCatalogoBodega],
  );

  const [solicitudesProcSubscriptionRows, setSolicitudesProcSubscriptionRows] = useState<
    SolicitudProcesamiento[]
  >([]);

  /** Catálogo de cuentas de esta bodega: traslados procesamiento y códigos de almacén en el mapa. */
  const [productosCatalogoBodega, setProductosCatalogoBodega] = useState<Catalogo[]>([]);

  useEffect(() => {
    if (isExternalWarehouse || !warehouseCodeCuentaStr || clientIdsParaSolicitudesBodega.length === 0) {
      setSolicitudesProcSubscriptionRows([]);
      return;
    }
    return SolicitudProcesamientoService.subscribeParaBodegaInterna(
      clientIdsParaSolicitudesBodega,
      warehouseCodeCuentaStr,
      setSolicitudesProcSubscriptionRows,
      () => {},
    );
  }, [isExternalWarehouse, warehouseCodeCuentaStr, clientIdsParaSolicitudesBodega]);

  useEffect(() => {
    if (
      !session?.uid ||
      isExternalWarehouse ||
      !warehouseCodeCuentaStr ||
      clientIdsParaCatalogoBodega.length === 0
    ) {
      setProductosCatalogoBodega([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const listas = await Promise.all(
        clientIdsParaCatalogoBodega.map((cid) =>
          CatalogoService.getAll(cid, warehouseCodeCuentaStr),
        ),
      );
      if (!cancelled) {
        setProductosCatalogoBodega(listas.flat());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isExternalWarehouse, session, warehouseCodeCuentaStr, productosCatalogoClientIdsKey]);

  useEffect(() => {
    if (!cloudReady || !warehouseId || isExternalWarehouse) return;
    if (remoteUpdate.current) {
      remoteUpdate.current = false;
      return;
    }

    const slotsSave = slotsWithAlmacenProductCodeFilled(slots, productosCatalogoBodega);
    const inboundSave = boxesWithAlmacenProductCodeFilled(inboundBoxes, productosCatalogoBodega);
    const outboundSave = boxesWithAlmacenProductCodeFilled(outboundBoxes, productosCatalogoBodega);
    const dispatchedSave = boxesWithAlmacenProductCodeFilled(dispatchedBoxes, productosCatalogoBodega);

    const snapshot = JSON.stringify({
      slots: slotsSave,
      inboundBoxes: inboundSave,
      outboundBoxes: outboundSave,
      dispatchedBoxes: dispatchedSave,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      tareasProcesamientoOperario,
      llamadasJefe,
    });

    if (lastSavedSnapshot.current === snapshot) {
      return;
    }

    lastSavedSnapshot.current = snapshot;
    saveWarehouseState(warehouseId, {
      slots: slotsSave,
      inboundBoxes: inboundSave,
      outboundBoxes: outboundSave,
      dispatchedBoxes: dispatchedSave,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      tareasProcesamientoOperario,
      llamadasJefe,
    }).catch(() => { });
  }, [
    alerts,
    alertasOperario,
    alertasOperarioSolved,
    tareasProcesamientoOperario,
    assignedAlerts,
    cloudReady,
    dispatchedBoxes,
    isExternalWarehouse,
    inboundBoxes,
    llamadasJefe,
    orders,
    outboundBoxes,
    productosCatalogoBodega,
    slots,
    stats,
    warehouseId,
    warehouseName,
  ]);

  const solicitudesProcTerminadas = useMemo(
    () =>
      solicitudesProcSubscriptionRows.filter((r) => {
        const e = normalizeProcesamientoEstado(r.estado);
        return e === "Pendiente" || e === "Terminado";
      }),
    [solicitudesProcSubscriptionRows],
  );

  const solicitudesProcesamientoTerminadasDisponibles = useMemo(() => {
    const pendProc = new Set(
      orders
        .filter(
          (o) =>
            o.type === "a_bodega" &&
            o.sourceZone === "procesamiento" &&
            o.procesamientoOrigen &&
            (o.procesamientoOrigen.rolDevolucion ?? "procesado") === "procesado",
        )
        .map(
          (o) =>
            `${String(o.procesamientoOrigen!.cuentaClientId).trim()}::${String(o.procesamientoOrigen!.solicitudId).trim()}`,
        ),
    );
    return solicitudesProcTerminadas.filter((s) => {
      const key = `${String(s.clientId).trim()}::${String(s.id).trim()}`;
      if (pendProc.has(key)) return false;
      const tieneProc = slots.some((slot) => {
        if (String(slot.client ?? "").trim() !== String(s.clientId).trim()) return false;
        if (String(slot.procesamientoSolicitudId ?? "").trim() !== String(s.id).trim()) return false;
        return String(slot.procesamientoSecundarioTitulo ?? "").trim() !== "";
      });
      if (tieneProc) return false;
      return true;
    });
  }, [solicitudesProcTerminadas, orders, slots]);

  const solicitudesProcesamientoTerminadasDisponiblesDesperdicio = useMemo(() => {
    const pendDesp = new Set(
      orders
        .filter(
          (o) =>
            o.type === "a_bodega" &&
            o.sourceZone === "procesamiento" &&
            o.procesamientoOrigen?.rolDevolucion === "desperdicio",
        )
        .map(
          (o) =>
            `${String(o.procesamientoOrigen!.cuentaClientId).trim()}::${String(o.procesamientoOrigen!.solicitudId).trim()}`,
        ),
    );
    return solicitudesProcTerminadas.filter((s) => {
      const sk = kgSobranteParaDevolucionMapa(s);
      if (sk <= 0) return false;
      const key = `${String(s.clientId).trim()}::${String(s.id).trim()}`;
      if (pendDesp.has(key)) return false;
      const yaDevuelto = slots.some((slot) => {
        if (String(slot.client ?? "").trim() !== String(s.clientId).trim()) return false;
        return String(slot.procesamientoDesperdicioDevueltoSolicitudId ?? "").trim() === String(s.id).trim();
      });
      if (yaDevuelto) return false;
      const rowLike: SolicitudProcesamiento = {
        id: s.id,
        clientId: s.clientId,
        codeCuenta: s.codeCuenta,
        clientName: s.clientName,
        creadoPorNombre: s.creadoPorNombre,
        creadoPorUid: s.creadoPorUid,
        numero: s.numero,
        numericId: s.numericId,
        productoPrimarioId: s.productoPrimarioId,
        productoPrimarioTitulo: s.productoPrimarioTitulo,
        productoSecundarioId: s.productoSecundarioId,
        productoSecundarioTitulo: s.productoSecundarioTitulo,
        cantidadPrimario: s.cantidadPrimario,
        unidadPrimarioVisualizacion: s.unidadPrimarioVisualizacion,
        warehouseId: s.warehouseId,
        estimadoUnidadesSecundario: s.estimadoUnidadesSecundario,
        reglaConversionCantidadPrimario: s.reglaConversionCantidadPrimario,
        reglaConversionUnidadesSecundario: s.reglaConversionUnidadesSecundario,
        perdidaProcesamientoPct: s.perdidaProcesamientoPct,
        fecha: s.fecha,
        estado: s.estado,
      };
      return Boolean(findSlotPrimarioParaDevolverDesperdicio(slots, rowLike));
    });
  }, [solicitudesProcTerminadas, orders, slots]);

  const reviewBodegaList = useMemo(() => availableBodegaForOrders, [availableBodegaForOrders]);

  const {
    ingresos: _historyIngresos,
    salidas: _historySalidas,
    movimientosBodega: _historyMovimientos,
    alertas: _alertasHistorial,
    addIngreso,
    addSalida,
    addMovimientoBodega,
    addAlerta,
    addDespachado,
    setWarehouseId: setHistoryWarehouseId,
  } = useBodegaHistory();

  useEffect(() => {
    setHistoryWarehouseId(warehouseId);
  }, [warehouseId, setHistoryWarehouseId]);

  const zoneLabels: Record<ZoneKey, string> = {
    entrada: "Entrada",
    bodega: "Bodega",
    salida: "Salida",
  };

  const formatOrderDetails = (order: BodegaOrder) => {
    const target = order.targetPosition ?? "-";
    const sourceLabel =
      order.sourceZone === "bodega"
        ? "Bodega"
        : order.sourceZone === "salida"
          ? "Salida"
          : order.sourceZone === "procesamiento"
            ? "Procesamiento"
            : "Ingreso";
    if (order.type === "revisar") {
      return `Revisar ${sourceLabel} ${order.sourcePosition}`;
    }
    if (order.type === "a_bodega") {
      if (order.sourceZone === "procesamiento" && order.procesamientoOrigen) {
        if (order.procesamientoOrigen.rolDevolucion === "desperdicio") {
          return `Desperdicio ${order.procesamientoOrigen.numero} → primario (cas. ${target})`;
        }
        return `Procesamiento ${order.procesamientoOrigen.numero} → bodega ${target}`;
      }
      return `${sourceLabel} ${order.sourcePosition} · Destino bodega ${target}`;
    }
    return `${sourceLabel} ${order.sourcePosition} · Destino salida ${target}`;
  };

  const inboundHighBoxes = useMemo(
    () =>
      inboundBoxes.filter(
        (box) =>
          typeof box.temperature === "number" &&
          Number.isFinite(box.temperature) &&
          box.temperature > HIGH_TEMP_ALERT_THRESHOLD,
      ),
    [inboundBoxes],
  );
  const outboundHighBoxes = useMemo(
    () =>
      outboundBoxes.filter(
        (box) =>
          typeof box.temperature === "number" &&
          Number.isFinite(box.temperature) &&
          box.temperature > HIGH_TEMP_ALERT_THRESHOLD,
      ),
    [outboundBoxes],
  );
  const bodegaHighSlots = React.useMemo(() => {
    const solvedPositions = new Set(alertasOperarioSolved);
    return slots.filter(
      (slot) =>
        typeof slot.temperature === "number" &&
        Number.isFinite(slot.temperature) &&
        slot.temperature > HIGH_TEMP_ALERT_THRESHOLD &&
        !solvedPositions.has(slot.position),
    );
  }, [alertasOperarioSolved, slots]);

  const tempFixOptions = useMemo(() => {
    const options: Array<{
      zone: OrderSource;
      position: number;
      label: string;
    }> = [];

    inboundHighBoxes.forEach((box) => {
      options.push({
        zone: "ingresos",
        position: box.position,
        label: `Ingreso ${box.position} - ${box.name} (${box.autoId})`,
      });
    });

    bodegaHighSlots.forEach((slot) => {
      options.push({
        zone: "bodega",
        position: slot.position,
        label: `Bodega ${slot.position} - ${slot.name} (${slot.autoId})`,
      });
    });

    outboundHighBoxes.forEach((box) => {
      options.push({
        zone: "salida",
        position: box.position,
        label: `Salida ${box.position} - ${box.name} (${box.autoId})`,
      });
    });

    return options;
  }, [bodegaHighSlots, inboundHighBoxes, outboundHighBoxes]);

  const isTemperatureAlert = (alertId: string) => alertId.startsWith("alerta-temp-");

  const getAlertKind = (alert: AlertItem) => {
    if (isTemperatureAlert(alert.id)) {
      return "temperatura";
    }
    if (alert.id.startsWith(ALERT_REPORT_PREFIX)) {
      return "reporte";
    }
    return "otro";
  };

  const assignedAlertIds = useMemo(
    () => new Set(assignedAlerts.map((assignment) => assignment.alertId)),
    [assignedAlerts],
  );

  const assignedAlertsForOperario = useMemo(
    () =>
      assignedAlerts
        .map((assignment) => ({
          assignment,
          alert: alerts.find((item) => item.id === assignment.alertId) ?? null,
        }))
        .filter(
          (item): item is { assignment: AlertAssignment; alert: AlertItem } =>
            item.alert !== null,
        ),
    [alerts, assignedAlerts],
  );
  const overdueOrders = useMemo(
    () => orders.filter((order) => alertClock - order.createdAtMs >= ALERT_DELAY_MS),
    [alertClock, orders],
  );

  const zoneAlertItems = useMemo(() => {
    const items: Record<ZoneKey, DetailItem[]> = {
      entrada: [],
      bodega: [],
      salida: [],
    };

    inboundHighBoxes.forEach((box) => {
      items.entrada.push({
        id: `alerta-in-${box.autoId}`,
        title: `Temperatura alta en ingreso ${box.position}`,
        description: `Caja ${box.name} · ${box.autoId} · ${box.temperature} °C.`,
      });
    });

    bodegaHighSlots.forEach((slot) => {
      items.bodega.push({
        id: `alerta-bodega-${slot.position}`,
        title: `Temperatura alta en bodega ${slot.position}`,
        description: `Caja ${slot.name} · ${slot.autoId} · ${slot.temperature ?? "-"} °C.`,
      });
    });

    outboundHighBoxes.forEach((box) => {
      items.salida.push({
        id: `alerta-out-${box.autoId}`,
        title: `Temperatura alta en salida ${box.position}`,
        description: `Caja ${box.name} · ${box.autoId} · ${box.temperature} °C.`,
      });
    });


    overdueOrders.forEach((order) => {
      const zone: ZoneKey =
        order.sourceZone === "ingresos"
          ? "entrada"
          : order.sourceZone === "salida"
            ? "salida"
            : "bodega";
      items[zone].push({
        id: `alerta-orden-${order.id}`,
        title: "Tarea demorada",
        description: `Orden pendiente por mas de 2 minutos: ${formatOrderDetails(order)}.`,
        meta: `Solicitado por ${order.createdBy} · ${order.createdAt}`,
      });
    });

    return items;
  }, [bodegaHighSlots, inboundHighBoxes, outboundHighBoxes, overdueOrders, orders]);

  const zoneTaskItems = useMemo(() => {
    const byZone: Record<ZoneKey, DetailItem[]> = {
      entrada: [],
      bodega: [],
      salida: [],
    };

    const zoneForOrder = (order: BodegaOrder): ZoneKey =>
      order.sourceZone === "ingresos"
        ? "entrada"
        : order.sourceZone === "salida"
          ? "salida"
          : "bodega";

    /** Casilleros con orden todavía «en plazo» (no demorada): esas filas ya salen del bucle de órdenes. */
    const ingresoPositionsConTareaSinDemora = new Set<number>();
    const salidaPositionsConTareaSinDemora = new Set<number>();

    orders.forEach((order) => {
      if (orderIsOverdue(order, alertClock)) return;
      const zone = zoneForOrder(order);
      if (order.sourceZone === "ingresos" && typeof order.sourcePosition === "number") {
        ingresoPositionsConTareaSinDemora.add(order.sourcePosition);
      }
      if (order.sourceZone === "salida" && typeof order.sourcePosition === "number") {
        salidaPositionsConTareaSinDemora.add(order.sourcePosition);
      }
      byZone[zone].push({
        id: `tarea-${zone}-${order.id}`,
        title: "Tarea pendiente",
        description: formatOrderDetails(order),
        meta: `Solicitado por ${order.createdBy} · ${order.createdAt}`,
      });
    });

    /** Entradas pendientes sin demora: caja en ingreso sin orden activa en plazo (no listar si solo hay orden demorada → va a Alertas). */
    for (const box of inboundBoxes) {
      if (!boxCasilleroConCaja(box)) continue;
      if (ingresoPositionsConTareaSinDemora.has(box.position)) continue;
      const soloOrdenDemorada = orders.some(
        (o) =>
          o.sourceZone === "ingresos" &&
          o.sourcePosition === box.position &&
          orderIsOverdue(o, alertClock),
      );
      if (soloOrdenDemorada) continue;

      byZone.entrada.push({
        id: `entrada-pendiente-${box.position}`,
        title: `Entrada pendiente · casillero ${box.position}`,
        description: `${String(box.name || "").trim() || "Sin nombre"} (${String(box.autoId || "").trim() || "—"}) — falta crear la orden hacia bodega o completar el traslado.`,
        meta: String(box.client ?? "").trim() ? `Cliente: ${String(box.client).trim()}` : undefined,
      });
    }

    /** Salida: caja en zona de salida sin orden activa en plazo (solo demorada → Alertas). */
    for (const box of outboundBoxes) {
      if (!boxCasilleroConCaja(box)) continue;
      if (salidaPositionsConTareaSinDemora.has(box.position)) continue;
      const soloOrdenDemoradaSalida = orders.some(
        (o) =>
          o.sourceZone === "salida" &&
          o.sourcePosition === box.position &&
          orderIsOverdue(o, alertClock),
      );
      if (soloOrdenDemoradaSalida) continue;

      byZone.salida.push({
        id: `salida-pendiente-${box.position}`,
        title: `Salida pendiente · casillero ${box.position}`,
        description: `${String(box.name || "").trim() || "Sin nombre"} (${String(box.autoId || "").trim() || "—"}) — falta orden o completar despacho / traslado desde salida.`,
        meta: String(box.client ?? "").trim() ? `Cliente: ${String(box.client).trim()}` : undefined,
      });
    }

    return byZone;
  }, [alertClock, inboundBoxes, outboundBoxes, orders]);

  const renderStatusButtons = (zone: ZoneKey) => {
    const alertCount = zoneAlertItems[zone].length;
    const taskCount = zoneTaskItems[zone].length;
    const jefeStatusCopy = session?.role === "jefe";
    /** Misma barra de estado en las tres zonas del tablero (0 si no hay → estilo atenuado). */
    const alwaysShowBoth = zone === "bodega" || zone === "entrada" || zone === "salida";

    if (!alwaysShowBoth && alertCount === 0 && taskCount === 0) {
      return null;
    }

    const alertInactive = alertCount === 0;
    const taskInactive = taskCount === 0;

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusModal({ zone, kind: "alertas" })}
          className={alertInactive ? BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS : BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS}
          title={
            jefeStatusCopy
              ? "Temperatura alta y tareas demoradas en esta zona."
              : undefined
          }
          aria-label={
            jefeStatusCopy
              ? `Alertas en ${zoneLabels[zone]}: temperatura y tareas demoradas`
              : `Ver alertas en ${zoneLabels[zone]}`
          }
        >
          <FiAlertTriangle
            className={alertInactive ? BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS : BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS}
            aria-hidden
          />
          <span className={alertInactive ? BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS : BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS}>
            {alertCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setStatusModal({ zone, kind: "tareas" })}
          className={taskInactive ? BODEGA_ZONE_STATUS_PILL_INACTIVE_CLASS : BODEGA_ZONE_STATUS_PILL_ACTIVE_CLASS}
          title={
            jefeStatusCopy
              ? zone === "entrada"
                ? "Entradas pendientes (sin demora) en esta zona."
                : zone === "salida"
                  ? "Salida: cajas u órdenes pendientes (sin demora)."
                  : "Bodega: movimientos pendientes (sin demora)."
              : undefined
          }
          aria-label={
            jefeStatusCopy
              ? `Tareas pendientes en ${zoneLabels[zone]}`
              : `Ver tareas en ${zoneLabels[zone]}`
          }
        >
          <FiClipboard
            className={taskInactive ? BODEGA_ZONE_STATUS_ICON_INACTIVE_CLASS : BODEGA_ZONE_STATUS_ICON_ACTIVE_CLASS}
            aria-hidden
          />
          <span className={taskInactive ? BODEGA_ZONE_STATUS_NUM_INACTIVE_CLASS : BODEGA_ZONE_STATUS_NUM_ACTIVE_CLASS}>
            {taskCount}
          </span>
        </button>
      </div>
    );
  };

  const computedAlerts = useMemo(() => {
    const tempAlerts: AlertItem[] = [];

    inboundHighBoxes.forEach((box) => {
      tempAlerts.push({
        id: `alerta-temp-entrada-${box.position}-${box.autoId}`,
        title: `Temperatura alta en ingreso ${box.position}`,
        description: `Caja ${box.name} · ${box.autoId} · ${box.temperature} °C.`,
      });
    });

    bodegaHighSlots.forEach((slot) => {
      tempAlerts.push({
        id: `alerta-temp-bodega-${slot.position}-${slot.autoId}`,
        title: `Temperatura alta en bodega ${slot.position}`,
        description: `Caja ${slot.name} · ${slot.autoId} · ${slot.temperature ?? "-"} °C.`,
      });
    });

    outboundHighBoxes.forEach((box) => {
      tempAlerts.push({
        id: `alerta-temp-salida-${box.position}-${box.autoId}`,
        title: `Temperatura alta en salida ${box.position}`,
        description: `Caja ${box.name} · ${box.autoId} · ${box.temperature} °C.`,
      });
    });

    const overdueOrdersList = orders.filter((order) => alertClock - order.createdAtMs >= ALERT_DELAY_MS);

    const next: AlertItem[] = [...tempAlerts];

    for (const order of overdueOrdersList) {
      const alertId = `${ALERT_ORDER_PREFIX}${order.id}`;
      const orderTarget = order.targetPosition ?? null;
      const sourceLabel =
        order.sourceZone === "bodega"
          ? "Bodega"
          : order.sourceZone === "salida"
            ? "Salida"
            : "Ingreso";
      const orderLabel =
        order.type === "revisar"
          ? `Revisar ${sourceLabel} ${order.sourcePosition}`
          : order.type === "a_bodega"
            ? `Ingreso ${order.sourcePosition} -> Bodega ${orderTarget ?? "-"}`
            : `${sourceLabel} ${order.sourcePosition} -> Salida ${orderTarget ?? "-"}`;

      next.push({
        id: alertId,
        title: "Tarea demorada",
        description: `Orden pendiente por mas de 2 minutos: ${orderLabel}. Solicitado por ${order.createdBy} · ${order.createdAt}.`,
      });
    }

    alerts
      .filter((alert) => alert.id.startsWith(ALERT_REPORT_PREFIX))
      .forEach((alert) => {
        if (!next.some((item) => item.id === alert.id)) {
          next.push(alert);
        }
      });

    const previousIds = new Set(alerts.map((alert) => alert.id));
    const createdAtMs = Date.now();
    const createdAt = new Date(createdAtMs).toLocaleString("es-CO");
    const newAlertsToPersist = next
      .filter((alert) => !previousIds.has(alert.id))
      .map((alert) => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        createdAt,
        createdAtMs,
        meta: alert.meta,
      } as AlertHistoryEntry));

    const changed =
      next.length !== alerts.length ||
      next.some((alert, idx) => {
        const prevItem = alerts[idx];
        if (!prevItem) return true;
        return (
          prevItem.id !== alert.id ||
          prevItem.title !== alert.title ||
          prevItem.description !== alert.description ||
          prevItem.meta !== alert.meta
        );
      });

    return { nextAlerts: next, newAlertsToPersist, changed };
  }, [
    alertClock,
    alerts,
    bodegaHighSlots,
    inboundHighBoxes,
    outboundHighBoxes,
    orders,
  ]);

  useEffect(() => {
    if (!computedAlerts.changed && computedAlerts.newAlertsToPersist.length === 0) {
      return;
    }
    setAlerts(computedAlerts.nextAlerts);
    computedAlerts.newAlertsToPersist.forEach(addAlerta);
  }, [addAlerta, computedAlerts]);

  useEffect(() => {
    if (availableBodegaForOrders.length === 0) {
      setBodegaOrderSourcePosition(1);
      return;
    }
    if (!availableBodegaForOrders.some((box) => box.position === bodegaOrderSourcePosition)) {
      setBodegaOrderSourcePosition(availableBodegaForOrders[0].position);
    }
  }, [availableBodegaForOrders, bodegaOrderSourcePosition]);

  useEffect(() => {
    if (availableInboundForOrders.length === 0) {
      setIngresoOrderSourcePosition(1);
      return;
    }
    if (!availableInboundForOrders.some((box) => box.position === ingresoOrderSourcePosition)) {
      setIngresoOrderSourcePosition(availableInboundForOrders[0].position);
    }
  }, [availableInboundForOrders, ingresoOrderSourcePosition]);

  useEffect(() => {
    const reviewList = reviewBodegaList;
    if (reviewList.length === 0) {
      setReviewSourcePosition(1);
      return;
    }
    if (!reviewList.some((box) => box.position === reviewSourcePosition)) {
      setReviewSourcePosition(reviewList[0].position);
    }
  }, [reviewSourcePosition, reviewBodegaList]);

  useEffect(() => {
    if (reviewSourceZone !== "bodega") {
      setReviewSourceZone("bodega");
    }
  }, [reviewSourceZone]);

  useEffect(() => {
    if (availableBodegaTargets.length === 0) {
      setBodegaOrderTargetPosition(1);
      setIngresoOrderTargetPosition(1);
      return;
    }
    if (!availableBodegaTargets.includes(bodegaOrderTargetPosition)) {
      setBodegaOrderTargetPosition(availableBodegaTargets[0]);
    }
    if (!availableBodegaTargets.includes(ingresoOrderTargetPosition)) {
      setIngresoOrderTargetPosition(availableBodegaTargets[0]);
    }
  }, [
    bodegaOrderTargetPosition,
    availableBodegaTargets,
    ingresoOrderTargetPosition,
  ]);

  useEffect(() => {
    const p = getNextSalidaPosition(outboundBoxes, reservedSalidaTargets, warehouseCapacity);
    setSalidaTargetPosition(p > 0 ? p : 1);
  }, [outboundBoxes, reservedSalidaTargets, warehouseCapacity]);

  useEffect(() => {
    if (availableBodegaForOrders.length === 0) {
      setSalidaSourcePosition(1);
      return;
    }
    if (!availableBodegaForOrders.some((box) => box.position === salidaSourcePosition)) {
      setSalidaSourcePosition(availableBodegaForOrders[0].position);
    }
  }, [availableBodegaForOrders, salidaSourcePosition]);

  const role = session?.role ?? "custodio";
  const isAdmin = role === "administrador";
  /** Incluye alias legacy `operador` (perfil de bodega); no confundir con `operadorCuentas`. */
  const isOperario =
    role === "operario" ||
    (role !== "operadorCuentas" && String(session?.role ?? "").toLowerCase().trim() === "operador");
  const isProcesador = role === "procesador";
  /** Misma vista de bodega / solicitudes que el operario; el procesador solo ejecuta tareas de procesamiento asignadas. */
  const isColaboradorBodega = isOperario || isProcesador;
  const isCustodio = role === "custodio";
  const isJefe = role === "jefe";
  const isCliente = role === "cliente";
  const isOperadorCuentas = role === "operadorCuentas";
  const isTransporte = role === "transporte";
  const isCuentaUsuario = isCliente || isOperadorCuentas;
  const isConfigurator = role === "configurador";
  const clientId = session?.clientId ?? null;
  const effectiveClientId = isCuentaUsuario ? clientFilterId || clientId || "cliente1" : clientId;
  const canManageAlerts = isJefe;

  const canSeeBodega = isAdmin || isColaboradorBodega;
  const _canUseIngresoForm = isCustodio;
  const canUseOrderForm = isJefe;
  const canUseSearch = isAdmin;

  useEffect(() => {
    if (!session) {
      setClients([]);
      setNewClientName("");
      setNewClientCode("");
      setUsers([]);
      setNewUserName("");
      setNewUserCode("");
      setNewUserClientId("");
      clientsLoadedRef.current = false;
    }
  }, [session]);

  useEffect(() => {
    if (!newClientName.trim()) {
      setNewClientCode("");
      return;
    }
    setNewClientCode(generateClientCode(newClientName));
  }, [generateClientCode, newClientName]);

  useEffect(() => {
    if (!newUserName.trim()) {
      setNewUserCode("");
      return;
    }
    setNewUserCode(generateClientCode(newUserName));
  }, [generateClientCode, newUserName]);

  useEffect(() => {
    if (!isConfigurator || activeTab !== "configuracion") {
      return;
    }
    if (clientsLoadedRef.current) {
      return;
    }
    clientsLoadedRef.current = true;
    fetchClients();
  }, [activeTab, fetchClients, isConfigurator]);

  useEffect(() => {
    if (!session) return;
    if (clientsLoadedRef.current) return;
    clientsLoadedRef.current = true;
    fetchClients();
  }, [fetchClients, session]);

  useEffect(() => {
    if (!session) return;
    setUsersLoading(true);
    const unsub = onSnapshot(
      collection(db, "usuarios"),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => configUserFromUsuariosDocSnap(d, sanitizeClientCode))
          .sort(
            (a, b) =>
              (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0) || a.name.localeCompare(b.name, "es"),
          );
        setUsers(items);
        setUsersLoading(false);
      },
      (err) => {
        console.error("No se pudieron escuchar usuarios", err);
        setMessage("No se pudieron cargar los usuarios. Revisa permisos de Firestore.");
        setUsersLoading(false);
      },
    );
    return () => unsub();
  }, [session, sanitizeClientCode]);

  const configuradorClients = useMemo(
    () => clients.filter((c) => c.createdByRole === "configurador" && !c.disabled),
    [clients],
  );

  /** Catálogo para custodio (salida / etiquetas): todas las cuentas activas; si solo pasábamos configuradorClients, cajas con otro client quedaban invisibles en «Orden de salida». */
  const custodioClientsCatalog = useMemo(
    () => clients.filter((c) => !c.disabled),
    [clients],
  );

  /**
   * Quienes reciben la orden en **Iniciado** para el movimiento en bodega (hacia zona de procesamiento):
   * solo `operario` o legacy `operador` de bodega. El **procesador** se asigna aparte (modal Procesamiento del jefe).
   */
  const operariosBodega = useMemo(() => {
    return users
      .filter((u) => {
        if (u.disabled) return false;
        if (u.role === "operadorCuentas") return false;
        const r = String(u.role ?? "").toLowerCase().trim();
        return r === "operario" || r === "operador";
      })
      .map((u) => ({
        id: u.id,
        name: u.name,
        roleLabel: etiquetaRolColaProcesamiento(u.role),
      }));
  }, [users]);

  const procesadoresBodega = useMemo(() => {
    return users
      .filter((u) => !u.disabled && String(u.role ?? "").toLowerCase().trim() === "procesador")
      .map((u) => ({ id: u.id, name: u.name }));
  }, [users]);

  const handlePushTareaProcesamientoOperario = useCallback((tarea: Record<string, unknown>) => {
    const tipo = String(tarea.tipo ?? "procesamiento").trim();
    const cid = String(tarea.clientId ?? "").trim();
    const sid =
      tipo === "venta_salida"
        ? String(tarea.ventaId ?? tarea.ordenVentaId ?? "").trim()
        : String(tarea.solicitudId ?? "").trim();
    if (!cid || !sid) return;
    setTareasProcesamientoOperario((prev) => {
      const idx = prev.findIndex((x) => {
        const xt = String(x.tipo ?? "procesamiento").trim();
        const xcid = String(x.clientId ?? "").trim();
        const xsid =
          xt === "venta_salida"
            ? String(x.ventaId ?? x.ordenVentaId ?? "").trim()
            : String(x.solicitudId ?? "").trim();
        return xcid === cid && xsid === sid;
      });
      if (idx === -1) return [...prev, tarea];
      const next = [...prev];
      next[idx] = { ...prev[idx], ...tarea };
      return next;
    });
  }, []);

  useEffect(() => {
    if (ingresoClientId) return;
    if (!configuradorClients.length) return;
    const sid = session?.clientId;
    const pick =
      sid && configuradorClients.some((c) => c.id === sid)
        ? sid
        : configuradorClients[0].id;
    setIngresoClientId(pick);
  }, [configuradorClients, session?.clientId, ingresoClientId]);

  const filterByClient = <T extends { client?: string }>(items: T[]) =>
    isCuentaUsuario && effectiveClientId ? items.filter((item) => item.client === effectiveClientId) : items;

  const inboundClient = filterByClient(inboundBoxes);
  const outboundClient = filterByClient(outboundBoxes);
  const dispatchedClient = filterByClient(dispatchedBoxes);
  const slotsClient = filterByClient(slots);

  const handleSelectSlot = (position: number) => {
    setSelectedPosition(position);
  };

  const _handleIngreso = () => {
    if (role !== "custodio") {
      setMessage("Solo el custodio registra ingresos.");
      return;
    }

    if (!ingresoName.trim()) {
      setMessage("Selecciona un producto del catálogo del cliente.");
      return;
    }

    const parsedTemp = Number(ingresoTemp);
    if (Number.isNaN(parsedTemp)) {
      setMessage("Ingresa una temperatura valida.");
      return;
    }

    const parsedKg = Number(ingresoQuantityKg);
    if (Number.isNaN(parsedKg) || parsedKg <= 0) {
      setMessage("Ingresa una cantidad valida en kg (mayor a 0).");
      return;
    }

    if (warehouseCapacity <= 0) {
      setMessage("Configura una capacidad mayor a 0 para esta bodega.");
      return;
    }

    const nextPosition = getNextIngresoPosition(inboundBoxes, warehouseCapacity);
    if (nextPosition <= 0 || nextPosition > warehouseCapacity) {
      setMessage("No hay cupos disponibles en esta bodega.");
      return;
    }

    if (!ingresoClientId.trim()) {
      setMessage("Selecciona un cliente para asociar la caja al catálogo.");
      return;
    }

    const newBox: Box = {
      position: nextPosition,
      autoId: createAutoId("CAJ"),
      name: ingresoName.trim(),
      temperature: parsedTemp,
      client: ingresoClientId.trim(),
      quantityKg: parsedKg,
    };

    setInboundBoxes((prev) => sortByPosition([newBox, ...prev]));
    setStats((prev) => ({ ...prev, ingresos: prev.ingresos + 1 }));
    addIngreso({ ...newBox, historialAtMs: Date.now() });
    setIngresoName("");
    setIngresoTemp("");
    setIngresoQuantityKg("");
    setMessage(`Caja registrada en ingresos ${nextPosition}.`);
  };

  const handleIngresoDesdeOrdenCompra = useCallback(
    async (payload: IngresoDesdeOrdenCompraPayload) => {
      if (role !== "custodio") {
        throw new Error("Solo el custodio registra ingresos.");
      }
      if (!session?.uid) {
        throw new Error("No hay sesión para registrar el cierre de la orden.");
      }
      if (warehouseCapacity <= 0) {
        throw new Error("Configurá una capacidad mayor a 0 para esta bodega.");
      }
      const destWh = (payload.orden.destinoWarehouseId ?? "").trim();
      if (destWh && destWh !== warehouseId.trim()) {
        throw new Error("Esta orden no está destinada a la bodega seleccionada en el panel.");
      }
      const clientId = payload.orden.idClienteDueno.trim();
      if (!clientId) {
        throw new Error("La orden no tiene cuenta dueña válida.");
      }

      const lines = payload.lineas;
      const extra = payload.lineaAdicional ?? null;

      const created: Box[] = [];
      let acc = [...inboundBoxes];
      const pushBox = (row: {
        name: string;
        temperature: number;
        quantityKg: number;
        ordenCompraId?: string;
        catalogoProductId?: string;
        almacenProductCode?: string;
      }) => {
        const nextPosition = getNextIngresoPosition(acc, warehouseCapacity);
        if (nextPosition <= 0 || nextPosition > warehouseCapacity) {
          throw new Error("No hay cupos suficientes en ingreso.");
        }
        if (Number.isNaN(row.temperature)) {
          throw new Error("Revisá la temperatura de cada producto verificado.");
        }
        if (Number.isNaN(row.quantityKg) || row.quantityKg <= 0) {
          throw new Error("Revisá la cantidad (kg) de cada producto verificado.");
        }
        const newBox: Box = {
          position: nextPosition,
          autoId: createAutoId("CAJ"),
          name: row.name.trim(),
          temperature: row.temperature,
          client: clientId,
          quantityKg: row.quantityKg,
          ...(row.ordenCompraId
            ? {
                ordenCompraId: row.ordenCompraId,
                ordenCompraClienteId: payload.orden.idClienteDueno,
              }
            : {}),
          ...(row.catalogoProductId?.trim()
            ? { catalogoProductId: row.catalogoProductId.trim() }
            : {}),
          ...(row.almacenProductCode?.trim()
            ? { almacenProductCode: row.almacenProductCode.trim() }
            : {}),
        };
        created.push(newBox);
        acc = sortByPosition([newBox, ...acc]);
      };

      for (const row of lines) {
        pushBox({
          name: row.name,
          temperature: row.temperature,
          quantityKg: row.quantityKg,
          ordenCompraId: payload.orden.id,
          catalogoProductId: row.catalogoProductId,
          almacenProductCode: row.almacenProductCode,
        });
      }
      if (extra) {
        pushBox({
          name: extra.name,
          temperature: extra.temperature,
          quantityKg: extra.quantityKg,
          catalogoProductId: extra.catalogoProductId,
          almacenProductCode: extra.almacenProductCode,
        });
      }

      if (created.length) {
        setInboundBoxes(acc);
        const now = Date.now();
        created.forEach((b) => addIngreso({ ...b, historialAtMs: now }));
        setStats((prev) => ({ ...prev, ingresos: prev.ingresos + created.length }));
      }

      const adicionales =
        extra != null
          ? [
              {
                titleSnapshot: extra.name.trim(),
                catalogoProductId: extra.catalogoProductId,
                pesoKgRecibido: extra.quantityKg,
                temperaturaRegistrada: extra.temperature,
              },
            ]
          : undefined;

      const { sinDiferencias } = await OrdenCompraService.finalizarIngresoCustodio(
        payload.orden.idClienteDueno,
        payload.orden.id,
        {
          pesosKgRecibidosPorLinea: payload.pesosRecibidosPorLinea,
          lineasAdicionales: adicionales,
          cerradaPorUid: session.uid,
          cerradaPorNombre: session.displayName,
        },
      );

      const estadoMsg = sinDiferencias ? "Cerrado(ok)" : "Cerrado(no ok)";
      setMessage(
        `Ingreso desde ${payload.orden.numero}: ${created.length} caja(s) en zona de ingreso. La orden quedó en «${estadoMsg}».`,
      );
    },
    [
      role,
      session?.uid,
      session?.displayName,
      warehouseCapacity,
      warehouseId,
      inboundBoxes,
      sortByPosition,
      addIngreso,
    ],
  );

  const handleIngresoDesdeOrdenVenta = useCallback(
    async (payload: IngresoDesdeOrdenVentaPayload) => {
      if (role !== "custodio") {
        throw new Error("Solo el custodio registra ingresos.");
      }
      if (!session?.uid) {
        throw new Error("No hay sesión para registrar el cierre de la venta.");
      }
      if (warehouseCapacity <= 0) {
        throw new Error("Configurá una capacidad mayor a 0 para esta bodega.");
      }
      const destWh = (payload.orden.destinoWarehouseId ?? "").trim();
      if (destWh && destWh !== warehouseId.trim()) {
        throw new Error("Esta venta no está destinada a la bodega seleccionada en el panel.");
      }
      const clientId = payload.orden.idClienteDueno.trim();
      if (!clientId) {
        throw new Error("La venta no tiene cuenta dueña válida.");
      }

      const lines = payload.lineas;
      const created: Box[] = [];
      let acc = [...inboundBoxes];
      const pushBox = (row: {
        name: string;
        temperature: number;
        quantityKg: number;
        ordenVentaId?: string;
        catalogoProductId?: string;
        almacenProductCode?: string;
      }) => {
        const nextPosition = getNextIngresoPosition(acc, warehouseCapacity);
        if (nextPosition <= 0 || nextPosition > warehouseCapacity) {
          throw new Error("No hay cupos suficientes en ingreso.");
        }
        if (Number.isNaN(row.temperature)) {
          throw new Error("Revisá la temperatura de cada producto verificado.");
        }
        if (Number.isNaN(row.quantityKg) || row.quantityKg <= 0) {
          throw new Error("Revisá la cantidad (kg) de cada producto verificado.");
        }
        const newBox: Box = {
          position: nextPosition,
          autoId: createAutoId("CAJ"),
          name: row.name.trim(),
          temperature: row.temperature,
          client: clientId,
          quantityKg: row.quantityKg,
          ...(row.ordenVentaId
            ? {
                ordenVentaId: row.ordenVentaId,
                ordenVentaClienteId: clientId,
              }
            : {}),
          ...(row.catalogoProductId?.trim()
            ? { catalogoProductId: row.catalogoProductId.trim() }
            : {}),
          ...(row.almacenProductCode?.trim()
            ? { almacenProductCode: row.almacenProductCode.trim() }
            : {}),
        };
        created.push(newBox);
        acc = sortByPosition([newBox, ...acc]);
      };

      for (const row of lines) {
        pushBox({
          name: row.name,
          temperature: row.temperature,
          quantityKg: row.quantityKg,
          ordenVentaId: payload.orden.id,
          catalogoProductId: row.catalogoProductId,
          almacenProductCode: row.almacenProductCode,
        });
      }

      if (created.length) {
        setInboundBoxes(acc);
        const now = Date.now();
        created.forEach((b) => addIngreso({ ...b, historialAtMs: now }));
        setStats((prev) => ({ ...prev, ingresos: prev.ingresos + created.length }));
      }

      const { sinDiferencias } = await OrdenVentaService.finalizarIngresoCustodioVenta(
        clientId,
        payload.orden.id,
        {
          kgEsperadosPorLinea: payload.kgEsperadosPorLinea,
          kgRecibidosPorLinea: payload.kgRecibidosPorLinea,
          cerradaPorUid: session.uid,
          cerradaPorNombre: session.displayName,
        },
      );

      const estadoMsg = sinDiferencias ? "Cerrado(ok)" : "Cerrado(no ok)";
      setMessage(
        `Salida / venta ${payload.orden.numero}: ${created.length} caja(s) en zona de ingreso. La venta quedó en «${estadoMsg}».`,
      );
    },
    [
      role,
      session?.uid,
      session?.displayName,
      warehouseCapacity,
      warehouseId,
      inboundBoxes,
      sortByPosition,
      addIngreso,
    ],
  );

  const handleCreateOrder = (params: {
    destination: OrderType;
    sourceZone: OrderSource;
    sourcePosition: number;
    targetPosition?: number;
    procesamientoOrigen?: ProcesamientoOrigenOrden;
  }) => {
    const { destination, sourceZone, sourcePosition, targetPosition, procesamientoOrigen } = params;

    if (role !== "jefe") {
      setMessage("Solo el jefe crea ordenes.");
      return;
    }

    if (destination === "a_bodega" && sourceZone === "procesamiento" && procesamientoOrigen) {
      const rol = procesamientoOrigen.rolDevolucion ?? "procesado";
      if (rol === "desperdicio") {
        const sk = Number(procesamientoOrigen.sobranteKg);
        if (!Number.isFinite(sk) || sk <= 0) {
          setMessage("Indicá kg de sobrante válidos (fracción del primario a reintegrar).");
          return;
        }
        const rowLike = solicitudLikeFromProcesamientoOrigen(procesamientoOrigen);
        const found = findSlotPrimarioParaDevolverDesperdicio(slots, rowLike);
        if (!found) {
          setMessage(
            "No hay casillero en bodega con el producto primario para devolver el desperdicio.",
          );
          return;
        }
        const newOrderProc: BodegaOrder = {
          id: createOrderId(),
          type: "a_bodega",
          sourcePosition: 0,
          sourceZone: "procesamiento",
          targetPosition: found.position,
          createdAt: new Date().toLocaleString("es-CO"),
          createdAtMs: Date.now(),
          createdBy: role,
          client: procesamientoOrigen.cuentaClientId,
          autoId: `SOBR-${procesamientoOrigen.numero}`,
          boxName: `Sobrante · ${procesamientoOrigen.productoPrimarioTitulo}`.slice(0, 240),
          procesamientoOrigen: {
            ...procesamientoOrigen,
            rolDevolucion: "desperdicio",
            sobranteKg: sk,
          },
        };
        setOrders((prev) => [newOrderProc, ...prev]);
        setMessage("Orden de devolución de sobrante creada.");
        return;
      }
      if (!targetPosition || !availableBodegaTargets.includes(targetPosition)) {
        setMessage("Selecciona una posicion libre en bodega.");
        return;
      }
      if (warehouseCapacity > 0 && targetPosition > warehouseCapacity) {
        setMessage("La posicion excede la capacidad de la bodega.");
        return;
      }
      const newOrderProc: BodegaOrder = {
        id: createOrderId(),
        type: "a_bodega",
        sourcePosition: 0,
        sourceZone: "procesamiento",
        targetPosition,
        createdAt: new Date().toLocaleString("es-CO"),
        createdAtMs: Date.now(),
        createdBy: role,
        client: procesamientoOrigen.cuentaClientId,
        autoId: `PROC-${procesamientoOrigen.numero}`,
        boxName: `${procesamientoOrigen.productoPrimarioTitulo} → ${procesamientoOrigen.productoSecundarioTitulo}`.slice(
          0,
          240,
        ),
        procesamientoOrigen: { ...procesamientoOrigen, rolDevolucion: "procesado" },
      };
      setOrders((prev) => [newOrderProc, ...prev]);
      setMessage("Orden creada correctamente.");
      return;
    }

    const effectiveSourceZone = destination === "a_salida" ? "bodega" : sourceZone;
    const effectiveSourcePosition = sourcePosition;

    const sourceList =
      effectiveSourceZone === "bodega" ? availableBodegaForOrders : availableInboundForOrders;
    if (sourceList.length === 0) {
      setMessage("No hay cajas disponibles sin tareas asignadas.");
      return;
    }

    const box = sourceList.find((item) => item.position === effectiveSourcePosition);
    if (!box) {
      setMessage("Selecciona una caja valida.");
      return;
    }

    let finalTargetPosition: number | undefined;

    if (destination === "a_bodega") {
      if (!targetPosition || !availableBodegaTargets.includes(targetPosition)) {
        setMessage("Selecciona una posicion libre en bodega.");
        return;
      }
      if (warehouseCapacity > 0 && targetPosition > warehouseCapacity) {
        setMessage("La posicion excede la capacidad de la bodega.");
        return;
      }
      finalTargetPosition = targetPosition;
    } else {
      if (warehouseCapacity <= 0) {
        setMessage("Configura una capacidad mayor a 0 para usar esta bodega.");
        return;
      }
      const salidaPosition = getNextSalidaPosition(
        outboundBoxes,
        reservedSalidaTargets,
        warehouseCapacity,
      );
      if (salidaPosition <= 0) {
        setMessage("No hay posicion libre en zona de salida (todas ocupadas o reservadas).");
        return;
      }
      finalTargetPosition = salidaPosition;
    }

    const newOrder: BodegaOrder = {
      id: createOrderId(),
      type: destination,
      sourcePosition: box.position,
      sourceZone: effectiveSourceZone,
      targetPosition: finalTargetPosition,
      createdAt: new Date().toLocaleString("es-CO"),
      createdAtMs: Date.now(),
      createdBy: role,
      client: box.client,
      autoId: box.autoId,
      boxName: box.name,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setMessage("Orden creada correctamente.");
    if (role === "jefe") {
      setBodegaOrderSourcePosition(availableBodegaForOrders[0]?.position ?? 1);
      setIngresoOrderSourcePosition(availableInboundForOrders[0]?.position ?? 1);
      setBodegaOrderTargetPosition(availableBodegaTargets[0] ?? 1);
      setIngresoOrderTargetPosition(availableBodegaTargets[0] ?? 1);
    }
  };

  const handleCreateReviewOrder = () => {
    if (role !== "jefe") {
      setMessage("Solo el jefe crea ordenes de revision.");
      return;
    }

    const reviewList = reviewBodegaList;
    if (reviewList.length === 0) {
      setMessage("No hay cajas disponibles sin tareas asignadas.");
      return;
    }

    const box = reviewList.find((item) => item.position === reviewSourcePosition);
    if (!box) {
      setMessage("Selecciona una caja valida.");
      return;
    }

    const newOrder: BodegaOrder = {
      id: createOrderId(),
      type: "revisar",
      sourcePosition: box.position,
      sourceZone: "bodega",
      createdAt: new Date().toLocaleString("es-CO"),
      createdAtMs: Date.now(),
      createdBy: role,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setMessage("Orden de revision creada correctamente.");
  };

  /** Persiste de inmediato al ejecutar tarea; además el payload se sanea en saveWarehouseState (Firestore no acepta `undefined`). */
  const persistWarehouseStateNow = useCallback(
    (full: {
      slots: Slot[];
      inboundBoxes: Box[];
      outboundBoxes: Box[];
      dispatchedBoxes: Box[];
      orders: BodegaOrder[];
      stats: BodegaStats;
      warehouseName: string;
      alerts: AlertItem[];
      assignedAlerts: AlertAssignment[];
      alertasOperario: Array<{ position: number;[key: string]: unknown }>;
      alertasOperarioSolved: number[];
      tareasProcesamientoOperario: Array<Record<string, unknown>>;
      llamadasJefe: Array<Record<string, unknown>>;
    }) => {
      if (!warehouseId.trim() || isExternalWarehouse) return;
      const slotsOut = slotsWithAlmacenProductCodeFilled(full.slots, productosCatalogoBodega);
      const inboundOut = boxesWithAlmacenProductCodeFilled(full.inboundBoxes, productosCatalogoBodega);
      const outboundOut = boxesWithAlmacenProductCodeFilled(full.outboundBoxes, productosCatalogoBodega);
      const dispatchedOut = boxesWithAlmacenProductCodeFilled(full.dispatchedBoxes, productosCatalogoBodega);
      const snap = JSON.stringify({
        slots: slotsOut,
        inboundBoxes: inboundOut,
        outboundBoxes: outboundOut,
        dispatchedBoxes: dispatchedOut,
        orders: full.orders,
        stats: full.stats,
        warehouseName: full.warehouseName,
        alerts: full.alerts,
        assignedAlerts: full.assignedAlerts,
        alertasOperario: full.alertasOperario,
        alertasOperarioSolved: full.alertasOperarioSolved,
        tareasProcesamientoOperario: full.tareasProcesamientoOperario,
        llamadasJefe: full.llamadasJefe,
      });
      lastSavedSnapshot.current = snap;
      void saveWarehouseState(warehouseId, {
        slots: slotsOut,
        inboundBoxes: inboundOut,
        outboundBoxes: outboundOut,
        dispatchedBoxes: dispatchedOut,
        orders: full.orders,
        stats: full.stats,
        warehouseName: full.warehouseName,
        alerts: full.alerts,
        assignedAlerts: full.assignedAlerts,
        alertasOperario: full.alertasOperario,
        alertasOperarioSolved: full.alertasOperarioSolved,
        tareasProcesamientoOperario: full.tareasProcesamientoOperario,
        llamadasJefe: full.llamadasJefe,
      }).catch((err: unknown) => {
        console.error("[bodega] saveWarehouseState al ejecutar tarea:", err);
        setMessage(
          "No se pudo guardar el estado en el servidor (revisá consola). Si recargás, la tarea puede volver a aparecer.",
        );
      });
    },
    [isExternalWarehouse, productosCatalogoBodega, setMessage, warehouseId],
  );

  /** Custodio: cajas en salida de una o varias OV (mismo cliente) → una sola acción; ventas «Transporte» + viajes para el rol transporte. */
  const handleDespachoPaqueteOrdenVenta = useCallback(
    async (ordenes: VentaPendienteCartonaje[], truck: Camion | null) => {
      if (role !== "custodio") {
        setMessage("Solo el custodio puede despachar paquetes.");
        return;
      }
      if (!ordenes.length) {
        setMessage("Elegí al menos una venta para el paquete.");
        return;
      }
      const clientIds = [
        ...new Set(ordenes.map((o) => String(o.idClienteDueno ?? "").trim()).filter(Boolean)),
      ];
      if (clientIds.length !== 1) {
        setMessage("Solo podés despachar juntas ventas de la misma cuenta (mismo cliente).");
        return;
      }
      const clientId = clientIds[0] ?? "";
      if (!clientId) {
        setMessage("Datos de venta incompletos.");
        return;
      }
      if (!truck?.id) {
        setMessage("Selecciona un camión disponible para el despacho.");
        return;
      }
      const seenBox = new Set<string>();
      const boxes: Box[] = [];
      for (const orden of ordenes) {
        const ventaId = String(orden.id ?? "").trim();
        const cid = String(orden.idClienteDueno ?? "").trim();
        if (!ventaId || !cid) continue;
        for (const b of outboundBoxes) {
          if (String(b.ordenVentaId ?? "").trim() !== ventaId) continue;
          if (String(b.ordenVentaClienteId ?? "").trim() !== cid) continue;
          const dedupe = `${b.position}-${String(b.autoId ?? "").trim()}`;
          if (seenBox.has(dedupe)) continue;
          seenBox.add(dedupe);
          boxes.push(b);
        }
      }
      if (boxes.length === 0) {
        setMessage("No hay cajas en salida vinculadas a las ventas del paquete.");
        return;
      }
      const positions = new Set(boxes.map((b) => b.position));
      const nextOutbound = outboundBoxes.filter((b) => !positions.has(b.position));
      const nextDispatched = sortByPosition([...boxes, ...dispatchedBoxes]);
      const baseAt = Date.now();
      boxes.forEach((box, i) => {
        addDespachado({
          id: `desp-${baseAt}-${i}-${box.autoId}-${box.position}`,
          box,
          atMs: baseAt,
          fromSalidaPosition: box.position,
          truckId: truck.id,
          truckCode: truck.code,
          truckPlate: truck.plate,
          truckBrand: truck.brand,
          truckModel: truck.model,
        });
      });
      setOutboundBoxes(nextOutbound);
      setDispatchedBoxes(nextDispatched);
      try {
        for (const orden of ordenes) {
          const ventaId = String(orden.id ?? "").trim();
          const cid = String(orden.idClienteDueno ?? "").trim();
          if (!ventaId || !cid) continue;
          await OrdenVentaService.updateEstado(cid, ventaId, "Transporte");
          await ViajeVentaTransporteService.crearDesdeVenta(
            cid,
            ventaId,
            orden.lineItems ?? [],
            truck,
          );
        }
        await TruckService.update(clientId, truck.id, { isAvailable: false });
      } catch (e: unknown) {
        console.error("[despacho paquete venta]", e);
        setMessage(
          e instanceof Error ? e.message : "No se pudo actualizar la venta o crear el viaje de transporte.",
        );
        return;
      }
      persistWarehouseStateNow({
        slots,
        inboundBoxes,
        outboundBoxes: nextOutbound,
        dispatchedBoxes: nextDispatched,
        orders,
        stats,
        warehouseName,
        alerts,
        assignedAlerts,
        alertasOperario,
        alertasOperarioSolved,
        tareasProcesamientoOperario,
        llamadasJefe,
      });
      const nums = ordenes.map((o) => o.numero).filter(Boolean);
      const resumen = nums.length ? nums.join(", ") : `${ordenes.length} venta(s)`;
      setMessage(
        `Paquete (${resumen}): ${boxes.length} caja(s) despachada(s). Camión ${truck.plate} asignado. Las ventas pasaron a «Transporte» y el transportista verá los viajes en su panel.`,
      );
    },
    [
      role,
      outboundBoxes,
      dispatchedBoxes,
      slots,
      inboundBoxes,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      tareasProcesamientoOperario,
      llamadasJefe,
      persistWarehouseStateNow,
      addDespachado,
      sortByPosition,
    ],
  );

  const handleProcesamientoTerminadoInventarioMapa = useCallback(
    async (
      nextSlots: Slot[],
      meta: {
        row: SolicitudProcesamiento;
        deductedKg: number;
        warning?: string;
        quitarTareaDeCola?: boolean;
      },
    ) => {
      const cid = meta.row.clientId.trim();
      const sid = meta.row.id.trim();
      const quitar = meta.quitarTareaDeCola !== false;
      const nextTareas = quitar
        ? tareasProcesamientoOperario.filter(
            (t) => !(String(t.clientId ?? "").trim() === cid && String(t.solicitudId ?? "").trim() === sid),
          )
        : tareasProcesamientoOperario.map((t) =>
            String(t.clientId ?? "").trim() === cid && String(t.solicitudId ?? "").trim() === sid
              ? { ...t, faseCola: "en_curso" }
              : t,
          );
      setSlots(nextSlots);
      setTareasProcesamientoOperario(nextTareas);
      const num = meta.row.numero;
      if (quitar) {
        setMessage(`Orden ${num} en «Pendiente»: falta ubicar el resultado en almacenamiento para cerrar el ciclo.`);
      } else {
        setMessage(
          meta.warning
            ? `Orden ${num} en curso (material retirado de bodega). ${meta.warning}`
            : meta.deductedKg > 0
              ? `Orden ${num} en curso. Descontados ${meta.deductedKg.toLocaleString("es-CO", { maximumFractionDigits: 4 })} kg en bodega.`
              : `Orden ${num} en curso.`,
        );
      }
      persistWarehouseStateNow({
        slots: nextSlots,
        inboundBoxes,
        outboundBoxes,
        dispatchedBoxes,
        orders,
        stats,
        warehouseName,
        alerts,
        assignedAlerts,
        alertasOperario,
        alertasOperarioSolved,
        tareasProcesamientoOperario: nextTareas,
        llamadasJefe,
      });
    },
    [
      persistWarehouseStateNow,
      tareasProcesamientoOperario,
      inboundBoxes,
      outboundBoxes,
      dispatchedBoxes,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      llamadasJefe,
    ],
  );

  const handleProcesamientoEnCursoDesdeColaOperario = useCallback(
    async (tarea: Record<string, unknown>, nextTareas: Array<Record<string, unknown>>) => {
      const wid = String(warehouseId ?? "").trim();
      const tareaMerged: Record<string, unknown> = {
        ...tarea,
        warehouseId: String(tarea.warehouseId ?? "").trim() || wid,
      };
      const like = tareaColaOperarioToSolicitudInventario(tareaMerged);
      let resultado!: ResultadoDescuentoProcesamiento;
      setSlots((prev) => {
        resultado = deductSlotsAfterProcesamientoTerminado(prev, like, wid);
        return resultado.slots;
      });

      const cid = String(tarea.clientId ?? "").trim();
      const sid = String(tarea.solicitudId ?? "").trim();
      const proc = procesadoresBodega[0];
      let tareasFinales = nextTareas;
      let reasignacionFallo = false;
      if (cid && sid && proc) {
        try {
          await SolicitudProcesamientoService.asignarOperarioBodega(cid, sid, {
            operarioUid: proc.id,
            operarioNombre: proc.name,
          });
          tareasFinales = nextTareas.map((x) =>
            String(x.clientId ?? "").trim() === cid && String(x.solicitudId ?? "").trim() === sid
              ? { ...x, faseCola: "en_curso", operarioUid: proc.id, operarioNombre: proc.name }
              : x,
          );
        } catch (e) {
          console.error("[BodegaDashboard] Reasignación al procesador tras «En curso»:", e);
          reasignacionFallo = true;
        }
      }

      setTareasProcesamientoOperario(tareasFinales);
      const baseMsg = resultado.warning
        ? `Orden ${like.numero} en curso (material retirado de bodega). ${resultado.warning}`
        : resultado.deductedKg > 0
          ? `Orden ${like.numero} en curso. Descontados ${resultado.deductedKg.toLocaleString("es-CO", { maximumFractionDigits: 4 })} kg en bodega.`
          : `Orden ${like.numero} en curso.`;
      const sufijoProc =
        reasignacionFallo
          ? " No se pudo reasignar al procesador en la nube; revisá la conexión."
          : !proc && cid && sid
            ? " No hay usuario con rol «procesador»: la tarea en cola sigue asignada al operario hasta que exista un procesador."
            : "";
      setMessage(`${baseMsg}${sufijoProc}`);
      if (cid && sid) {
        try {
          await SolicitudProcesamientoService.registrarKgPrimarioDescontado(cid, sid, {
            deductedKg: resultado.deductedKg,
            cantidadPrimario: like.cantidadPrimario,
            unidadPrimarioVisualizacion: like.unidadPrimarioVisualizacion,
            estimadoUnidadesSecundario: like.estimadoUnidadesSecundario,
            reglaConversionCantidadPrimario: like.reglaConversionCantidadPrimario,
            reglaConversionUnidadesSecundario: like.reglaConversionUnidadesSecundario,
          });
        } catch (e) {
          console.error("[BodegaDashboard] registrarKgPrimarioDescontado:", e);
        }
      }
      persistWarehouseStateNow({
        slots: resultado.slots,
        inboundBoxes,
        outboundBoxes,
        dispatchedBoxes,
        orders,
        stats,
        warehouseName,
        alerts,
        assignedAlerts,
        alertasOperario,
        alertasOperarioSolved,
        tareasProcesamientoOperario: tareasFinales,
        llamadasJefe,
      });
    },
    [
      warehouseId,
      procesadoresBodega,
      persistWarehouseStateNow,
      inboundBoxes,
      outboundBoxes,
      dispatchedBoxes,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      llamadasJefe,
    ],
  );

  const handleProcesamientoTerminadoDesdeColaOperario = useCallback(
    async (tarea: Record<string, unknown>) => {
      const like = tareaColaOperarioToSolicitudInventario(tarea);
      const cid = String(tarea.clientId ?? "").trim();
      const sid = String(tarea.solicitudId ?? "").trim();
      const nextTareas = tareasProcesamientoOperario.filter(
        (t) => !(String(t.clientId ?? "").trim() === cid && String(t.solicitudId ?? "").trim() === sid),
      );
      setTareasProcesamientoOperario(nextTareas);
      setMessage(`Orden ${like.numero} en «Pendiente»: cuando el operario ubique todo en almacenamiento pasará a «Terminado».`);
      persistWarehouseStateNow({
        slots,
        inboundBoxes,
        outboundBoxes,
        dispatchedBoxes,
        orders,
        stats,
        warehouseName,
        alerts,
        assignedAlerts,
        alertasOperario,
        alertasOperarioSolved,
        tareasProcesamientoOperario: nextTareas,
        llamadasJefe,
      });
    },
    [
      slots,
      tareasProcesamientoOperario,
      persistWarehouseStateNow,
      inboundBoxes,
      outboundBoxes,
      dispatchedBoxes,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      llamadasJefe,
    ],
  );

  /** Cuando el operario completó traslado procesamiento → mapa: si ya está todo ubicado, cerrar la solicitud como «Terminado». */
  const intentarMarcarProcesamientoTerminadoTrasTraslado = useCallback(
    async (procMeta: ProcesamientoOrigenOrden, slotsAfter: Slot[]) => {
      const cid = String(procMeta.cuentaClientId ?? "").trim();
      const sid = String(procMeta.solicitudId ?? "").trim();
      if (!cid || !sid) return;
      try {
        const row = await SolicitudProcesamientoService.obtenerSolicitud(cid, sid);
        if (!row) return;
        if (normalizeProcesamientoEstado(row.estado) !== "Pendiente") return;
        if (!procesamientoUbicacionCompletaEnMapa(slotsAfter, row)) return;
        await SolicitudProcesamientoService.actualizarEstado(cid, sid, "Terminado");
      } catch (e) {
        console.error("[BodegaDashboard] Marcar Terminado tras ubicar procesamiento en mapa:", e);
      }
    },
    [],
  );

  const executeOrder = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      setMessage("No se encontro la tarea. Si acaba de actualizar otro usuario, espera un momento y volve a intentar.");
      return;
    }

    if (!isOperario) {
      setMessage("Solo el operario ejecuta ordenes.");
      return;
    }

    const meta = {
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      tareasProcesamientoOperario,
      llamadasJefe,
    };

    const sourceIsBodega = order.sourceZone === "bodega";
    const sourceIsProcesamiento = order.sourceZone === "procesamiento";
    const boxFromIngreso = inboundBoxes.find((item) => item.position === order.sourcePosition);
    const boxFromBodega = slots.find((item) => item.position === order.sourcePosition);
    const boxFromSalida = outboundBoxes.find((item) => item.position === order.sourcePosition);
    let pendingCierreOc: { idCliente: string; ordenId: string } | null = null;

    if (order.type === "revisar") {
      const existsInIngreso = inboundBoxes.some((item) => item.position === order.sourcePosition);
      const existsInBodega = slots.some(
        (item) => item.position === order.sourcePosition && item.autoId.trim(),
      );
      const existsInSalida = outboundBoxes.some((item) => item.position === order.sourcePosition);
      if (
        (order.sourceZone === "ingresos" && !existsInIngreso) ||
        (order.sourceZone === "bodega" && !existsInBodega) ||
        (order.sourceZone === "salida" && !existsInSalida)
      ) {
        setMessage("La caja ya no esta disponible para revision.");
        return;
      }
      const nextOrdersRev = orders.filter((item) => item.id !== orderId);
      persistWarehouseStateNow({
        slots,
        inboundBoxes,
        outboundBoxes,
        dispatchedBoxes,
        orders: nextOrdersRev,
        stats,
        ...meta,
      });
      setOrders(nextOrdersRev);
      setMessage("Revision completada correctamente.");
      return;
    }

    if (order.type === "a_bodega") {
      const target = order.targetPosition;
      const slot = slots.find((item) => item.position === target);
      if (!target || !slot) {
        setMessage("La posicion de bodega no es valida.");
        return;
      }
      if (sourceIsBodega && target === order.sourcePosition) {
        setMessage("La posicion de destino debe ser diferente.");
        return;
      }

      if (sourceIsProcesamiento) {
        const procMeta = order.procesamientoOrigen;
        if (!procMeta) {
          setMessage("Orden invalida: falta dato de procesamiento.");
          return;
        }
        const rolProc = procMeta.rolDevolucion ?? "procesado";
        if (rolProc === "desperdicio") {
          const dk = Number(procMeta.sobranteKg) || 0;
          if (dk <= 0) {
            setMessage("La orden no tiene kg de sobrante válidos.");
            return;
          }
          const rowLike = solicitudLikeFromProcesamientoOrigen(procMeta);
          const match = findSlotPrimarioParaDevolverDesperdicio(slots, rowLike);
          if (!match || match.position !== target) {
            setMessage(
              "No se encontró el casillero del producto primario o el destino no coincide. Revisá el mapa.",
            );
            return;
          }
          if (!slot.autoId.trim()) {
            setMessage("El casillero del primario no tiene producto; no se puede reintegrar desperdicio.");
            return;
          }
          const recSlot = slot as unknown as Record<string, unknown>;
          const curKg = kgFromFirestoreSlotRecord(recSlot) ?? (Number(slot.quantityKg) || 0);
          const nextKg = (Number.isFinite(curKg) ? curKg : 0) + dk;
          const sidMark = String(procMeta.solicitudId).trim().slice(0, 120);
          const nextSlotsDesp = slots.map((item) => {
            if (item.position !== target) return item;
            return {
              ...item,
              quantityKg: nextKg,
              procesamientoDesperdicioDevueltoSolicitudId: sidMark,
            };
          });
          const nextStatsDesp = { ...stats, movimientosBodega: stats.movimientosBodega + 1 };
          const nextOrdersDesp = orders.filter((item) => item.id !== orderId);
          persistWarehouseStateNow({
            slots: nextSlotsDesp,
            inboundBoxes,
            outboundBoxes,
            dispatchedBoxes,
            orders: nextOrdersDesp,
            stats: nextStatsDesp,
            ...meta,
          });
          setSlots(nextSlotsDesp);
          setOrders(nextOrdersDesp);
          setStats(nextStatsDesp);
          addMovimientoBodega({ ...order, completadoAtMs: Date.now() });
          setMessage("Sobrante reintegrado al mismo producto primario en bodega.");
          void intentarMarcarProcesamientoTerminadoTrasTraslado(procMeta, nextSlotsDesp);
          return;
        }

        if (slot.autoId.trim()) {
          setMessage("La posicion de bodega ya esta ocupada.");
          return;
        }

        const qty = Math.max(0, Number(procMeta.cantidadPrimario) || 0);
        if (qty <= 0) {
          setMessage("La orden no tiene cantidad valida para ubicar en bodega.");
          return;
        }
        const isPeso = procMeta.unidadPrimarioVisualizacion === "peso";
        const filled: Record<string, unknown> = {
          autoId: (order.autoId && order.autoId.trim()) || `PROC-${procMeta.numero}`,
          name:
            (order.boxName && order.boxName.trim()) ||
            `${procMeta.productoPrimarioTitulo} → ${procMeta.productoSecundarioTitulo}`.slice(0, 200),
          temperature: 0,
          client: (order.client && order.client.trim()) || procMeta.cuentaClientId,
        };
        if (isPeso) {
          filled.quantityKg = qty;
        } else {
          filled.piezas = Math.max(1, Math.round(qty));
        }
        const secTit = (procMeta.productoSecundarioTitulo || "").trim();
        if (secTit) {
          filled.procesamientoSecundarioTitulo = secTit.slice(0, 240);
        }
        const solId = (procMeta.solicitudId || "").trim();
        if (solId) {
          filled.procesamientoSolicitudId = solId.slice(0, 120);
        }
        let est = procMeta.estimadoUnidadesSecundario;
        if (!(typeof est === "number" && Number.isFinite(est) && est > 0)) {
          const row = solicitudesProcSubscriptionRows.find(
            (s) =>
              s.clientId.trim() === procMeta.cuentaClientId.trim() && s.id.trim() === solId,
          );
          const rEst = row?.estimadoUnidadesSecundario;
          if (typeof rEst === "number" && Number.isFinite(rEst) && rEst > 0) {
            est = rEst;
          }
        }
        const udsMapa = typeof est === "number" && Number.isFinite(est) ? unidadesSecundarioEnterasParaMapa(est) : 0;
        if (udsMapa > 0) {
          filled.procesamientoUnidadesSecundario = udsMapa;
        }
        if (procMeta.productoPrimarioId?.trim()) {
          filled.catalogoProductId = procMeta.productoPrimarioId.trim();
        }
        const secCode = procMeta.catalogoAlmacenCodeSecundario?.trim();
        const primCode = procMeta.catalogoAlmacenCodePrimario?.trim();
        if (secCode) {
          filled.almacenProductCode = secCode;
        } else if (primCode) {
          filled.almacenProductCode = primCode;
        }
        if (!filled.almacenProductCode) {
          const solRow = solicitudesProcSubscriptionRows.find(
            (s) =>
              String(s.clientId).trim() === String(procMeta.cuentaClientId).trim() &&
              String(s.id).trim() === solId,
          );
          const secId = String(procMeta.productoSecundarioId ?? solRow?.productoSecundarioId ?? "").trim();
          const primId = String(procMeta.productoPrimarioId ?? solRow?.productoPrimarioId ?? "").trim();
          const catSec = secId ? primarioCatalogoPorId(productosCatalogoBodega, secId) : undefined;
          const catPrim = primId ? primarioCatalogoPorId(productosCatalogoBodega, primId) : undefined;
          const inferred =
            almacenProductCodeFromCatalogo(catSec) ?? almacenProductCodeFromCatalogo(catPrim);
          if (inferred) {
            filled.almacenProductCode = inferred;
          }
        }
        const nextSlotsProc = slots.map((item) =>
          item.position === target ? { ...item, ...(filled as Partial<Slot>) } : item,
        );
        const nextStatsProc = { ...stats, movimientosBodega: stats.movimientosBodega + 1 };
        const nextOrdersProc = orders.filter((item) => item.id !== orderId);
        persistWarehouseStateNow({
          slots: nextSlotsProc,
          inboundBoxes,
          outboundBoxes,
          dispatchedBoxes,
          orders: nextOrdersProc,
          stats: nextStatsProc,
          ...meta,
        });
        setSlots(nextSlotsProc);
        setOrders(nextOrdersProc);
        setStats(nextStatsProc);
        addMovimientoBodega({ ...order, completadoAtMs: Date.now() });
        setMessage("Producto de procesamiento ubicado en bodega.");
        void intentarMarcarProcesamientoTerminadoTrasTraslado(procMeta, nextSlotsProc);
        return;
      }

      if (slot.autoId.trim()) {
        setMessage("La posicion de bodega ya esta ocupada.");
        return;
      }

      if (!sourceIsBodega) {
        if (order.sourceZone === "ingresos" && !boxFromIngreso) {
          setMessage("La caja ya no esta en ingresos.");
          return;
        }
        if (order.sourceZone === "salida" && !boxFromSalida) {
          setMessage("La caja ya no esta en salida.");
          return;
        }
      }
      if (sourceIsBodega && (!boxFromBodega || !boxFromBodega.autoId.trim())) {
        setMessage("La caja ya no esta en bodega.");
        return;
      }

      const sourceBox = sourceIsBodega
        ? boxFromBodega
        : order.sourceZone === "salida"
          ? boxFromSalida
          : boxFromIngreso;

      if (!sourceIsBodega && order.sourceZone === "ingresos" && sourceBox) {
        const ocRef = readOrdenCompraRefs(sourceBox as Box | Slot);
        if (ocRef) {
          const hayOtraConMismaOc = inboundBoxes.some(
            (b) =>
              b.position !== order.sourcePosition &&
              b.ordenCompraId?.trim() === ocRef.ordenCompraId &&
              b.ordenCompraClienteId?.trim() === ocRef.ordenCompraClienteId,
          );
          if (!hayOtraConMismaOc) {
            pendingCierreOc = {
              idCliente: ocRef.ordenCompraClienteId,
              ordenId: ocRef.ordenCompraId,
            };
          }
        }
      }

      const boxAutoId = sourceBox?.autoId ?? "";
      const boxName = sourceBox?.name ?? "";
      const boxTemp = sourceBox?.temperature ?? 0;
      const boxClient = sourceBox?.client ?? "";
      const qtyToSlot = readQuantityKg(sourceBox as Box | Slot);
      const ocToSlot = readOrdenCompraRefs(sourceBox as Box | Slot);
      const ovToSlot = readOrdenVentaRefs(sourceBox as Box | Slot);

      const srcRec = sourceBox as unknown as Record<string, unknown>;
      const srcSlot = sourceBox as Slot;
      const procTituloMove = srcSlot.procesamientoSecundarioTitulo?.trim();
      const procUnidadesMove = srcSlot.procesamientoUnidadesSecundario;
      const procSolMove = srcSlot.procesamientoSolicitudId?.trim();
      let traceFromBox = slotTracePartialFromRecord(srcRec) as Partial<Slot>;
      const catPid = String(
        traceFromBox.catalogoProductId ??
          (typeof srcRec.catalogoProductId === "string" ? srcRec.catalogoProductId : ""),
      ).trim();
      if (
        (!traceFromBox.almacenProductCode || !String(traceFromBox.almacenProductCode).trim()) &&
        catPid
      ) {
        const inferred = almacenProductCodeFromCatalogo(
          primarioCatalogoPorId(productosCatalogoBodega, catPid),
        );
        if (inferred) {
          traceFromBox = { ...traceFromBox, almacenProductCode: inferred };
        }
      }
      const filledSlotPayload = {
        autoId: boxAutoId,
        name: boxName,
        temperature: boxTemp,
        client: boxClient,
        ...(qtyToSlot !== undefined ? { quantityKg: qtyToSlot } : { quantityKg: undefined }),
        ...traceFromBox,
        ...(procTituloMove
          ? { procesamientoSecundarioTitulo: procTituloMove.slice(0, 240) }
          : { procesamientoSecundarioTitulo: undefined }),
        ...(typeof procUnidadesMove === "number" &&
        Number.isFinite(procUnidadesMove) &&
        procUnidadesMove > 0
          ? { procesamientoUnidadesSecundario: procUnidadesMove }
          : { procesamientoUnidadesSecundario: undefined }),
        ...(procSolMove
          ? { procesamientoSolicitudId: procSolMove.slice(0, 120) }
          : { procesamientoSolicitudId: undefined }),
        ...(ocToSlot
          ? {
            ordenCompraId: ocToSlot.ordenCompraId,
            ordenCompraClienteId: ocToSlot.ordenCompraClienteId,
          }
          : {
            ordenCompraId: undefined,
            ordenCompraClienteId: undefined,
          }),
        ...(ovToSlot
          ? {
            ordenVentaId: ovToSlot.ordenVentaId,
            ordenVentaClienteId: ovToSlot.ordenVentaClienteId,
          }
          : {
            ordenVentaId: undefined,
            ordenVentaClienteId: undefined,
          }),
      };

      const nextSlotsBodega = slots.map((item) => {
        if (item.position === target) {
          return { ...item, ...filledSlotPayload };
        }
        if (sourceIsBodega && item.position === order.sourcePosition) {
          return { ...item, ...CLEARED_BODEGA_SLOT_PATCH };
        }
        return item;
      });

      let nextInboundBodega = inboundBoxes;
      let nextOutboundBodega = outboundBoxes;
      if (order.sourceZone === "ingresos") {
        nextInboundBodega = inboundBoxes.filter((item) => item.position !== order.sourcePosition);
      }
      if (order.sourceZone === "salida") {
        nextOutboundBodega = outboundBoxes.filter((item) => item.position !== order.sourcePosition);
      }

      const nextStatsBodega = {
        ...stats,
        movimientosBodega: stats.movimientosBodega + 1,
      };
      const nextOrdersBodega = orders.filter((item) => item.id !== orderId);

      persistWarehouseStateNow({
        slots: nextSlotsBodega,
        inboundBoxes: nextInboundBodega,
        outboundBoxes: nextOutboundBodega,
        dispatchedBoxes,
        orders: nextOrdersBodega,
        stats: nextStatsBodega,
        ...meta,
      });
      setSlots(nextSlotsBodega);
      setInboundBoxes(nextInboundBodega);
      setOutboundBoxes(nextOutboundBodega);
      setOrders(nextOrdersBodega);
      setStats(nextStatsBodega);

      addMovimientoBodega({ ...order, completadoAtMs: Date.now() });

      if (pendingCierreOc) {
        void OrdenCompraService.actualizarEstado(
          pendingCierreOc.idCliente,
          pendingCierreOc.ordenId,
          "Cerrado(ok)",
        )
          .then(() =>
            setMessage("Mercancía ubicada en bodega. Orden de compra cerrada (ok)."),
          )
          .catch(() =>
            setMessage(
              "Orden interna ejecutada, pero no se pudo cerrar la orden de compra en el servidor.",
            ),
          );
      } else {
        setMessage("Orden ejecutada correctamente.");
      }
      return;
    }

    let target = order.targetPosition;
    if (!target || target <= 0) {
      setMessage("La posicion de salida no es valida.");
      return;
    }
    if (outboundBoxes.some((item) => item.position === target)) {
      const reservedFromOthers = new Set<number>();
      orders.forEach((o) => {
        if (
          o.id !== orderId &&
          o.type === "a_salida" &&
          typeof o.targetPosition === "number"
        ) {
          reservedFromOthers.add(o.targetPosition);
        }
      });
      const fallback = getNextSalidaPosition(
        outboundBoxes,
        reservedFromOthers,
        warehouseCapacity,
      );
      if (fallback <= 0) {
        setMessage("La posicion de salida ya esta ocupada y no hay otro cupo libre.");
        return;
      }
      target = fallback;
    }
    if (!sourceIsBodega && !boxFromIngreso) {
      setMessage("La caja ya no esta en ingresos.");
      return;
    }
    if (sourceIsBodega && (!boxFromBodega || !boxFromBodega.autoId.trim())) {
      setMessage("La caja ya no esta en bodega.");
      return;
    }

    const boxAutoId = sourceIsBodega ? boxFromBodega?.autoId ?? "" : boxFromIngreso?.autoId ?? "";
    const boxName = sourceIsBodega ? boxFromBodega?.name ?? "" : boxFromIngreso?.name ?? "";
    const boxTemp = sourceIsBodega ? boxFromBodega?.temperature ?? 0 : boxFromIngreso?.temperature ?? 0;
    const boxClient = sourceIsBodega ? boxFromBodega?.client ?? "" : boxFromIngreso?.client ?? "";
    const qtyToSalida = sourceIsBodega
      ? readQuantityKg(boxFromBodega)
      : readQuantityKg(boxFromIngreso);
    const ocToSalida = readOrdenCompraRefs(
      sourceIsBodega ? boxFromBodega : boxFromIngreso,
    );
    const ovToSalida = readOrdenVentaRefs(sourceIsBodega ? boxFromBodega : boxFromIngreso);

    const srcCatSal = (sourceIsBodega ? boxFromBodega : boxFromIngreso) as Box | Slot | undefined;
    const salCatalogoId = String(srcCatSal?.catalogoProductId ?? "").trim();
    const salAlmacenCode = String(srcCatSal?.almacenProductCode ?? "").trim();

    const newBox: Box = {
      position: target,
      autoId: boxAutoId,
      name: boxName,
      temperature: boxTemp,
      client: boxClient,
      ...(qtyToSalida !== undefined ? { quantityKg: qtyToSalida } : {}),
      ...(salCatalogoId ? { catalogoProductId: salCatalogoId } : {}),
      ...(salAlmacenCode ? { almacenProductCode: salAlmacenCode } : {}),
      ...(ocToSalida
        ? {
          ordenCompraId: ocToSalida.ordenCompraId,
          ordenCompraClienteId: ocToSalida.ordenCompraClienteId,
        }
        : {}),
      ...(ovToSalida
        ? {
          ordenVentaId: ovToSalida.ordenVentaId,
          ordenVentaClienteId: ovToSalida.ordenVentaClienteId,
        }
        : {}),
    };

    let nextOutboundSalida: Box[];
    if (order.sourceZone === "salida") {
      nextOutboundSalida = sortByPosition([
        newBox,
        ...outboundBoxes.filter((item) => item.position !== order.sourcePosition),
      ]);
    } else {
      nextOutboundSalida = sortByPosition([newBox, ...outboundBoxes]);
    }

    let nextSlotsSalida = slots;
    if (sourceIsBodega) {
      nextSlotsSalida = slots.map((item) =>
        item.position === order.sourcePosition ? { ...item, ...CLEARED_BODEGA_SLOT_PATCH } : item,
      );
    }

    let nextInboundSalida = inboundBoxes;
    if (order.sourceZone === "ingresos") {
      nextInboundSalida = inboundBoxes.filter((item) => item.position !== order.sourcePosition);
    }

    const nextStatsSalida = { ...stats, salidas: stats.salidas + 1 };
    const nextOrdersSalida = orders.filter((item) => item.id !== orderId);

    persistWarehouseStateNow({
      slots: nextSlotsSalida,
      inboundBoxes: nextInboundSalida,
      outboundBoxes: nextOutboundSalida,
      dispatchedBoxes,
      orders: nextOrdersSalida,
      stats: nextStatsSalida,
      ...meta,
    });
    setSlots(nextSlotsSalida);
    setInboundBoxes(nextInboundSalida);
    setOutboundBoxes(nextOutboundSalida);
    setOrders(nextOrdersSalida);
    setStats(nextStatsSalida);

    addSalida({ ...order, targetPosition: target, completadoAtMs: Date.now() });

    setMessage("Orden ejecutada correctamente.");
  };

  /**
   * Cola «venta · salida»: descuenta del mapa la cantidad pedida (kg o u. según catálogo) y crea en salida
   * una caja por posición con ese peso; si sobra stock en mapa, la posición queda con el remanente.
   */
  const ejecutarSalidaVentaDesdeMapa = useCallback(
    async (tarea: Record<string, unknown>): Promise<boolean> => {
      if (!isOperario) {
        setMessage("Solo el operario ejecuta esta tarea.");
        return false;
      }
      const clientId = String(tarea.clientId ?? "").trim();
      const ventaId = String(tarea.ventaId ?? tarea.ordenVentaId ?? "").trim();
      if (!clientId || !ventaId) return false;

      const plan = planSalidaVentaDesdeMapa(slots, tarea);
      if (!plan.ok) {
        setMessage(plan.message);
        return false;
      }

      const { movimientos, slotsTrasDescuento } = plan;

      const occupiedOrReserved = new Set<number>();
      outboundBoxes.forEach((b) => occupiedOrReserved.add(b.position));
      reservedSalidaTargets.forEach((p) => occupiedOrReserved.add(p));
      let cuposLibres = 0;
      const cap = warehouseCapacity > 0 ? warehouseCapacity : 0;
      for (let p = 1; p <= cap; p++) {
        if (!occupiedOrReserved.has(p)) cuposLibres++;
      }
      if (movimientos.length > cuposLibres) {
        setMessage(
          `No hay cupos suficientes en salida (${movimientos.length} caja(s), ${cuposLibres} posiciones libres). Liberá salida o despachá cajas.`,
        );
        return false;
      }

      let nextOutbound = [...outboundBoxes];
      const nextSlots = slotsTrasDescuento;
      let salidasCount = 0;
      const extraReserved = new Set(reservedSalidaTargets);

      const meta = {
        warehouseName,
        alerts,
        assignedAlerts,
        alertasOperario,
        alertasOperarioSolved,
        tareasProcesamientoOperario,
        llamadasJefe,
      };

      for (const mov of movimientos) {
        const slotOrig = slots.find((s) => s.position === mov.position);
        const live = slotOrig;
        if (!live || !String(live.autoId ?? "").trim()) continue;

        const target = getNextSalidaPosition(nextOutbound, extraReserved, warehouseCapacity);
        if (target <= 0) {
          setMessage("No hay posición libre en salida.");
          return false;
        }

        const qtyToSalida = mov.kgSalida;
        const ocToSalida = readOrdenCompraRefs(live);
        const ovToSalida = readOrdenVentaRefs(live);
        const ovSalidaFinal = ovToSalida ?? {
          ordenVentaId: ventaId,
          ordenVentaClienteId: clientId,
        };

        const catLive = String(live.catalogoProductId ?? "").trim();
        const almLive = String(live.almacenProductCode ?? "").trim();

        const newBox: Box = {
          position: target,
          autoId: live.autoId,
          name: live.name,
          temperature: live.temperature ?? 0,
          client: live.client,
          ...(qtyToSalida > 0 ? { quantityKg: qtyToSalida } : {}),
          ...(catLive ? { catalogoProductId: catLive } : {}),
          ...(almLive ? { almacenProductCode: almLive } : {}),
          ...(ocToSalida
            ? {
                ordenCompraId: ocToSalida.ordenCompraId,
                ordenCompraClienteId: ocToSalida.ordenCompraClienteId,
              }
            : {}),
          ordenVentaId: ovSalidaFinal.ordenVentaId,
          ordenVentaClienteId: ovSalidaFinal.ordenVentaClienteId,
        };

        nextOutbound = sortByPosition([newBox, ...nextOutbound]);
        salidasCount += 1;

        const syntheticOrder: BodegaOrder = {
          id: createOrderId(),
          type: "a_salida",
          sourcePosition: mov.position,
          sourceZone: "bodega",
          targetPosition: target,
          createdAt: new Date().toLocaleString("es-CO"),
          createdAtMs: Date.now(),
          createdBy: role,
          client: live.client,
          autoId: live.autoId,
          boxName: live.name,
        };
        addSalida({ ...syntheticOrder, targetPosition: target, completadoAtMs: Date.now() });
      }

      if (salidasCount === 0) {
        setMessage("No se pudo mover ninguna caja (posiciones vacías o sin stock).");
        return false;
      }

      const nextStats = { ...stats, salidas: stats.salidas + salidasCount };
      persistWarehouseStateNow({
        slots: nextSlots,
        inboundBoxes,
        outboundBoxes: nextOutbound,
        dispatchedBoxes,
        orders,
        stats: nextStats,
        ...meta,
      });
      setSlots(nextSlots);
      setOutboundBoxes(nextOutbound);
      setStats(nextStats);
      setMessage(`Listo: ${salidasCount} caja(s) pasada(s) de bodega a salida (cantidad según el pedido).`);
      return true;
    },
    [
      isOperario,
      role,
      slots,
      outboundBoxes,
      reservedSalidaTargets,
      warehouseCapacity,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      tareasProcesamientoOperario,
      llamadasJefe,
      inboundBoxes,
      dispatchedBoxes,
      orders,
      stats,
      persistWarehouseStateNow,
      addSalida,
      sortByPosition,
    ],
  );

  const handleSearch = () => {
    const id = searchId.trim();
    if (!id) {
      setMessage("Ingresa un id o nombre para buscar.");
      return;
    }

    const ingreso = inboundBoxes.find((box) => box.autoId === id || box.name === id);
    if (ingreso) {
      setMessage(`El id ${id} esta en ingresos ${ingreso.position}.`);
      return;
    }

    const bodega = slots.find((slot) => slot.autoId === id || slot.name === id);
    if (bodega) {
      setMessage(`El id ${id} esta en bodega ${bodega.position}.`);
      return;
    }

    const salida = outboundBoxes.find((box) => box.autoId === id || box.name === id);
    if (salida) {
      setMessage(`El id ${id} esta en salida ${salida.position}.`);
      return;
    }

    setMessage(`No se encontro el id ${id}.`);
  };

  const handleDispatchBox = async (
    position: number,
    truck: Camion | null,
    truckClientId: string,
  ): Promise<boolean> => {
    if (role !== "custodio") {
      setMessage("Solo el custodio puede enviar cajas.");
      return false;
    }
    if (!truck?.id) {
      setMessage("Selecciona un camión disponible para el envío.");
      return false;
    }

    const box = outboundBoxes.find((item) => item.position === position);
    if (!box) {
      setMessage("La caja ya no esta en salida.");
      return false;
    }

    setOutboundBoxes((prev) => prev.filter((item) => item.position !== position));
    setDispatchedBoxes((prev) => sortByPosition([box, ...prev]));
    addDespachado({
      id: `desp-${Date.now()}-${box.autoId}`,
      box,
      atMs: Date.now(),
      fromSalidaPosition: position,
      truckId: truck.id,
      truckCode: truck.code,
      truckPlate: truck.plate,
      truckBrand: truck.brand,
      truckModel: truck.model,
    });
    try {
      const safeClientId = String(truckClientId ?? "").trim();
      if (!safeClientId) {
        throw new Error("No se pudo determinar el cliente del camión.");
      }
      await TruckService.update(safeClientId, truck.id, {
        isAvailable: false,
      });
    } catch (e: unknown) {
      console.error("[despacho manual]", e);
      setMessage(
        e instanceof Error
          ? e.message
          : "La caja se envio, pero no se pudo actualizar el estado del camion.",
      );
      return false;
    }
    setMessage(`Caja en salida ${position} enviada. Camion ${truck.plate} asignado.`);
    return true;
  };

  const createReturnOrder = useCallback(
    (box: Box, targetPosition: number): string | null => {
      if (!targetPosition || !availableBodegaTargets.includes(targetPosition)) {
        return "Selecciona una posición libre en bodega.";
      }

      const targetSlot = slots.find((item) => item.position === targetPosition);
      if (!targetSlot || targetSlot.autoId.trim()) {
        return "La posición de bodega ya está ocupada.";
      }

      const pending = orders.some(
        (order) =>
          order.type === "a_bodega" &&
          order.sourceZone === "salida" &&
          Number(order.sourcePosition) === Number(box.position),
      );
      if (pending) {
        return "Ya existe una tarea para esta caja.";
      }

      const newOrder: BodegaOrder = {
        id: createOrderId(),
        type: "a_bodega",
        sourcePosition: box.position,
        sourceZone: "salida",
        targetPosition,
        createdAt: new Date().toLocaleString("es-CO"),
        createdAtMs: Date.now(),
        createdBy: role,
        client: box.client,
        autoId: box.autoId,
        boxName: box.name,
      };

      setOrders((prev) => [newOrder, ...prev]);
      setMessage("Se creó una tarea para devolver la caja a bodega.");
      return null;
    },
    [availableBodegaTargets, orders, role, slots],
  );

  const handleReportOrder = (orderId: string) => {
    if (!isOperario) {
      setMessage("Solo el operario puede reportar fallos.");
      return;
    }
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      setMessage("No se encontro la tarea para reportar.");
      return;
    }

    const createdAt = new Date().toLocaleString("es-CO");
    setAlerts((prev) => [
      {
        id: createAlertId(ALERT_REPORT_PREFIX),
        title: "Reporte de fallo",
        description: `${formatOrderDetails(order)} · Reportado por ${session?.displayName ?? "Operario"} · ${createdAt}.`,
        sourceOrderId: order.id,
      },
      ...prev,
    ]);
    setMessage("Reporte enviado al jefe.");
  };

  const handleAssignAlert = (alert: AlertItem) => {
    if (role !== "jefe") {
      setMessage("Solo el jefe puede asignar alertas.");
      return;
    }

    const kind = getAlertKind(alert);
    if (kind === "otro") {
      setMessage("Esta alerta no se puede asignar al operario.");
      return;
    }

    if (assignedAlerts.some((item) => item.alertId === alert.id)) {
      setMessage("La alerta ya esta asignada al operario.");
      return;
    }

    const assignedAt = new Date().toLocaleString("es-CO");
    setAssignedAlerts((prev) => [
      {
        alertId: alert.id,
        kind,
        assignedAt,
        assignedBy: session?.displayName ?? "Jefe",
        sourceOrderId: alert.sourceOrderId,
      },
      ...prev,
    ]);
    setMessage("Alerta asignada al operario.");
  };

  const handleExecuteAssignedAlert = (alert: AlertItem) => {
    if (!isOperario) {
      setMessage("Solo el operario ejecuta alertas asignadas.");
      return;
    }

    const kind = getAlertKind(alert);
    if (kind === "temperatura") {
      openResolveModal(alert);
      return;
    }

    if (kind === "reporte") {
      const sourceOrderId = alert.sourceOrderId;
      if (!sourceOrderId) {
        setMessage("No se encontro la orden reportada.");
        return;
      }
      setOrders((prev) =>
        prev.map((order) =>
          order.id === sourceOrderId
            ? {
              ...order,
              createdAt: new Date().toLocaleString("es-CO"),
              createdAtMs: Date.now(),
            }
            : order,
        ),
      );
      handleResolveAlert(alert.id);
      setMessage("Tarea reprogramada y alerta gestionada.");
      return;
    }

    setMessage("Esta alerta no se puede ejecutar.");
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    setAssignedAlerts((prev) => prev.filter((assignment) => assignment.alertId !== alertId));
  };

  const openResolveModal = (alert: AlertItem) => {
    setResolveModalAlert(alert);
    if (isTemperatureAlert(alert.id)) {
      const location = alert.id.match(/^alerta-temp-(entrada|bodega|salida)-(\d+)/);
      if (location) {
        const [, zoneLabel, positionStr] = location;
        const zone: OrderSource =
          zoneLabel === "entrada" ? "ingresos" : zoneLabel === "salida" ? "salida" : "bodega";
        setTempFixZone(zone);
        setTempFixPosition(Number(positionStr));
      } else {
        const first = tempFixOptions[0];
        if (first) {
          setTempFixZone(first.zone);
          setTempFixPosition(first.position);
        }
      }
      setTempFixValue("");
    }
  };

  const handleResolveWithSolution = () => {
    if (!resolveModalAlert) {
      return;
    }

    if (isTemperatureAlert(resolveModalAlert.id)) {
      const parsedTemp = Number(tempFixValue);
      if (!Number.isFinite(parsedTemp)) {
        setMessage("Ingresa una temperatura valida.");
        return;
      }

      const alertId = resolveModalAlert.id;
      let nextInbound = inboundBoxes;
      let nextOutbound = outboundBoxes;
      let nextSlotsState = slots;

      if (tempFixZone === "ingresos") {
        nextInbound = inboundBoxes.map((box) =>
          box.position === tempFixPosition ? { ...box, temperature: parsedTemp } : box,
        );
      } else if (tempFixZone === "salida") {
        nextOutbound = outboundBoxes.map((box) =>
          box.position === tempFixPosition ? { ...box, temperature: parsedTemp } : box,
        );
      } else {
        nextSlotsState = slots.map((slot) =>
          slot.position === tempFixPosition ? { ...slot, temperature: parsedTemp } : slot,
        );
      }

      const nextAlerts = alerts.filter((a) => a.id !== alertId);
      const nextAssigned = assignedAlerts.filter((a) => a.alertId !== alertId);

      setInboundBoxes(nextInbound);
      setOutboundBoxes(nextOutbound);
      setSlots(nextSlotsState);
      setAlerts(nextAlerts);
      setAssignedAlerts(nextAssigned);

      persistWarehouseStateNow({
        slots: nextSlotsState,
        inboundBoxes: nextInbound,
        outboundBoxes: nextOutbound,
        dispatchedBoxes,
        orders,
        stats,
        warehouseName,
        alerts: nextAlerts,
        assignedAlerts: nextAssigned,
        alertasOperario,
        alertasOperarioSolved,
        tareasProcesamientoOperario,
        llamadasJefe,
      });

      setMessage("Temperatura actualizada.");
      setResolveModalAlert(null);
      return;
    }

    if (resolveModalAlert.id.startsWith(ALERT_ORDER_PREFIX)) {
      const orderId = resolveModalAlert.id.replace(ALERT_ORDER_PREFIX, "");
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
              ...order,
              createdAt: new Date().toLocaleString("es-CO"),
              createdAtMs: Date.now(),
            }
            : order,
        ),
      );
      setMessage("Tarea reprogramada.");
      handleResolveAlert(resolveModalAlert.id);
      setResolveModalAlert(null);
      return;
    }

    if (resolveModalAlert.id.startsWith(ALERT_REPORT_PREFIX)) {
      const sourceOrderId = resolveModalAlert.sourceOrderId;
      if (sourceOrderId) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === sourceOrderId
              ? {
                ...order,
                createdAt: new Date().toLocaleString("es-CO"),
                createdAtMs: Date.now(),
              }
              : order,
          ),
        );
        setMessage("Tarea reprogramada.");
      } else {
        setMessage("No se encontro la orden reportada.");
      }
      handleResolveAlert(resolveModalAlert.id);
      setResolveModalAlert(null);
      return;
    }

    handleResolveAlert(resolveModalAlert.id);
    setMessage("Alerta gestionada.");
    setResolveModalAlert(null);
  };

  const tabs = useMemo(
    () =>
      [
        { key: "estado", label: "Estado de bodega", visible: isAdmin },
        {
          key: "ingresos",
          label: "Ingreso",
          visible: isCustodio,
        },
        {
          key: "ordenesCompraCustodio",
          label: "Orden de compra",
          visible: isCustodio,
        },
        {
          key: "ordenesVentaCustodio",
          label: "Orden de venta",
          visible: isCustodio,
        },
        {
          key: "ordenes",
          label: "Orden de trabajo",
          visible: canUseOrderForm && !isJefe,
        },
        {
          key: "solicitudes",
          label: "Solicitudes pendientes",
          visible: isColaboradorBodega,
        },
        {
          key: "configuracion",
          label: "Configuración",
          visible: isConfigurator,
        },
        { key: "alertas", label: "Gestion de alertas", visible: false },
        { key: "reportes", label: "Reportes", visible: isAdmin || isCuentaUsuario },
      ].filter((tab) => tab.visible),
    [isAdmin, isCuentaUsuario, isCustodio, isColaboradorBodega, isJefe, canUseOrderForm, isConfigurator],
  );

  useEffect(() => {
    if (isJefe) {
      if (activeTab !== "ordenes") {
        setActiveTab("ordenes");
      }
      return;
    }
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab((tabs[0]?.key ?? "ingresos") as typeof activeTab);
    }
  }, [activeTab, isJefe, tabs]);

  if (!isHydrated) {
    return (
      <div className="relative min-h-screen bg-black px-6 text-white">
        <LoginPolariaBackdrop />
        <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm" />
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-black px-6 text-white">
        <LoginPolariaBackdrop />
        <main className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center">
          <LoginCard
            username={loginUser}
            password={loginPassword}
            onUsernameChange={setLoginUser}
            onPasswordChange={setLoginPassword}
            onSubmit={handleLogin}
            errorMessage={loginError}
            quickFillActions={
              loginRoleShortcutsEnabled
                ? getLoginRoleShortcuts().map((s) => ({
                    label: s.label,
                    onFill: () => {
                      setLoginUser(s.email);
                      setLoginPassword(s.password);
                      setLoginError("");
                    },
                  }))
                : undefined
            }
          />
        </main>
      </div>
    );
  }

  function handleUpdateBoxTemperature(position: number, newTemp: number) {
    const nextSlotsState = slots.map((slot) =>
      slot.position === position ? { ...slot, temperature: newTemp } : slot,
    );
    setSlots(nextSlotsState);
    setSelectedBoxModal((prev) =>
      prev && prev.position === position ? { ...prev, temperature: newTemp } : prev,
    );
    setMessage("Temperatura actualizada");
    persistWarehouseStateNow({
      slots: nextSlotsState,
      inboundBoxes,
      outboundBoxes,
      dispatchedBoxes,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      tareasProcesamientoOperario,
      llamadasJefe,
    });
  }

  /** Operario: al guardar temperatura al resolver alerta, actualizar la caja en la zona correcta y persistir. */
  function handlePersistTemperatureForAlert(
    position: number,
    newTemp: number,
    zone: OrderSource,
  ) {
    const pos = Number(position);
    if (!Number.isFinite(newTemp)) return;

    let nextSlots = slots;
    let nextInbound = inboundBoxes;
    let nextOutbound = outboundBoxes;

    if (zone === "bodega") {
      nextSlots = slots.map((s) => (s.position === pos ? { ...s, temperature: newTemp } : s));
      setSlots(nextSlots);
    } else if (zone === "ingresos") {
      nextInbound = inboundBoxes.map((b) =>
        b.position === pos ? { ...b, temperature: newTemp } : b,
      );
      setInboundBoxes(nextInbound);
    } else if (zone === "salida") {
      nextOutbound = outboundBoxes.map((b) =>
        b.position === pos ? { ...b, temperature: newTemp } : b,
      );
      setOutboundBoxes(nextOutbound);
    }

    setSelectedBoxModal((prev) =>
      prev && prev.position === pos ? { ...prev, temperature: newTemp } : prev,
    );
    setMessage("Temperatura actualizada");
    persistWarehouseStateNow({
      slots: nextSlots,
      inboundBoxes: nextInbound,
      outboundBoxes: nextOutbound,
      dispatchedBoxes,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario,
      alertasOperarioSolved,
      tareasProcesamientoOperario,
      llamadasJefe,
    });
  }

  /**
   * Un solo persist con temperatura + lista de alertas ya sin la fila resuelta.
   * Si se persiste antes de quitar la alerta, onSnapshot vuelve a traer la alerta desde Firestore.
   */
  function handleOperarioResolveTemperatureAlert(payload: {
    position: number;
    newTemp: number;
    zone: OrderSource;
    alertIndex: number;
  }) {
    const { position, newTemp, zone, alertIndex } = payload;
    const pos = Number(position);
    if (!Number.isFinite(newTemp) || alertIndex < 0 || alertIndex >= alertasOperario.length) {
      return;
    }

    let nextSlots = slots;
    let nextInbound = inboundBoxes;
    let nextOutbound = outboundBoxes;

    if (zone === "bodega") {
      nextSlots = slots.map((s) => (s.position === pos ? { ...s, temperature: newTemp } : s));
    } else if (zone === "ingresos") {
      nextInbound = inboundBoxes.map((b) =>
        b.position === pos ? { ...b, temperature: newTemp } : b,
      );
    } else if (zone === "salida") {
      nextOutbound = outboundBoxes.map((b) =>
        b.position === pos ? { ...b, temperature: newTemp } : b,
      );
    }

    const remainingAlerts = alertasOperario.filter((_, i) => i !== alertIndex);
    const solvedPositions = alertasOperarioSolved.includes(pos)
      ? alertasOperarioSolved
      : [...alertasOperarioSolved, pos];

    setSlots(nextSlots);
    setInboundBoxes(nextInbound);
    setOutboundBoxes(nextOutbound);
    setAlertasOperario(remainingAlerts);
    setAlertasOperarioSolved(solvedPositions);
    setSelectedBoxModal((prev) =>
      prev && prev.position === pos ? { ...prev, temperature: newTemp } : prev,
    );
    setMessage("Temperatura actualizada");

    persistWarehouseStateNow({
      slots: nextSlots,
      inboundBoxes: nextInbound,
      outboundBoxes: nextOutbound,
      dispatchedBoxes,
      orders,
      stats,
      warehouseName,
      alerts,
      assignedAlerts,
      alertasOperario: remainingAlerts,
      alertasOperarioSolved: solvedPositions,
      tareasProcesamientoOperario,
      llamadasJefe,
    });
  }

  if (isTransporte) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <Header
            occupiedCount={0}
            totalSlots={0}
            dateLabel={dateLabel}
            warehouseId=""
            warehouseName=""
            warehouses={[]}
            onSelectWarehouse={() => undefined}
            showIntro={false}
            showMeta={false}
            canSearch={false}
            searchValue=""
            onSearchChange={() => undefined}
            onSearchSubmit={() => undefined}
            userDisplayName={session.displayName}
            onLogout={handleLogout}
            role={role}
          />
          <TransporteViajesPanel uid={session.uid} displayName={session.displayName} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-10 pb-24 text-slate-900">
      <main
        className={`mx-auto flex w-full flex-col gap-8 ${
          isCustodio &&
            (activeTab === "ingresos" ||
              activeTab === "ordenesCompraCustodio" ||
              activeTab === "ordenesVentaCustodio")
            ? "max-w-[min(100%,100rem)]"
            : "max-w-6xl"
        }`}
      >
        <Header
          occupiedCount={occupiedCount}
          totalSlots={warehouseCapacity}
          dateLabel={dateLabel}
          warehouseId={warehouseId}
          warehouseName={warehouseName}
          warehouses={warehouses}
          onSelectWarehouse={handleSelectWarehouse}
          showIntro={!isColaboradorBodega}
          showMeta={!isColaboradorBodega}
          canSearch={canUseSearch}
          searchValue={searchId}
          onSearchChange={setSearchId}
          onSearchSubmit={handleSearch}
          userDisplayName={session?.displayName}
          onLogout={handleLogout}
          onGoMenu={() => {
            if (isCuentaUsuario && activeTab === "reportes") {
              setReportesClienteMenuNonce((n) => n + 1);
            }
            if (isConfigurator && activeTab === "configuracion") {
              setConfiguradorMenuNonce((n) => n + 1);
            }
          }}
          role={role}
        />
        <>
            {isAdmin ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* <div className="flex-1 min-w-[260px]">
                  <WarehouseSelector
                    role={role}
                    warehouseId={warehouseId}
                    warehouseName={warehouseName}
                    warehouses={warehouses}
                    onSelectWarehouse={handleSelectWarehouse}
                    onCreateWarehouse={handleCreateWarehouse}
                    isLoading={warehousesLoading}
                  />
                </div> */}
              </div>
            ) : null}

            {!isJefe && tabs.length > 1 ? (
              <section className="rounded-2xl bg-linear-to-r from-slate-50 to-white border border-slate-200 p-3 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => {
                    let icon = null;
                    if (tab.key === "estado") icon = <span className="mr-2"><AiTwotoneAppstore /></span>;
                    if (tab.key === "ingresos") icon = <span className="mr-2"><FaBoxOpen /></span>;
                    if (tab.key === "ordenesCompraCustodio") icon = <span className="mr-2"><BiTask /></span>;
                    if (tab.key === "ordenesVentaCustodio") icon = <span className="mr-2"><MdOutlinePointOfSale /></span>;
                    if (tab.key === "ordenes") icon = <span className="mr-2">📝</span>;
                    if (tab.key === "solicitudes") icon = <span className="mr-2">⏳</span>;
                    if (tab.key === "reportes") icon = <span className="mr-2"><SlGraph /></span>;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`relative flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${activeTab === tab.key
                          ? "bg-slate-900 text-white shadow-md scale-105"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        style={{ minWidth: 120 }}
                      >
                        {icon}
                        <span>{tab.label}</span>
                        {activeTab === tab.key && (
                          <span className="absolute left-2 right-2 -bottom-1 h-1 rounded-b-xl bg-emerald-400/80 animate-fadeIn" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {activeTab === "estado" && canSeeBodega ? (
              <EstadoBodegaSection
                inboundBoxes={inboundBoxes}
                slots={slots}
                selectedPosition={selectedPosition}
                handleSelectSlot={handleSelectSlot}
                renderStatusButtons={renderStatusButtons}
                selectedSlot={selectedSlot}
                setSelectedPosition={setSelectedPosition}
                outboundBoxes={outboundBoxes}
                sortByPosition={sortByPosition}
                clients={clients}
                role={role}
                warehouseCodeCuenta={(currentWarehouse?.codeCuenta ?? "").toString()}
                sessionUid={session?.uid}
                sessionRole={role}
                operariosBodega={operariosBodega}
                procesadoresBodega={procesadoresBodega}
                tareasProcesamientoOperario={tareasProcesamientoOperario}
                onPushTareaProcesamientoOperario={handlePushTareaProcesamientoOperario}
                warehouseId={warehouseId}
                onProcesamientoTerminadoInventario={handleProcesamientoTerminadoInventarioMapa}
                ordenesBodegaPendientes={orders}
                availableBodegaTargets={availableBodegaTargets}
                onCrearOrdenBodega={handleCreateOrder}
                productosCatalogo={productosCatalogoBodega}
              />
            ) : null}

            {activeTab === "configuracion" && isConfigurator ? (
              <ConfiguratorPanel
                warehouses={warehouses}
                warehousesLoading={warehousesLoading}
                warehouseSaving={warehouseSaving}
                fetchWarehouses={fetchWarehouses}
                newWarehouseName={newWarehouseName}
                setNewWarehouseName={setNewWarehouseName}
                newWarehouseCapacity={newWarehouseCapacity}
                setNewWarehouseCapacity={setNewWarehouseCapacity}
                handleCreateWarehouse={handleCreateWarehouse}
                handleUpdateWarehouse={handleUpdateWarehouse}
                toggleWarehouseDisabled={toggleWarehouseDisabled}
                newClientName={newClientName}
                setNewClientName={setNewClientName}
                newClientCode={newClientCode}
                setNewClientCode={setNewClientCode}
                clientSaving={clientSaving}
                clientsLoading={clientsLoading}
                handleCreateClient={handleCreateClient}
                fetchClients={fetchClients}
                clients={clients}
                toggleClientDisabled={toggleClientDisabled}
                handleUpdateClient={handleUpdateClient}
                fetchUsers={fetchUsers}
                users={users}
                newUserName={newUserName}
                setNewUserName={setNewUserName}
                newUserCode={newUserCode}
                setNewUserCode={setNewUserCode}
                newUserRole={newUserRole}
                setNewUserRole={setNewUserRole}
                newUserClientId={newUserClientId}
                setNewUserClientId={setNewUserClientId}
                newUserEmail={newUserEmail}
                setNewUserEmail={setNewUserEmail}
                newUserPassword={newUserPassword}
                setNewUserPassword={setNewUserPassword}
                usersLoading={usersLoading}
                userSaving={userSaving}
                handleCreateUser={handleCreateUser}
                toggleUserDisabled={toggleUserDisabled}
                handleUpdateUser={handleUpdateUser}
                menuResetNonce={configuradorMenuNonce}
              />
            ) : null}

            {activeTab === "ingresos" ? (
              <IngresosSection
                isCustodio={isCustodio}
                slots={slots}
                orders={orders}
                inboundBoxes={isCuentaUsuario ? inboundClient : inboundBoxes}
                outboundBoxes={isCuentaUsuario ? outboundClient : outboundBoxes}
                ingresoClientId={ingresoClientId}
                setIngresoClientId={setIngresoClientId}
                createReturnOrder={createReturnOrder}
                sortByPosition={sortByPosition}
                handleDispatchBox={handleDispatchBox}
                availableBodegaTargets={availableBodegaTargets}
                isCliente={isCuentaUsuario}
                clientFilterId={clientFilterId}
                clientsForCatalog={
                  isCuentaUsuario ? configuradorClients : custodioClientsCatalog
                }
                onClientChange={setClientFilterId}
                warehouseId={warehouseId}
                isBodegaInterna={!isExternalWarehouse}
                warehouseCodeCuenta={(currentWarehouse?.codeCuenta ?? "").toString()}
                onIngresoDesdeOrdenCompra={handleIngresoDesdeOrdenCompra}
                onIngresoDesdeOrdenVenta={handleIngresoDesdeOrdenVenta}
                onDespachoPaqueteOrdenVenta={handleDespachoPaqueteOrdenVenta}
              />
            ) : null}

            {activeTab === "ordenesCompraCustodio" && isCustodio ? (
              <CustodioOrdenesCompraTab warehousesFallback={warehouses} />
            ) : null}

            {activeTab === "ordenesVentaCustodio" && isCustodio ? (
              <CustodioOrdenesVentaTab warehousesFallback={warehouses} />
            ) : null}

            {(activeTab === "ordenes" || isJefe) && canUseOrderForm ? (
              <OrdenesJefeSection
                isJefe={isJefe}
                inboundBoxes={inboundBoxes}
                outboundBoxes={outboundBoxes}
                warehouseId={warehouseId}
                slots={slots}
                alertasOperario={alertasOperario}
                alertasOperarioSolved={alertasOperarioSolved}
                onUpdateAlertasOperario={setAlertasOperario}
                editTempModal={editTempModal}
                setEditTempModal={setEditTempModal}
                handleUpdateBoxTemperature={handleUpdateBoxTemperature}
                availableInboundForOrders={availableInboundForOrders}
                ingresoOrderSourcePosition={ingresoOrderSourcePosition}
                setIngresoOrderSourcePosition={setIngresoOrderSourcePosition}
                availableBodegaTargets={availableBodegaTargets}
                ingresoOrderTargetPosition={ingresoOrderTargetPosition}
                setIngresoOrderTargetPosition={setIngresoOrderTargetPosition}
                sortByPosition={sortByPosition}
                handleCreateOrder={handleCreateOrder}
                bodegaOrderSourcePosition={bodegaOrderSourcePosition}
                setBodegaOrderSourcePosition={setBodegaOrderSourcePosition}
                availableBodegaForOrders={availableBodegaForOrders}
                bodegaOrderTargetPosition={bodegaOrderTargetPosition}
                setBodegaOrderTargetPosition={setBodegaOrderTargetPosition}
                reviewSourcePosition={reviewSourcePosition}
                setReviewSourcePosition={setReviewSourcePosition}
                reviewBodegaList={reviewBodegaList}
                handleCreateReviewOrder={handleCreateReviewOrder}
                salidaSourcePosition={salidaSourcePosition}
                setSalidaSourcePosition={setSalidaSourcePosition}
                salidaTargetPosition={salidaTargetPosition}
                handleCreateOrderSalida={handleCreateOrder}
                orderModalType={orderModalType}
                setOrderModalType={setOrderModalType}
                llamadasJefe={llamadasJefe}
                onUpdateLlamadasJefe={setLlamadasJefe}
                clients={clients}
                warehouseCodeCuenta={(currentWarehouse?.codeCuenta ?? "").toString()}
                sessionUid={session?.uid}
                sessionRole={role}
                operariosBodega={operariosBodega}
                procesadoresBodega={procesadoresBodega}
                tareasProcesamientoOperario={tareasProcesamientoOperario}
                onPushTareaProcesamientoOperario={handlePushTareaProcesamientoOperario}
                onProcesamientoTerminadoInventario={handleProcesamientoTerminadoInventarioMapa}
                solicitudesProcesamientoTerminadasDisponibles={solicitudesProcesamientoTerminadasDisponibles}
                solicitudesProcesamientoTerminadasDisponiblesDesperdicio={
                  solicitudesProcesamientoTerminadasDisponiblesDesperdicio
                }
                solicitudesProcesamientoTerminadas={solicitudesProcTerminadas}
                ordenesBodegaPendientes={orders}
                renderStatusButtons={renderStatusButtons}
                productosCatalogo={productosCatalogoBodega}
              />
            ) : null}

            {activeTab === "actividades" && isAdmin ? (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="app-title">Gestion de alertas</h2>
                      <p className="mt-1 text-sm text-slate-600">Solo lectura para el administrador.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Total: {alerts.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {alerts.length === 0 ? (
                      <p className="text-sm text-slate-500">No hay alertas activas.</p>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                              {alert.reason ? (
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  No gestionada: {ALERT_REASONS.find((r) => r.value === alert.reason)?.label}
                                </p>
                              ) : null}
                            </div>
                            {canManageAlerts ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {assignedAlertIds.has(alert.id) ? (
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                    Asignada al operario
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => handleAssignAlert(alert)}
                                  disabled={assignedAlertIds.has(alert.id) || getAlertKind(alert) === "otro"}
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  Asignar a operario
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="app-title">Solicitudes pendientes</h2>
                      <p className="mt-1 text-sm text-slate-600">Vista consolidada para el administrador.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Total: {orders.length}
                    </span>
                  </div>
                  <div className="mt-4">
                    <RequestsQueue
                      warehouseId={warehouseId}
                      requests={orders}
                      canExecute={false}
                      onExecute={() => undefined}
                      onReport={() => undefined}
                      slots={slots}
                      inboundBoxes={inboundBoxes}
                      outboundBoxes={outboundBoxes}
                      alertasOperario={alertasOperario}
                      alertasOperarioSolved={alertasOperarioSolved}
                      llamadasJefe={llamadasJefe}
                      onUpdateAlertasOperario={setAlertasOperario}
                      onUpdateAlertasOperarioSolved={setAlertasOperarioSolved}
                      onUpdateLlamadasJefe={setLlamadasJefe}
                      onPersistTemperatureForAlert={handlePersistTemperatureForAlert}
                      onOperarioResolveTemperatureAlert={handleOperarioResolveTemperatureAlert}
                      tareasProcesamientoOperario={tareasProcesamientoOperario}
                      onUpdateTareasProcesamientoOperario={setTareasProcesamientoOperario}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "solicitudes" && isColaboradorBodega ? (
              <section className="grid gap-4">
                <RequestsQueue
                  warehouseId={warehouseId}
                  requests={orders}
                  canExecute={isOperario}
                  canExecuteWorkOrders={isOperario}
                  canExecuteProcesamientoTasks={isOperario || isProcesador}
                  showTemperaturaAlertasAsignadas={isOperario}
                  llamadaDesdeRol={isProcesador ? "procesador" : "operario"}
                  onExecute={executeOrder}
                  onReport={handleReportOrder}
                  slots={slots}
                  inboundBoxes={inboundBoxes}
                  outboundBoxes={outboundBoxes}
                  alertasOperario={alertasOperario}
                  alertasOperarioSolved={alertasOperarioSolved}
                  llamadasJefe={llamadasJefe}
                  onUpdateAlertasOperario={setAlertasOperario}
                  onUpdateAlertasOperarioSolved={setAlertasOperarioSolved}
                  onUpdateLlamadasJefe={setLlamadasJefe}
                  onPersistTemperatureForAlert={handlePersistTemperatureForAlert}
                  onOperarioResolveTemperatureAlert={handleOperarioResolveTemperatureAlert}
                  tareasProcesamientoOperario={tareasProcesamientoOperario}
                  onUpdateTareasProcesamientoOperario={setTareasProcesamientoOperario}
                  operarioSessionUid={session?.uid}
                  onProcesamientoEnCursoDesdeOperario={handleProcesamientoEnCursoDesdeColaOperario}
                  onProcesamientoTerminadoDesdeOperario={handleProcesamientoTerminadoDesdeColaOperario}
                  onEjecutarSalidaVentaDesdeMapa={ejecutarSalidaVentaDesdeMapa}
                />
              </section>
            ) : null}

            {activeTab === "despachados" && isAdmin ? (
              <DespachadosSection dispatchedBoxes={dispatchedBoxes} sortByPosition={sortByPosition} />
            ) : null}

            {activeTab === "alertas" && (isAdmin || isJefe) ? (
              <section className="grid gap-4">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="app-title">Gestion de alertas</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {canManageAlerts
                          ? "Revisa y asigna las alertas al operario."
                          : "Revisa las alertas activas (solo lectura)."}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Total: {alerts.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {alerts.length === 0 ? (
                      <p className="text-sm text-slate-500">No hay alertas activas.</p>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                              {alert.reason ? (
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  No gestionada: {ALERT_REASONS.find((r) => r.value === alert.reason)?.label}
                                </p>
                              ) : null}
                            </div>
                            {canManageAlerts ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {assignedAlertIds.has(alert.id) ? (
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                    Asignada al operario
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => handleAssignAlert(alert)}
                                  disabled={assignedAlertIds.has(alert.id) || getAlertKind(alert) === "otro"}
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  Asignar a operario
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "reportes" && (isAdmin || isCuentaUsuario) ? (
              <ReportesSection
                inboundBoxes={isCuentaUsuario ? inboundClient : inboundBoxes}
                outboundBoxes={isCuentaUsuario ? outboundClient : outboundBoxes}
                dispatchedBoxes={isCuentaUsuario ? dispatchedClient : dispatchedBoxes}
                slots={isCuentaUsuario ? slotsClient : slots}
                sortByPosition={sortByPosition}
                clients={clients}
                warehousesFallback={warehouses}
                isCliente={isCuentaUsuario}
                menuResetNonce={isCuentaUsuario ? reportesClienteMenuNonce : undefined}
              />
            ) : null}
        </>

        {alertsPanelOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setAlertsPanelOpen(false)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Alertas
                  </p>
                  <h3 className="app-title mt-2">Alertas activas</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {canManageAlerts
                      ? "Revisa y gestiona las alertas activas."
                      : "Revisa las alertas activas (solo lectura)."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Total: {alerts.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAlertsPanelOpen(false)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                {alerts.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay alertas activas.</p>
                ) : (
                  <div
                    key={alerts[0].id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{alerts[0].title}</p>
                        <p className="mt-1 text-sm text-slate-600">{alerts[0].description}</p>
                        {alerts[0].reason ? (
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            No gestionada: {ALERT_REASONS.find((r) => r.value === alerts[0].reason)?.label}
                          </p>
                        ) : null}
                      </div>
                      {alerts[0].id.startsWith(ALERT_REPORT_PREFIX) ? (
                        <button
                          type="button"
                          onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alerts[0].id))}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                        >
                          Solucionado
                        </button>
                      ) : canManageAlerts ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {assignedAlertIds.has(alerts[0].id) ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                              Asignada al operario
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleAssignAlert(alerts[0])}
                            disabled={assignedAlertIds.has(alerts[0].id) || getAlertKind(alerts[0]) === "otro"}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Asignar a operario
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {assignedAlertsPanelOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setAssignedAlertsPanelOpen(false)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Alertas asignadas
                  </p>
                  <h3 className="app-title mt-2">Tareas del jefe</h3>
                  <p className="mt-1 text-sm text-slate-600">Ejecuta las alertas asignadas por el jefe.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Total: {assignedAlertsForOperario.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAssignedAlertsPanelOpen(false)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                {assignedAlertsForOperario.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay alertas asignadas.</p>
                ) : (
                  assignedAlertsForOperario.map(({ assignment, alert }) => (
                    <div
                      key={assignment.alertId}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Asignada por {assignment.assignedBy} · {assignment.assignedAt}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleExecuteAssignedAlert(alert)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                          >
                            {assignment.kind === "reporte" ? "Reprogramar" : "Ejecutar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        {statusModal ? (
          <BodegaZonaEstadoModalShell
            titleId="bodega-zona-status-modal-title"
            label={statusModal.kind === "alertas" ? "Alertas" : "Tareas pendientes"}
            title={zoneLabels[statusModal.zone]}
            subtitle={
              session?.role === "jefe"
                ? statusModal.kind === "alertas"
                  ? "Temperatura alta y tareas asignadas con demora en esta zona."
                  : statusModal.zone === "entrada"
                    ? "Entradas pendientes en esta zona (sin demora)."
                    : statusModal.zone === "salida"
                      ? "Cajas en salida pendientes de orden o despacho (sin demora)."
                      : "Tareas en bodega pendientes de ejecución (sin demora)."
                : statusModal.kind === "alertas"
                  ? "Detalles de alertas activas en esta zona."
                  : statusModal.zone === "entrada"
                    ? "Órdenes y entradas pendientes en esta zona (sin demora)."
                    : statusModal.zone === "salida"
                      ? "Órdenes y cajas en salida pendientes (sin demora)."
                      : "Tareas pendientes relacionadas con esta zona."
            }
            icon={
              statusModal.kind === "alertas" ? (
                <FiAlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
              ) : (
                <FiClipboard className="h-6 w-6 shrink-0" aria-hidden />
              )
            }
            onClose={() => setStatusModal(null)}
            zClass="z-50"
          >
            {(statusModal.kind === "alertas"
              ? zoneAlertItems[statusModal.zone]
              : zoneTaskItems[statusModal.zone]
            ).length === 0 ? (
              <div className="-mx-5 border-y border-slate-100 py-12 text-center sm:-mx-6">
                <p className="px-2 text-base leading-relaxed text-slate-600">
                  No hay <strong className="font-semibold text-slate-800">elementos</strong> para mostrar en esta zona.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {(statusModal.kind === "alertas"
                  ? zoneAlertItems[statusModal.zone]
                  : zoneTaskItems[statusModal.zone]
                ).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-sky-100 bg-linear-to-br from-white to-sky-50/40 p-4 shadow-sm"
                  >
                    <p className="font-semibold leading-snug text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
                    {item.meta ? <p className="mt-2 text-xs font-semibold text-slate-500">{item.meta}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </BodegaZonaEstadoModalShell>
        ) : null}

        {resolveModalAlert ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setResolveModalAlert(null)}
          >
            <div
              className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Solucionar alerta
                  </p>
                  <h3 className="app-title mt-2">{resolveModalAlert.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{resolveModalAlert.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setResolveModalAlert(null)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                {isTemperatureAlert(resolveModalAlert.id) ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Caja con temperatura alta</label>
                      <select
                        value={`${tempFixZone}:${tempFixPosition}`}
                        onChange={(event) => {
                          const [zone, position] = event.target.value.split(":");
                          setTempFixZone(zone as OrderSource);
                          setTempFixPosition(Number(position));
                        }}
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        {tempFixOptions.length === 0 ? (
                          <option value="ingresos:1">Sin cajas</option>
                        ) : (
                          tempFixOptions.map((option) => (
                            <option key={`${option.zone}-${option.position}`} value={`${option.zone}:${option.position}`}>
                              {option.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Nueva temperatura (°C)</label>
                      <input
                        value={tempFixValue}
                        onChange={(event) => setTempFixValue(event.target.value)}
                        type="number"
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Ej: -5"
                      />
                    </div>
                  </>
                ) : null}

                {resolveModalAlert.id.startsWith(ALERT_ORDER_PREFIX) ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Reprograma la tarea para reiniciar el tiempo de respuesta.
                  </div>
                ) : null}

                {resolveModalAlert.id.startsWith(ALERT_REPORT_PREFIX) ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Reprograma la tarea reportada.
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolveModalAlert(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResolveWithSolution}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Aplicar solucion
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <MessageBanner message={message} />
      </main>
    </div>
  );
}