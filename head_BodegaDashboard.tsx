"use client";
/* eslint-disable react-hooks/purity */
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import React from "react";
import { useBodegaHistory } from "./app/components/BodegaDashboard/BodegaHistoryContext";
import EstadoBodegaSection from "./app/components/BodegaDashboard/EstadoBodegaSection";
import IngresosSection from "./app/components/BodegaDashboard/IngresosSection";
import OrdenesJefeSection from "./app/components/BodegaDashboard/OrdenesJefeSection";
import DespachadosSection from "./app/components/BodegaDashboard/DespachadosSection";
import ReportesSection from "./app/components/BodegaDashboard/ReportesSection";
import { AiTwotoneAppstore } from "react-icons/ai";
import { SlGraph } from "react-icons/sl";




import { FiArchive, FiBox, FiRepeat, FiSearch } from "react-icons/fi";
const noop = () => {};

// --- USUARIOS Y SESION ---
type UserAccount = {
  username: string;
  password: string;
  role: Role;
  displayName: string;
  clientId?: string;
};

type Session = {
  username: string;
  role: Role;
  displayName: string;
  clientId?: string;
};

const USERS: UserAccount[] = [
  {
    username: "custodio",
    password: "custodio123",
    role: "custodio",
    displayName: "Custodio",
  },
  {
    username: "administrador",
    password: "admin123",
    role: "administrador",
    displayName: "Administrador",
  },
  {
    username: "jefe",
    password: "jefe123",
    role: "jefe",
    displayName: "Jefe",
  },
  {
    username: "operario",
    password: "operario123",
    role: "operario",
    displayName: "Operario",
  },
  {
    username: "cliente",
    password: "cliente123",
    role: "cliente",
    displayName: "Cliente",
    clientId: "cliente1",
  },
];

import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiClipboard } from "react-icons/fi";
import Header from "./app/components/bodega/Header";
import MessageBanner from "./app/components/bodega/MessageBanner";
import SlotsGrid from "./app/components/bodega/SlotsGrid";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  BodegaOrder,
  Box,
  OrderSource,
  OrderType,
  Role,
  Slot,
} from "./app/interfaces/bodega";
import SelectedSlotCard from "./app/components/bodega/SelectedSlotCard";
import WarehouseSelector from "./app/components/bodega/WarehouseSelector";
import RequestsQueue from "./app/components/bodega/RequestsQueue";
import LoginCard from "./app/components/bodega/LoginCard";

const TOTAL_SLOTS = 12;
const SLOTS_STORAGE_KEY = "bodegaSlotsV1";
const ROLE_STORAGE_KEY = "bodegaRoleV1";
const INBOUND_STORAGE_KEY = "bodegaIngresosV1";
const OUTBOUND_STORAGE_KEY = "bodegaSalidasV1";
const DISPATCHED_STORAGE_KEY = "bodegaDespachosV1";
const ORDERS_STORAGE_KEY = "bodegaOrdenesV1";
const WAREHOUSE_ID_KEY = "bodegaWarehouseIdV1";
const WAREHOUSE_NAME_KEY = "bodegaWarehouseNameV1";
const AUTO_COUNTER_KEY = "bodegaAutoCounterV1";
const STATS_STORAGE_KEY = "bodegaStatsV1";

type BodegaStats = {
  ingresos: number;
  salidas: number;
  movimientosBodega: number;
};

type AlertReason = "no_tuve_tiempo" | "no_quise" | "no_pude";

type AlertItem = {
  id: string;
  title: string;
  description: string;
  reason?: AlertReason;
  sourceOrderId?: string;
  meta?: string;
};

type AlertAssignment = {
  alertId: string;
  kind: "temperatura" | "reporte";
  assignedAt: string;
  assignedBy: string;
  sourceOrderId?: string;
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

const createInitialSlots = (): Slot[] =>
  Array.from({ length: TOTAL_SLOTS }, (_, index) => ({
    position: index + 1,
    autoId: "",
    name: "",
    temperature: null,
    client: "",
  }));

const padNumber = (value: number, length: number) =>
  String(value).padStart(length, "0");

const getDateStamp = (date: Date) =>
  `${date.getFullYear()}${padNumber(date.getMonth() + 1, 2)}${padNumber(
    date.getDate(),
    2,
  )}`;

const createAutoId = (prefix: string) => {
  const dateStamp = getDateStamp(new Date());
  if (typeof localStorage === "undefined") {
    return `${prefix}-${dateStamp}-${padNumber(Math.floor(Math.random() * 999), 3)}`;
  }

  const counterKey = `${AUTO_COUNTER_KEY}:${prefix}:${dateStamp}`;
  const current = Number(localStorage.getItem(counterKey) ?? "0");
  const next = current + 1;
  localStorage.setItem(counterKey, String(next));
  return `${prefix}-${dateStamp}-${padNumber(next, 3)}`;
};

const normalizeSlots = (value: unknown): Slot[] | null => {
  if (!Array.isArray(value) || value.length !== TOTAL_SLOTS) {
    return null;
  }

  const slots: Slot[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const record = item as Record<string, unknown>;
    const position = record.position;
    const autoId = record.autoId;
    const name = record.name;
    const temperature = record.temperature;
    const client = record.client;
    if (typeof position !== "number") {
      return null;
    }

    const legacyName = typeof record.itemId === "string" ? record.itemId : "";
    const normalizedName = typeof name === "string" ? name : (legacyName ?? "");
    const normalizedAutoId =
      typeof autoId === "string"
        ? autoId
        : normalizedName
          ? createAutoId("BOX")
          : "";
    const normalizedTemp =
      typeof temperature === "number" || temperature === null
        ? temperature
        : null;
    const normalizedClient =
      typeof client === "string"
        ? client
        : typeof record.customer === "string"
          ? record.customer
          : "";

    slots.push({
      position,
      autoId: normalizedAutoId,
      name: normalizedName,
      temperature: normalizedTemp,
      client: normalizedClient,
    });
  }

  return slots;
};

const isValidRole = (value: unknown): value is Role =>
  value === "custodio" ||
  value === "administrador" ||
  value === "operario" ||
  value === "jefe" ||
  value === "cliente";

const normalizeBoxes = (value: unknown): Box[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const boxes: Box[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const record = item as Record<string, unknown>;
    const position = record.position;
    const temperature = record.temperature;
    const client = record.client;
    if (typeof position !== "number" || typeof temperature !== "number") {
      return null;
    }

    const legacyName = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name : legacyName;
    const autoId =
      typeof record.autoId === "string"
        ? record.autoId
        : name
          ? createAutoId("BOX")
          : "";

    boxes.push({
      position,
      autoId,
      name: name ?? "",
      temperature,
      client:
        typeof client === "string"
          ? client
          : typeof record.customer === "string"
            ? record.customer
            : "cliente1",
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
      return null;
    }

    const record = item as Record<string, unknown>;
    const id = record.id;
    const type = record.type;
    const createdAt = record.createdAt;
    const createdBy = record.createdBy;
    const createdAtMs = record.createdAtMs;
    if (
      typeof id !== "string" ||
      (type !== "a_bodega" && type !== "a_salida" && type !== "revisar") ||
      typeof createdAt !== "string" ||
      typeof createdBy !== "string"
    ) {
      return null;
    }

    const sourceZone: OrderSource =
      record.sourceZone === "bodega"
        ? "bodega"
        : record.sourceZone === "salida"
          ? "salida"
          : "ingresos";
    const sourcePosition =
      typeof record.sourcePosition === "number"
        ? record.sourcePosition
        : typeof record.boxPosition === "number"
          ? record.boxPosition
          : null;
    if (sourcePosition === null) {
      return null;
    }

    const targetPosition =
      typeof record.targetPosition === "number"
        ? record.targetPosition
        : undefined;

    const normalizedCreatedAtMs =
      typeof createdAtMs === "number" && Number.isFinite(createdAtMs)
        ? createdAtMs
        : Date.now();

    orders.push({
      id,
      type,
      sourcePosition,
      sourceZone,
      targetPosition,
      createdAt,
      createdAtMs: normalizedCreatedAtMs,
      createdBy: isValidRole(createdBy) ? (createdBy as Role) : "custodio",
    });
  }

  return orders;
};

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

const getNextIngresoPosition = (boxes: Box[]) => {
  const occupied = new Set(boxes.map((box) => box.position));
  let next = 1;
  while (occupied.has(next)) {
    next += 1;
  }
  return next;
};

const getNextSalidaPosition = (boxes: Box[], reserved?: Set<number>) => {
  const occupied = new Set(boxes.map((box) => box.position));
  if (reserved) {
    reserved.forEach((position) => occupied.add(position));
  }
  let next = 1;
  while (occupied.has(next)) {
    next += 1;
  }
  return next;
};

export default function BodegaDashboard() {
  // ...existing code...
  const [selectedBoxModal, setSelectedBoxModal] = useState<Box | Slot | null>(
    null,
  );
  const [selectedOutboundIdx, setSelectedOutboundIdx] = React.useState(0);
  // State for editing temperature modal
  const [editTempModal, setEditTempModal] = useState<{
    position: number;
    autoId: string;
    name: string;
    temperature: number | null;
  } | null>(null);
  // ...existing code...
  // Modal state for jefe action cards
  const [orderModalType, setOrderModalType] = React.useState<string | null>(
    null,
  );
  // ...otros hooks y lógica...
  // Estado para modal de detalle de reportes (debe ir aquí, después de otros hooks)
  const [reportDetailModal, setReportDetailModal] = useState<null | {
    type: "ingresos" | "salidas" | "movimientos" | "despachados" | "alertas";
  }>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "estado"
    | "ingresos"
    | "salida"
    | "ordenes"
    | "solicitudes"
    | "despachados"
    | "actividades"
    | "alertas"
    | "reportes"
  >("estado");

  // Define handleLogout function
  const handleLogout = () => {
    setSession(null);
    setLoginUser("");
    setLoginPassword("");
    setLoginError("");
  };
  // Define handleLogin function after useState declarations so it can access loginUser and loginPassword
  const handleLogin = () => {
    const user = USERS.find(
      (u) => u.username === loginUser && u.password === loginPassword,
    );
    if (!user) {
      setLoginError("Usuario o contraseña incorrectos.");
      return;
    }
    const newSession: Session = {
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      clientId: user.clientId,
    };
    setSession(newSession);
    setLoginError("");
    setLoginUser("");
    setLoginPassword("");
  };

  const [loginUser, setLoginUser] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  const [slots, setSlots] = useState<Slot[]>(() => createInitialSlots());
  const [message, setMessage] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [warehouseName, setWarehouseName] = useState<string>("");
  const [inboundBoxes, setInboundBoxes] = useState<Box[]>([]);
  const [outboundBoxes, setOutboundBoxes] = useState<Box[]>([]);
  const [dispatchedBoxes, setDispatchedBoxes] = useState<Box[]>([]);
  const [orders, setOrders] = useState<BodegaOrder[]>([]);
  const [stats, setStats] = useState<BodegaStats>(defaultStats);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [assignedAlerts, setAssignedAlerts] = useState<AlertAssignment[]>([]);
  const [alertClock, setAlertClock] = useState(() => Date.now());
  const [statusModal, setStatusModal] = useState<{
    zone: ZoneKey;
    kind: ModalKind;
  } | null>(null);
  const [resolveModalAlert, setResolveModalAlert] = useState<AlertItem | null>(
    null,
  );
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [assignedAlertsPanelOpen, setAssignedAlertsPanelOpen] = useState(false);
  const [tempFixZone, setTempFixZone] = useState<OrderSource>("ingresos");
  const [tempFixPosition, setTempFixPosition] = useState<number>(1);
  const [tempFixValue, setTempFixValue] = useState<string>("");

  const [ingresoPosition, setIngresoPosition] = useState<number>(1);
  const [ingresoName, setIngresoName] = useState<string>("");
  const [ingresoTemp, setIngresoTemp] = useState<string>("");
  const [ingresoClient, setIngresoClient] = useState<string>("cliente1");
  const [clientFilterId, setClientFilterId] = useState<string>("cliente1");

  const [bodegaOrderSourcePosition, setBodegaOrderSourcePosition] =
    useState<number>(1);
  const [bodegaOrderTargetPosition, setBodegaOrderTargetPosition] =
    useState<number>(1);
  const [ingresoOrderSourcePosition, setIngresoOrderSourcePosition] =
    useState<number>(1);
  const [ingresoOrderTargetPosition, setIngresoOrderTargetPosition] =
    useState<number>(1);
  const [salidaSourcePosition, setSalidaSourcePosition] = useState<number>(1);
  const [salidaTargetPosition, setSalidaTargetPosition] = useState<number>(1);
  const [reviewSourceZone, setReviewSourceZone] =
    useState<OrderSource>("ingresos");
  const [reviewSourcePosition, setReviewSourcePosition] = useState<number>(1);

  const [searchId, setSearchId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Persist session in localStorage after restore
  useEffect(() => {
    if (!hasRestoredSession) {
      return;
    }
    try {
      if (session) {
        localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(ROLE_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [session]);

  useEffect(() => {
    setIsHydrated(true);
    setDateLabel(new Date().toLocaleDateString("es-CO"));

    try {
      const storedSession = localStorage.getItem(ROLE_STORAGE_KEY);
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        if (
          typeof parsedSession === "object" &&
          parsedSession !== null &&
          typeof parsedSession.username === "string" &&
          typeof parsedSession.role === "string" &&
          typeof parsedSession.displayName === "string"
        ) {
          setSession(parsedSession as Session);
        }
      }
    } catch {
      // ignore storage errors
    }
    setHasRestoredSession(true);

    try {
      const stored = localStorage.getItem(SLOTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        const normalized = normalizeSlots(parsed);
        if (normalized) {
          setSlots(normalized);
        }
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      if (storedRole) {
        const parsedRole = JSON.parse(storedRole) as unknown;
        if (isValidRole(parsedRole)) {
          // setRole removed, session logic should be used
        }
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const storedInbound = localStorage.getItem(INBOUND_STORAGE_KEY);
      if (storedInbound) {
        const parsedInbound = JSON.parse(storedInbound) as unknown;
        const normalized = normalizeBoxes(parsedInbound);
        if (normalized) {
          setInboundBoxes(normalized);
        }
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const storedOutbound = localStorage.getItem(OUTBOUND_STORAGE_KEY);
      if (storedOutbound) {
        const parsedOutbound = JSON.parse(storedOutbound) as unknown;
        const normalized = normalizeBoxes(parsedOutbound);
        if (normalized) {
          setOutboundBoxes(normalized);
        }
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const storedDispatched = localStorage.getItem(DISPATCHED_STORAGE_KEY);
      if (storedDispatched) {
        const parsedDispatched = JSON.parse(storedDispatched) as unknown;
        const normalized = normalizeBoxes(parsedDispatched);
        if (normalized) {
          setDispatchedBoxes(normalized);
        }
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (storedOrders) {
        const parsedOrders = JSON.parse(storedOrders) as unknown;
        const normalized = normalizeOrders(parsedOrders);
        if (normalized) {
          setOrders(normalized);
        }
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const storedStats = localStorage.getItem(STATS_STORAGE_KEY);
      if (storedStats) {
        const parsedStats = JSON.parse(storedStats) as Partial<BodegaStats>;
        setStats({
          ingresos: Number(parsedStats.ingresos ?? 0),
          salidas: Number(parsedStats.salidas ?? 0),
          movimientosBodega: Number(parsedStats.movimientosBodega ?? 0),
        });
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const storedWarehouseId = localStorage.getItem(WAREHOUSE_ID_KEY);
      if (storedWarehouseId) {
        setWarehouseId(storedWarehouseId);
      } else {
        const newId = createAutoId("BOD");
        setWarehouseId(newId);
        localStorage.setItem(WAREHOUSE_ID_KEY, newId);
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const storedWarehouseName = localStorage.getItem(WAREHOUSE_NAME_KEY);
      if (storedWarehouseName) {
        setWarehouseName(storedWarehouseName);
      }
    } catch {
      // ignore invalid storage
    }
  }, []);

  // Sync state across tabs (same browser) when localStorage changes
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      try {
        if (event.key === SLOTS_STORAGE_KEY) {
          const normalized = normalizeSlots(
            event.newValue ? JSON.parse(event.newValue) : [],
          );
          if (normalized) {
            setSlots(normalized);
          }
        }
        if (event.key === INBOUND_STORAGE_KEY) {
          const normalized = normalizeBoxes(
            event.newValue ? JSON.parse(event.newValue) : [],
          );
          if (normalized) {
            setInboundBoxes(normalized);
          }
        }
        if (event.key === OUTBOUND_STORAGE_KEY) {
          const normalized = normalizeBoxes(
            event.newValue ? JSON.parse(event.newValue) : [],
          );
          if (normalized) {
            setOutboundBoxes(normalized);
          }
        }
        if (event.key === DISPATCHED_STORAGE_KEY) {
          const normalized = normalizeBoxes(
            event.newValue ? JSON.parse(event.newValue) : [],
          );
          if (normalized) {
            setDispatchedBoxes(normalized);
          }
        }
        if (event.key === ORDERS_STORAGE_KEY) {
          const normalized = normalizeOrders(
            event.newValue ? JSON.parse(event.newValue) : [],
          );
          if (normalized) {
            setOrders(normalized);
          }
        }
        if (event.key === WAREHOUSE_ID_KEY) {
          if (typeof event.newValue === "string") {
            setWarehouseId(event.newValue);
          }
        }
        if (event.key === WAREHOUSE_NAME_KEY) {
          if (typeof event.newValue === "string") {
            setWarehouseName(event.newValue);
          }
        }
      } catch {
        // ignore invalid storage events
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(slots));
    } catch {
      // ignore storage errors
    }
  }, [slots]);

  // Eliminado: persistencia de role, ahora se usa session

  useEffect(() => {
    try {
      localStorage.setItem(INBOUND_STORAGE_KEY, JSON.stringify(inboundBoxes));
    } catch {
      // ignore storage errors
    }
  }, [inboundBoxes]);

  useEffect(() => {
    setIngresoPosition(getNextIngresoPosition(inboundBoxes));
  }, [inboundBoxes]);

  useEffect(() => {
    try {
      localStorage.setItem(OUTBOUND_STORAGE_KEY, JSON.stringify(outboundBoxes));
    } catch {
      // ignore storage errors
    }
  }, [outboundBoxes]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DISPATCHED_STORAGE_KEY,
        JSON.stringify(dispatchedBoxes),
      );
    } catch {
      // ignore storage errors
    }
  }, [dispatchedBoxes]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // ignore storage errors
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // ignore storage errors
    }
  }, [stats]);

  useEffect(() => {
    try {
      if (warehouseName.trim()) {
        localStorage.setItem(WAREHOUSE_NAME_KEY, warehouseName.trim());
      }
    } catch {
      // ignore storage errors
    }
  }, [warehouseName]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setAlertClock(Date.now());
    }, 30000);
    return () => window.clearInterval(timerId);
  }, []);

  const occupiedCount = useMemo(
    () => slots.filter((slot) => slot.autoId.trim() !== "").length,
    [slots],
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.position === selectedPosition) ?? null,
    [slots, selectedPosition],
  );

  const freeSlots = useMemo(
    () =>
      slots.filter((slot) => !slot.autoId.trim()).map((slot) => slot.position),
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
      keys.add(`${order.sourceZone}:${order.sourcePosition}`);
    });
    return keys;
  }, [orders]);

  const availableInboundForOrders = useMemo(
    () =>
      inboundBoxes.filter(
        (box) => !pendingSourceKeys.has(`ingresos:${box.position}`),
      ),
    [inboundBoxes, pendingSourceKeys],
  );

  const availableBodegaForOrders = useMemo(
    () =>
      bodegaBoxes.filter(
        (box) => !pendingSourceKeys.has(`bodega:${box.position}`),
      ),
    [bodegaBoxes, pendingSourceKeys],
  );

  const reviewBodegaList = useMemo(
    () => availableBodegaForOrders,
    [availableBodegaForOrders],
  );

  const availableOutboundForReview = useMemo(
    () =>
      outboundBoxes.filter(
        (box) => !pendingSourceKeys.has(`salida:${box.position}`),
      ),
    [outboundBoxes, pendingSourceKeys],
  );

  const {
    ingresos: historyIngresos,
    salidas: historySalidas,
    movimientosBodega: historyMovimientos,
    alertas,
    addIngreso,
    addSalida,
    addMovimientoBodega,
    addAlerta,
  } = useBodegaHistory();


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
          : "Ingreso";
    if (order.type === "revisar") {
      return `Revisar ${sourceLabel} ${order.sourcePosition}`;
    }
    if (order.type === "a_bodega") {
      return `${sourceLabel} ${order.sourcePosition} · Destino bodega ${target}`;
    }
    return `${sourceLabel} ${order.sourcePosition} · Destino salida ${target}`;
  };

  const inboundHighBoxes = useMemo(
    () => inboundBoxes.filter((box) => box.temperature > 5),
    [inboundBoxes],
  );
  const outboundHighBoxes = useMemo(
    () => outboundBoxes.filter((box) => box.temperature > 5),
    [outboundBoxes],
  );
  // Filtrar slots de bodega con temperatura alta, excluyendo solucionadas por operario
  const bodegaHighSlots = React.useMemo(() => {
    let solvedPositions: number[] = [];
    if (typeof window !== 'undefined') {
      try {
        const solved = window.localStorage.getItem('alertas_operario_solved');
        solvedPositions = solved ? JSON.parse(solved) : [];
      } catch { solvedPositions = []; }
    }
    return slots.filter(
      (slot) => typeof slot.temperature === "number" && slot.temperature > 5 && !solvedPositions.includes(slot.position)
    );
  }, [slots]);

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
  const nextAlert = alerts[0] ?? null;
  const overdueOrders = useMemo(
    () =>
      orders.filter(
        (order) => alertClock - order.createdAtMs >= ALERT_DELAY_MS,
      ),
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
  }, [bodegaHighSlots, inboundHighBoxes, outboundHighBoxes, overdueOrders]);

  const zoneTaskItems = useMemo(() => {
    const byZone: Record<ZoneKey, DetailItem[]> = {
      entrada: [],
      bodega: [],
      salida: [],
    };

    orders.forEach((order) => {
      const zone: ZoneKey =
        order.sourceZone === "ingresos"
          ? "entrada"
          : order.sourceZone === "salida"
            ? "salida"
            : "bodega";

      byZone[zone].push({
        id: `tarea-${zone}-${order.id}`,
        title: "Tarea pendiente",
        description: formatOrderDetails(order),
        meta: `Solicitado por ${order.createdBy} · ${order.createdAt}`,
      });
    });

    return byZone;
  }, [orders]);

  const renderStatusButtons = (zone: ZoneKey) => {
    const alertCount = zoneAlertItems[zone].length;
    const taskCount = zoneTaskItems[zone].length;

    if (alertCount === 0 && taskCount === 0) {
      return null;
    }

    return (
      <div className="flex items-center gap-2">
        {alertCount > 0 ? (
          <button
            type="button"
            onClick={() => setStatusModal({ zone, kind: "alertas" })}
            className="flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500"
            aria-label={`Ver alertas en ${zoneLabels[zone]}`}
          >
            <FiAlertTriangle className="h-4 w-4" />
            {alertCount}
          </button>
        ) : null}
        {taskCount > 0 ? (
          <button
            type="button"
            onClick={() => setStatusModal({ zone, kind: "tareas" })}
            className="flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-200"
            aria-label={`Ver tareas en ${zoneLabels[zone]}`}
          >
            <FiClipboard className="h-4 w-4" />
            {taskCount}
          </button>
        ) : null}
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

    const overdueOrders = orders.filter(
      (order) => alertClock - order.createdAtMs >= ALERT_DELAY_MS,
    );

    const next: AlertItem[] = [...tempAlerts];

    for (const order of overdueOrders) {
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
      }));

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
    if (
      !availableBodegaForOrders.some(
        (box) => box.position === bodegaOrderSourcePosition,
      )
    ) {
      setBodegaOrderSourcePosition(availableBodegaForOrders[0].position);
    }
  }, [availableBodegaForOrders, bodegaOrderSourcePosition]);

  useEffect(() => {
    if (availableInboundForOrders.length === 0) {
      setIngresoOrderSourcePosition(1);
      return;
    }
    if (
      !availableInboundForOrders.some(
        (box) => box.position === ingresoOrderSourcePosition,
      )
    ) {
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
    setSalidaTargetPosition(
      getNextSalidaPosition(outboundBoxes, reservedSalidaTargets),
    );
  }, [outboundBoxes, reservedSalidaTargets]);

  useEffect(() => {
    if (availableBodegaForOrders.length === 0) {
      setSalidaSourcePosition(1);
      return;
    }
    if (
      !availableBodegaForOrders.some(
        (box) => box.position === salidaSourcePosition,
      )
    ) {
      setSalidaSourcePosition(availableBodegaForOrders[0].position);
    }
  }, [availableBodegaForOrders, salidaSourcePosition]);

  // role ahora se deriva de session
  useEffect(() => {
    if (session?.clientId) {
      setClientFilterId(session.clientId);
    }
  }, [session?.clientId]);

  const role = session?.role ?? "custodio";
  const isAdmin = role === "administrador";
  const isOperario = role === "operario";
  const isCustodio = role === "custodio";
  const isJefe = role === "jefe";
  const isCliente = role === "cliente";
  const clientId = session?.clientId ?? null;
  const effectiveClientId = isCliente ? clientFilterId || clientId || "cliente1" : clientId;
  const canManageAlerts = isJefe;

  const canSeeBodega = isAdmin || isOperario;
  const canUseIngresoForm = isCustodio;
  const canUseOrderForm = isJefe;
  const canSeeOrders = isAdmin || isOperario;
  const canUseSearch = isAdmin;

  const filterByClient = <T extends { client?: string }>(items: T[]) =>
    isCliente && effectiveClientId
      ? items.filter((item) => item.client === effectiveClientId)
      : items;

  const orderMatchesClientLoose = (order: BodegaOrder) => {
    if (!isCliente || !effectiveClientId) return true;
    if (order.client) return order.client === effectiveClientId;
    const findByZone = (zone: OrderSource, position: number) => {
      if (zone === "ingresos") return inboundBoxes.find((b) => b.position === position);
      if (zone === "salida") return outboundBoxes.find((b) => b.position === position);
      return slots.find((s) => s.position === position);
    };
    const source = findByZone(order.sourceZone, order.sourcePosition);
    if (source?.client === effectiveClientId) return true;
    if (order.targetPosition) {
      const targetSlot = slots.find((s) => s.position === order.targetPosition);
      if (targetSlot?.client === effectiveClientId) return true;
      const targetOut = outboundBoxes.find((b) => b.position === order.targetPosition);
      if (targetOut?.client === effectiveClientId) return true;
    }
    return false;
  };

  const inboundClient = filterByClient(inboundBoxes);
  const outboundClient = filterByClient(outboundBoxes);
  const dispatchedClient = filterByClient(dispatchedBoxes);
  const slotsClient = filterByClient(slots);

  const ordersClient = isCliente ? orders.filter(orderMatchesClientLoose) : orders;

  const historyIngresosClient = isCliente ? filterByClient(historyIngresos) : historyIngresos;
  const historySalidasClient = isCliente
    ? historySalidas.filter(orderMatchesClientLoose)
    : historySalidas;
  const historyMovimientosClient = isCliente
    ? historyMovimientos.filter(orderMatchesClientLoose)
    : historyMovimientos;

  const clientAutoIds = useMemo(() => {
    if (!isCliente || !effectiveClientId) return new Set<string>();
    const ids = new Set<string>();
    [inboundClient, outboundClient, slotsClient, dispatchedClient].forEach(
      (list) => {
        list.forEach((item) => {
          if (item.autoId) ids.add(item.autoId);
        });
      },
    );
    return ids;
  }, [dispatchedClient, effectiveClientId, inboundClient, isCliente, outboundClient, slotsClient]);

  const filteredAlertItems = useMemo(() => {
    if (!isCliente || !effectiveClientId) return computedAlerts.nextAlerts;
    if (clientAutoIds.size === 0) return [];
    return computedAlerts.nextAlerts.filter((alert) => {
      const haystack = `${alert.id} ${alert.description ?? ""} ${alert.meta ?? ""}`;
      for (const id of clientAutoIds) {
        if (haystack.includes(id)) return true;
      }
      return false;
    });
  }, [clientAutoIds, computedAlerts.nextAlerts, effectiveClientId, isCliente]);

  const ingresosCount = isCliente ? historyIngresosClient.length : stats.ingresos;
  const salidasCount = isCliente ? historySalidasClient.length : stats.salidas;
  const movimientosCount = isCliente
    ? historyMovimientosClient.filter((order) => order.type === "a_bodega").length
    : stats.movimientosBodega;
  const despachadosCount = isCliente ? dispatchedClient.length : dispatchedBoxes.length;
  const alertasCount = isCliente ? filteredAlertItems.length : alertas.length;

  const reportData = useMemo(
    () => [
      { name: "Ingresos", value: ingresosCount, fill: "#38bdf8" },
      { name: "Salidas", value: salidasCount, fill: "#f97316" },
      {
        name: "Movimientos a bodega",
        value: movimientosCount,
        fill: "#22c55e",
      },
      {
        name: "Despachados",
        value: despachadosCount,
        fill: "#0ea5e9",
      },
      {
        name: "Alertas",
        value: alertasCount,
        fill: "#ef4444",
      },
    ],
    [
      alertasCount,
      despachadosCount,
      ingresosCount,
      movimientosCount,
      salidasCount,
    ],
  );

  const handleSelectSlot = (position: number) => {
    setSelectedPosition(position);
  };

  const handleIngreso = () => {
    if (role !== "custodio") {
      setMessage("Solo el custodio registra ingresos.");
      return;
    }

    if (!ingresoName.trim()) {
      setMessage("Ingresa un nombre valido.");
      return;
    }

    const parsedTemp = Number(ingresoTemp);
    if (Number.isNaN(parsedTemp)) {
      setMessage("Ingresa una temperatura valida.");
      return;
    }

    const nextPosition = getNextIngresoPosition(inboundBoxes);

    const newBox: Box = {
      position: nextPosition,
      autoId: createAutoId("CAJ"),
      name: ingresoName.trim(),
      temperature: parsedTemp,
      client: ingresoClient,
    };

    setInboundBoxes((prev) => sortByPosition([newBox, ...prev]));
    setStats((prev) => ({ ...prev, ingresos: prev.ingresos + 1 }));
    addIngreso(newBox);
    setIngresoName("");
    setIngresoTemp("");
    setIngresoClient("cliente1");
    setMessage(`Caja registrada en ingresos ${nextPosition}.`);
  };

  const handleCreateOrder = (params: {
    destination: OrderType;
    sourceZone: OrderSource;
    sourcePosition: number;
    targetPosition?: number;
  }) => {
    const { destination, sourceZone, sourcePosition, targetPosition } = params;
    const effectiveSourceZone =
      destination === "a_salida" ? "bodega" : sourceZone;
    const effectiveSourcePosition = sourcePosition;

    if (role !== "jefe") {
      setMessage("Solo el jefe crea ordenes.");
      return;
    }
    const sourceList =
      effectiveSourceZone === "bodega"
        ? availableBodegaForOrders
        : availableInboundForOrders;
    if (sourceList.length === 0) {
      setMessage("No hay cajas disponibles sin tareas asignadas.");
      return;
    }

    const box = sourceList.find(
      (item) => item.position === effectiveSourcePosition,
    );
    if (!box) {
      setMessage("Selecciona una caja valida.");
      return;
    }

    if (destination === "a_bodega") {
      if (!targetPosition || !availableBodegaTargets.includes(targetPosition)) {
        setMessage("Selecciona una posicion libre en bodega.");
        return;
      }
    } else {
      const salidaPosition = getNextSalidaPosition(
        outboundBoxes,
        reservedSalidaTargets,
      );
      if (salidaPosition <= 0) {
        setMessage("Ingresa una posicion de salida valida.");
        return;
      }
    }

    const finalTargetPosition =
      destination === "a_salida"
        ? getNextSalidaPosition(outboundBoxes, reservedSalidaTargets)
        : targetPosition;

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
    if (newOrder.type === "a_salida" && newOrder.sourceZone === "bodega") {
      addSalida(newOrder);
    }
    if (newOrder.type === "a_bodega") {
      addMovimientoBodega(newOrder);
    }
    setMessage("Orden creada correctamente.");
    if (role === "jefe") {
      setBodegaOrderSourcePosition(availableBodegaForOrders[0]?.position ?? 1);
      setIngresoOrderSourcePosition(
        availableInboundForOrders[0]?.position ?? 1,
      );
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

    const box = reviewList.find(
      (item) => item.position === reviewSourcePosition,
    );
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

  const executeOrder = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      return;
    }

    if (role !== "operario") {
      setMessage("Solo el operario ejecuta ordenes.");
      return;
    }

    const sourceIsBodega = order.sourceZone === "bodega";
    const boxFromIngreso = inboundBoxes.find(
      (item) => item.position === order.sourcePosition,
    );
    const boxFromBodega = slots.find(
      (item) => item.position === order.sourcePosition,
    );
    const boxFromSalida = outboundBoxes.find(
      (item) => item.position === order.sourcePosition,
    );

    if (order.type === "revisar") {
      const existsInIngreso = inboundBoxes.some(
        (item) => item.position === order.sourcePosition,
      );
      const existsInBodega = slots.some(
        (item) => item.position === order.sourcePosition && item.autoId.trim(),
      );
      const existsInSalida = outboundBoxes.some(
        (item) => item.position === order.sourcePosition,
      );
      if (
        (order.sourceZone === "ingresos" && !existsInIngreso) ||
        (order.sourceZone === "bodega" && !existsInBodega) ||
        (order.sourceZone === "salida" && !existsInSalida)
      ) {
        setMessage("La caja ya no esta disponible para revision.");
        return;
      }
      setOrders((prev) => prev.filter((item) => item.id !== orderId));
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

      const boxAutoId = sourceBox?.autoId ?? "";
      const boxName = sourceBox?.name ?? "";
      const boxTemp = sourceBox?.temperature ?? 0;
      const boxClient = sourceBox?.client ?? "";
      setSlots((prev) =>
        prev.map((item) =>
          item.position === target
            ? {
                ...item,
                autoId: boxAutoId,
                name: boxName,
                temperature: boxTemp,
                client: boxClient,
              }
            : item,
        ),
      );
      setStats((prev) => ({
        ...prev,
        movimientosBodega: prev.movimientosBodega + 1,
      }));
    } else {
      const target = order.targetPosition;
      if (!target || target <= 0) {
        setMessage("La posicion de salida no es valida.");
        return;
      }
      if (outboundBoxes.some((item) => item.position === target)) {
        setMessage("La posicion de salida ya esta ocupada.");
        return;
      }
      if (!sourceIsBodega && !boxFromIngreso) {
        setMessage("La caja ya no esta en ingresos.");
        return;
      }
      if (sourceIsBodega && (!boxFromBodega || !boxFromBodega.autoId.trim())) {
        setMessage("La caja ya no esta en bodega.");
        return;
      }

      const boxAutoId = sourceIsBodega
        ? (boxFromBodega?.autoId ?? "")
        : (boxFromIngreso?.autoId ?? "");
      const boxName = sourceIsBodega
        ? (boxFromBodega?.name ?? "")
        : (boxFromIngreso?.name ?? "");
      const boxTemp = sourceIsBodega
        ? (boxFromBodega?.temperature ?? 0)
        : (boxFromIngreso?.temperature ?? 0);
      const boxClient = sourceIsBodega
        ? (boxFromBodega?.client ?? "")
        : (boxFromIngreso?.client ?? "");

      setOutboundBoxes((prev) =>
        sortByPosition([
          {
            position: target,
            autoId: boxAutoId,
            name: boxName,
            temperature: boxTemp,
            client: boxClient,
          },
          ...prev,
        ]),
      );
      setStats((prev) => ({ ...prev, salidas: prev.salidas + 1 }));
    }

    if (sourceIsBodega) {
      setSlots((prev) =>
        prev.map((item) =>
          item.position === order.sourcePosition
            ? { ...item, autoId: "", name: "", temperature: null, client: "" }
            : item,
        ),
      );
    } else if (order.sourceZone === "ingresos") {
      setInboundBoxes((prev) =>
        prev.filter((item) => item.position !== order.sourcePosition),
      );
    } else if (order.sourceZone === "salida") {
      setOutboundBoxes((prev) =>
        prev.filter((item) => item.position !== order.sourcePosition),
      );
    }
    setOrders((prev) => prev.filter((item) => item.id !== orderId));
    setMessage("Orden ejecutada correctamente.");
  };

  const handleSearch = () => {
    const id = searchId.trim();
    if (!id) {
      setMessage("Ingresa un id o nombre para buscar.");
      return;
    }

    const ingreso = inboundBoxes.find(
      (box) => box.autoId === id || box.name === id,
    );
    if (ingreso) {
      setMessage(`El id ${id} esta en ingresos ${ingreso.position}.`);
      return;
    }

    const bodega = slots.find((slot) => slot.autoId === id || slot.name === id);
    if (bodega) {
      setMessage(`El id ${id} esta en bodega ${bodega.position}.`);
      return;
    }

    const salida = outboundBoxes.find(
      (box) => box.autoId === id || box.name === id,
    );
    if (salida) {
      setMessage(`El id ${id} esta en salida ${salida.position}.`);
      return;
    }

    setMessage(`No se encontro el id ${id}.`);
  };

  const handleDispatchBox = (position: number) => {
    if (role !== "custodio") {
      setMessage("Solo el custodio puede enviar cajas.");
      return;
    }

    const box = outboundBoxes.find((item) => item.position === position);
    if (!box) {
      setMessage("La caja ya no esta en salida.");
      return;
    }

    setOutboundBoxes((prev) =>
      prev.filter((item) => item.position !== position),
    );
    setDispatchedBoxes((prev) => sortByPosition([box, ...prev]));
    setMessage(`Caja en salida ${position} enviada.`);
  };

  const handleReportOrder = (orderId: string) => {
    if (role !== "operario") {
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
    if (role !== "operario") {
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
    setAssignedAlerts((prev) =>
      prev.filter((assignment) => assignment.alertId !== alertId),
    );
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

      if (tempFixZone === "ingresos") {
        setInboundBoxes((prev) =>
          prev.map((box) =>
            box.position === tempFixPosition
              ? { ...box, temperature: parsedTemp }
              : box,
          ),
        );
      } else if (tempFixZone === "salida") {
        setOutboundBoxes((prev) =>
          prev.map((box) =>
            box.position === tempFixPosition
              ? { ...box, temperature: parsedTemp }
              : box,
          ),
        );
      } else {
        setSlots((prev) =>
          prev.map((slot) =>
            slot.position === tempFixPosition
              ? { ...slot, temperature: parsedTemp }
              : slot,
          ),
        );
      }

      setMessage("Temperatura actualizada.");
      handleResolveAlert(resolveModalAlert.id);
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
          label: "Ingresos",
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
          visible: isOperario,
        },
        { key: "alertas", label: "Gestion de alertas", visible: false },
        { key: "reportes", label: "Reportes", visible: isAdmin || isCliente },
      ].filter((tab) => tab.visible),
    [isAdmin, isCliente, isCustodio, isOperario, isJefe, canUseOrderForm],
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
      <div className="relative min-h-screen bg-slate-100 px-6 text-slate-900">
        <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md" />
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-slate-100 px-6 text-slate-900">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#e2e8f0,transparent_60%)]" />
        <main className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center">
          <LoginCard
            username={loginUser}
            password={loginPassword}
            onUsernameChange={setLoginUser}
            onPasswordChange={setLoginPassword}
            onSubmit={handleLogin}
            errorMessage={loginError}
          />
        </main>
      </div>
    );
  }

  function handleUpdateBoxTemperature(position: number, newTemp: number) {
    // Actualiza la temperatura de la caja/slot en el estado correspondiente
    // Puedes adaptar esto según cómo se gestionen los datos en tu app
    setSlots((prev) =>
      prev.map((slot) =>
        slot.position === position ? { ...slot, temperature: newTemp } : slot,
      ),
    );
    setSelectedBoxModal((prev) =>
      prev && prev.position === position
        ? { ...prev, temperature: newTemp }
        : prev,
    );
    setMessage("Temperatura actualizada");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Header
          occupiedCount={occupiedCount}
          totalSlots={TOTAL_SLOTS}
          dateLabel={dateLabel}
          warehouseId={warehouseId}
          warehouseName={warehouseName}
          showIntro={!isOperario}
          showMeta={!isOperario}
          canSearch={canUseSearch}
          searchValue={searchId}
          onSearchChange={setSearchId}
          onSearchSubmit={handleSearch}
          userDisplayName={session?.displayName}
          onLogout={handleLogout}
          role={role}
        />
        {isAdmin ? (
          <WarehouseSelector
            role={role}
            warehouseId={warehouseId}
            warehouseName={warehouseName}
            onWarehouseNameChange={setWarehouseName}
            onChange={noop}
          />
        ) : null}

        {!isJefe && tabs.length > 1 ? (
          <section className="rounded-2xl bg-linear-to-r from-slate-50 to-white border border-slate-200 p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                let icon = null;
                if (tab.key === "estado") icon = <span className="mr-2"><AiTwotoneAppstore /></span>;
                if (tab.key === "ingresos") icon = <span className="mr-2">📦</span>;
                if (tab.key === "ordenes") icon = <span className="mr-2">📝</span>;
                if (tab.key === "solicitudes") icon = <span className="mr-2">⏳</span>;
                if (tab.key === "reportes") icon = <span className="mr-2"><SlGraph /></span>;
                // Puedes cambiar los iconos por react-icons si prefieres
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`relative flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      activeTab === tab.key
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
          />
        ) : null}

        {activeTab === "ingresos" ? (
          <IngresosSection
            isCustodio={isCustodio}
            canUseIngresoForm={canUseIngresoForm}
            inboundBoxes={isCliente ? inboundClient : inboundBoxes}
            outboundBoxes={isCliente ? outboundClient : outboundBoxes}
            ingresoPosition={ingresoPosition}
            ingresoName={ingresoName}
            ingresoTemp={ingresoTemp}
            ingresoClient={ingresoClient}
            setIngresoName={setIngresoName}
            setIngresoTemp={setIngresoTemp}
            setIngresoClient={setIngresoClient}
            handleIngreso={handleIngreso}
            sortByPosition={sortByPosition}
            handleDispatchBox={handleDispatchBox}
            isCliente={isCliente}
            clientFilterId={clientFilterId}
            onClientChange={setClientFilterId}
          />
        ) : null}

        {(activeTab === "ordenes" || isJefe) && canUseOrderForm ? (
          <OrdenesJefeSection
            isJefe={isJefe}
            inboundBoxes={inboundBoxes}
            outboundBoxes={outboundBoxes}
            slots={slots}
            selectedBoxModal={selectedBoxModal}
            setSelectedBoxModal={setSelectedBoxModal}
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
          />
        ) : null}

        {activeTab === "actividades" && isAdmin ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Gestion de alertas
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Solo lectura para el administrador.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Total: {alerts.length}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {alerts.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay alertas activas.
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {alert.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {alert.description}
                          </p>
                          {alert.reason ? (
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              No gestionada:{" "}
                              {
                                ALERT_REASONS.find(
                                  (r) => r.value === alert.reason,
                                )?.label
                              }
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
                              disabled={
                                assignedAlertIds.has(alert.id) ||
                                getAlertKind(alert) === "otro"
                              }
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
                  <h2 className="text-lg font-semibold text-slate-900">
                    Solicitudes pendientes
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Vista consolidada para el administrador.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Total: {orders.length}
                </span>
              </div>
              <div className="mt-4">
                <RequestsQueue
                  requests={orders}
                  canExecute={false}
                  onExecute={() => undefined}
                  onReport={() => undefined}
                />
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "solicitudes" && isOperario ? (
          <section className="grid gap-4">
            <RequestsQueue
              requests={orders}
              canExecute
              onExecute={executeOrder}
              onReport={handleReportOrder}
            />
          </section>
        ) : null}

        {activeTab === "despachados" && isAdmin ? (
          <DespachadosSection
            dispatchedBoxes={dispatchedBoxes}
            sortByPosition={sortByPosition}
          />
        ) : null}

        {activeTab === "alertas" && (isAdmin || isJefe) ? (
          <section className="grid gap-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Gestion de alertas
                  </h2>
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
                  <p className="text-sm text-slate-500">
                    No hay alertas activas.
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {alert.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {alert.description}
                          </p>
                          {alert.reason ? (
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              No gestionada:{" "}
                              {
                                ALERT_REASONS.find(
                                  (r) => r.value === alert.reason,
                                )?.label
                              }
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
                              disabled={
                                assignedAlertIds.has(alert.id) ||
                                getAlertKind(alert) === "otro"
                              }
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

        {activeTab === "reportes" && (isAdmin || isCliente) ? (
          <ReportesSection
            reportData={reportData}
            inboundBoxes={isCliente ? inboundClient : inboundBoxes}
            outboundBoxes={isCliente ? outboundClient : outboundBoxes}
            dispatchedBoxes={isCliente ? dispatchedClient : dispatchedBoxes}
            orders={isCliente ? ordersClient : orders}
            slots={isCliente ? slotsClient : slots}
            sortByPosition={sortByPosition}
            reportDetailModal={reportDetailModal}
            setReportDetailModal={setReportDetailModal}
            isCliente={isCliente}
            clientId={effectiveClientId ?? undefined}
            clientFilterId={clientFilterId}
            onClientChange={setClientFilterId}
          />
        ) : null}

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
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    Alertas activas
                  </h3>
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
                  <p className="text-sm text-slate-500">
                    No hay alertas activas.
                  </p>
                ) : (
                  <div
                    key={alerts[0].id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {alerts[0].title}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {alerts[0].description}
                        </p>
                        {alerts[0].reason ? (
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            No gestionada:{" "}
                            {
                              ALERT_REASONS.find(
                                (r) => r.value === alerts[0].reason,
                              )?.label
                            }
                          </p>
                        ) : null}
                      </div>
                      {/* Si es un reporte de fallo, mostrar botón Marchando */}
                      {alerts[0].id.startsWith(ALERT_REPORT_PREFIX) ? (
                        <button
                          type="button"
                          onClick={() =>
                            setAlerts((prev) =>
                              prev.filter((a) => a.id !== alerts[0].id),
                            )
                          }
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
                            disabled={
                              assignedAlertIds.has(alerts[0].id) ||
                              getAlertKind(alerts[0]) === "otro"
                            }
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
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    Tareas del jefe
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Ejecuta las alertas asignadas por el jefe.
                  </p>
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
                  <p className="text-sm text-slate-500">
                    No hay alertas asignadas.
                  </p>
                ) : (
                  assignedAlertsForOperario.map(({ assignment, alert }) => (
                    <div
                      key={assignment.alertId}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {alert.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {alert.description}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Asignada por {assignment.assignedBy} ·{" "}
                            {assignment.assignedAt}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleExecuteAssignedAlert(alert)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                          >
                            {assignment.kind === "reporte"
                              ? "Reprogramar"
                              : "Ejecutar"}
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
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setStatusModal(null)}
          >
            <div
              className="w-full max-w-lg sm:max-w-2xl rounded-3xl bg-white p-0 shadow-2xl border border-blue-100 relative overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Header sticky con icono */}
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-blue-50/80 px-6 py-4 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${statusModal.kind === 'alertas' ? 'bg-red-100' : 'bg-amber-100'}`}>
                    {statusModal.kind === 'alertas' ? (
                      <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                      <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 118 0v2M12 9v2m0 4h.01" /></svg>
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                      {statusModal.kind === "alertas" ? "Alertas" : "Lista de tareas"}
                    </p>
                    <h3 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
                      {zoneLabels[statusModal.zone]}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600">
                      {statusModal.kind === "alertas"
                        ? "Detalles de alertas activas en esta zona."
                        : "Tareas pendientes relacionadas con esta zona."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusModal(null)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                >
                  Cerrar
                </button>
              </div>
              {/* Lista de items */}
              <div className="p-6 grid gap-4 max-h-[60vh] overflow-y-auto bg-white">
                {(statusModal.kind === "alertas"
                  ? zoneAlertItems[statusModal.zone]
                  : zoneTaskItems[statusModal.zone]
                ).length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <svg className="mx-auto w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="mt-2 text-base font-semibold">No hay elementos para mostrar.</p>
                  </div>
                ) : (
                  (statusModal.kind === "alertas"
                    ? zoneAlertItems[statusModal.zone]
                    : zoneTaskItems[statusModal.zone]
                  ).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-slate-900 truncate">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-600 truncate">
                          {item.description}
                        </p>
                        {item.meta ? (
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {item.meta}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
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
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    {resolveModalAlert.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {resolveModalAlert.description}
                  </p>
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
                      <label className="text-sm font-medium text-slate-600">
                        Caja con temperatura alta
                      </label>
                      <select
                        value={`${tempFixZone}:${tempFixPosition}`}
                        onChange={(event) => {
                          const [zone, position] =
                            event.target.value.split(":");
                          setTempFixZone(zone as OrderSource);
                          setTempFixPosition(Number(position));
                        }}
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        {tempFixOptions.length === 0 ? (
                          <option value="ingresos:1">Sin cajas</option>
                        ) : (
                          tempFixOptions.map((option) => (
                            <option
                              key={`${option.zone}-${option.position}`}
                              value={`${option.zone}:${option.position}`}
                            >
                              {option.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">
                        Nueva temperatura (°C)
                      </label>
                      <input
                        value={tempFixValue}
                        onChange={(event) =>
                          setTempFixValue(event.target.value)
                        }
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
