"use client";
const noop = () => {};

// --- USUARIOS Y SESION ---
type UserAccount = {
  username: string;
  password: string;
  role: Role;
  displayName: string;
};

type Session = {
  username: string;
  role: Role;
  displayName: string;
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
];

import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiClipboard } from "react-icons/fi";
import Header from "./bodega/Header";
import MessageBanner from "./bodega/MessageBanner";
import SlotsGrid from "./bodega/SlotsGrid";
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
} from "../interfaces/bodega";
import SelectedSlotCard from "./bodega/SelectedSlotCard";
import WarehouseSelector from "./bodega/WarehouseSelector";
import RequestsQueue from "./bodega/RequestsQueue";
import LoginCard from "./bodega/LoginCard";

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
const ALERT_TEMPERATURE_ID = "alerta-temperatura-5";
const ALERT_ORDER_PREFIX = "alerta-orden-";
const ALERT_REPORT_PREFIX = "alerta-fallo-";

const createInitialSlots = (): Slot[] =>
  Array.from({ length: TOTAL_SLOTS }, (_, index) => ({
    position: index + 1,
    autoId: "",
    name: "",
    temperature: null,
  }));

const padNumber = (value: number, length: number) =>
  String(value).padStart(length, "0");

const getDateStamp = (date: Date) =>
  `${date.getFullYear()}${padNumber(date.getMonth() + 1, 2)}${padNumber(
    date.getDate(),
    2
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
    if (typeof position !== "number") {
      return null;
    }

    const legacyName = typeof record.itemId === "string" ? record.itemId : "";
    const normalizedName =
      typeof name === "string" ? name : legacyName ?? "";
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

    slots.push({
      position,
      autoId: normalizedAutoId,
      name: normalizedName,
      temperature: normalizedTemp,
    });
  }

  return slots;
};

const isValidRole = (value: unknown): value is Role =>
  value === "custodio" ||
  value === "administrador" ||
  value === "operario" ||
  value === "jefe";

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
      createdBy: isValidRole(createdBy) ? createdBy as Role : "custodio",
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
      (u) => u.username === loginUser && u.password === loginPassword
    );
    if (!user) {
      setLoginError("Usuario o contraseña incorrectos.");
      return;
    }
    const newSession: Session = {
      username: user.username,
      role: user.role,
      displayName: user.displayName,
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
  const [alertClock, setAlertClock] = useState(() => Date.now());
  const [statusModal, setStatusModal] = useState<
    | {
        zone: ZoneKey;
        kind: ModalKind;
      }
    | null
  >(null);
  const [resolveModalAlert, setResolveModalAlert] = useState<AlertItem | null>(null);
  const [tempFixZone, setTempFixZone] = useState<OrderSource>("ingresos");
  const [tempFixPosition, setTempFixPosition] = useState<number>(1);
  const [tempFixValue, setTempFixValue] = useState<string>("");

  const [ingresoPosition, setIngresoPosition] = useState<number>(1);
  const [ingresoName, setIngresoName] = useState<string>("");
  const [ingresoTemp, setIngresoTemp] = useState<string>("");

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
          const normalized = normalizeSlots(event.newValue ? JSON.parse(event.newValue) : []);
          if (normalized) {
            setSlots(normalized);
          }
        }
        if (event.key === INBOUND_STORAGE_KEY) {
          const normalized = normalizeBoxes(event.newValue ? JSON.parse(event.newValue) : []);
          if (normalized) {
            setInboundBoxes(normalized);
          }
        }
        if (event.key === OUTBOUND_STORAGE_KEY) {
          const normalized = normalizeBoxes(event.newValue ? JSON.parse(event.newValue) : []);
          if (normalized) {
            setOutboundBoxes(normalized);
          }
        }
        if (event.key === DISPATCHED_STORAGE_KEY) {
          const normalized = normalizeBoxes(event.newValue ? JSON.parse(event.newValue) : []);
          if (normalized) {
            setDispatchedBoxes(normalized);
          }
        }
        if (event.key === ORDERS_STORAGE_KEY) {
          const normalized = normalizeOrders(event.newValue ? JSON.parse(event.newValue) : []);
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
        JSON.stringify(dispatchedBoxes)
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
    [slots]
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.position === selectedPosition) ?? null,
    [slots, selectedPosition]
  );

  const freeSlots = useMemo(
    () => slots.filter((slot) => !slot.autoId.trim()).map((slot) => slot.position),
    [slots]
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
    [freeSlots, reservedBodegaTargets]
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
        })),
    [slots]
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
        (box) => !pendingSourceKeys.has(`ingresos:${box.position}`)
      ),
    [inboundBoxes, pendingSourceKeys]
  );

  const availableBodegaForOrders = useMemo(
    () =>
      bodegaBoxes.filter(
        (box) => !pendingSourceKeys.has(`bodega:${box.position}`)
      ),
    [bodegaBoxes, pendingSourceKeys]
  );

  const reviewBodegaList = useMemo(
    () => availableBodegaForOrders,
    [availableBodegaForOrders]
  );

  const availableOutboundForReview = useMemo(
    () =>
      outboundBoxes.filter(
        (box) => !pendingSourceKeys.has(`salida:${box.position}`)
      ),
    [outboundBoxes, pendingSourceKeys]
  );

  const reportData = useMemo(
    () => [
      { name: "Ingresos", value: stats.ingresos, fill: "#38bdf8" },
      { name: "Salidas", value: stats.salidas, fill: "#f97316" },
      {
        name: "Movimientos a bodega",
        value: stats.movimientosBodega,
        fill: "#22c55e",
      },
      {
        name: "Despachados",
        value: dispatchedBoxes.length,
        fill: "#0ea5e9",
      },
    ],
    [dispatchedBoxes.length, stats]
  );

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
    [inboundBoxes]
  );
  const outboundHighBoxes = useMemo(
    () => outboundBoxes.filter((box) => box.temperature > 5),
    [outboundBoxes]
  );
  const bodegaHighSlots = useMemo(
    () =>
      slots.filter(
        (slot) => typeof slot.temperature === "number" && slot.temperature > 5
      ),
    [slots]
  );

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
  const nextAlert = alerts[0] ?? null;
  const overdueOrders = useMemo(
    () =>
      orders.filter(
        (order) => alertClock - order.createdAtMs >= ALERT_DELAY_MS
      ),
    [alertClock, orders]
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

  useEffect(() => {
    const hasHighTemp =
      inboundHighBoxes.length > 0 ||
      outboundHighBoxes.length > 0 ||
      bodegaHighSlots.length > 0;

    const overdueOrders = orders.filter(
      (order) => alertClock - order.createdAtMs >= ALERT_DELAY_MS
    );

    setAlerts((prev) => {
      const previousById = new Map(prev.map((alert) => [alert.id, alert]));
      const next: AlertItem[] = [];

      if (hasHighTemp) {
        const existing = previousById.get(ALERT_TEMPERATURE_ID);
        const tempDetails = [
          ...inboundHighBoxes.map(
            (box) =>
              `Ingreso ${box.position} · ${box.name} (${box.autoId}) · ${box.temperature} °C`
          ),
          ...bodegaHighSlots.map(
            (slot) =>
              `Bodega ${slot.position} · ${slot.name} (${slot.autoId}) · ${slot.temperature} °C`
          ),
          ...outboundHighBoxes.map(
            (box) =>
              `Salida ${box.position} · ${box.name} (${box.autoId}) · ${box.temperature} °C`
          ),
        ];
        next.push(
          existing ?? {
            id: ALERT_TEMPERATURE_ID,
            title: "Temperatura alta",
            description: `Temperaturas > 5 °C: ${tempDetails.join(" | ")}.`,
          }
        );
      }

      for (const order of overdueOrders) {
        const alertId = `${ALERT_ORDER_PREFIX}${order.id}`;
        const existing = previousById.get(alertId);
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
              ? `Ingreso ${order.sourcePosition} -> Bodega ${
                  orderTarget ?? "-"
                }`
              : `${sourceLabel} ${order.sourcePosition} -> Salida ${
                  orderTarget ?? "-"
                }`;

        next.push(
          existing ?? {
            id: alertId,
            title: "Tarea demorada",
            description: `Orden pendiente por mas de 2 minutos: ${orderLabel}. Solicitado por ${order.createdBy} · ${order.createdAt}.`,
          }
        );
      }

      prev
        .filter((alert) => alert.id.startsWith(ALERT_REPORT_PREFIX))
        .forEach((alert) => {
          if (!next.some((item) => item.id === alert.id)) {
            next.push(alert);
          }
        });

      return next;
    });
  }, [
    alertClock,
    bodegaHighSlots,
    inboundHighBoxes,
    outboundHighBoxes,
    orders,
  ]);

  useEffect(() => {
    if (availableBodegaForOrders.length === 0) {
      setBodegaOrderSourcePosition(1);
      return;
    }
    if (
      !availableBodegaForOrders.some(
        (box) => box.position === bodegaOrderSourcePosition
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
        (box) => box.position === ingresoOrderSourcePosition
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
  }, [
    reviewSourcePosition,
    reviewBodegaList,
  ]);

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
      getNextSalidaPosition(outboundBoxes, reservedSalidaTargets)
    );
  }, [outboundBoxes, reservedSalidaTargets]);

  useEffect(() => {
    if (availableBodegaForOrders.length === 0) {
      setSalidaSourcePosition(1);
      return;
    }
    if (!availableBodegaForOrders.some((box) => box.position === salidaSourcePosition)) {
      setSalidaSourcePosition(availableBodegaForOrders[0].position);
    }
  }, [availableBodegaForOrders, salidaSourcePosition]);

  // role ahora se deriva de session
  const role = session?.role ?? "custodio";
  const isAdmin = role === "administrador";
  const isOperario = role === "operario";
  const isCustodio = role === "custodio";
  const isJefe = role === "jefe";
  const canManageAlerts = isJefe;

  const canSeeBodega = isAdmin || isOperario;
  const canUseIngresoForm = isCustodio;
  const canUseOrderForm = isJefe;
  const canSeeOrders = isAdmin || isOperario;
  const canUseSearch = isAdmin;

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
      autoId: createAutoId("BOX"),
      name: ingresoName.trim(),
      temperature: parsedTemp,
    };

    setInboundBoxes((prev) => sortByPosition([newBox, ...prev]));
    setStats((prev) => ({ ...prev, ingresos: prev.ingresos + 1 }));
    setIngresoName("");
    setIngresoTemp("");
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
      (item) => item.position === effectiveSourcePosition
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
        reservedSalidaTargets
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

    const box = reviewList.find(
      (item) => item.position === reviewSourcePosition
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
      (item) => item.position === order.sourcePosition
    );
    const boxFromBodega = slots.find(
      (item) => item.position === order.sourcePosition
    );

    if (order.type === "revisar") {
      const existsInIngreso = inboundBoxes.some(
        (item) => item.position === order.sourcePosition
      );
      const existsInBodega = slots.some(
        (item) => item.position === order.sourcePosition && item.autoId.trim()
      );
      const existsInSalida = outboundBoxes.some(
        (item) => item.position === order.sourcePosition
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
      if (!sourceIsBodega && !boxFromIngreso) {
        setMessage("La caja ya no esta en ingresos.");
        return;
      }
      if (sourceIsBodega && (!boxFromBodega || !boxFromBodega.autoId.trim())) {
        setMessage("La caja ya no esta en bodega.");
        return;
      }
      const boxAutoId = sourceIsBodega
        ? boxFromBodega?.autoId ?? ""
        : boxFromIngreso?.autoId ?? "";
      const boxName = sourceIsBodega
        ? boxFromBodega?.name ?? ""
        : boxFromIngreso?.name ?? "";
      const boxTemp = sourceIsBodega
        ? boxFromBodega?.temperature ?? 0
        : boxFromIngreso?.temperature ?? 0;
      setSlots((prev) =>
        prev.map((item) =>
          item.position === target
            ? {
                ...item,
                autoId: boxAutoId,
                name: boxName,
                temperature: boxTemp,
              }
            : item
        )
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
        ? boxFromBodega?.autoId ?? ""
        : boxFromIngreso?.autoId ?? "";
      const boxName = sourceIsBodega
        ? boxFromBodega?.name ?? ""
        : boxFromIngreso?.name ?? "";
      const boxTemp = sourceIsBodega
        ? boxFromBodega?.temperature ?? 0
        : boxFromIngreso?.temperature ?? 0;

      setOutboundBoxes((prev) =>
        sortByPosition([
          {
            position: target,
            autoId: boxAutoId,
            name: boxName,
            temperature: boxTemp,
          },
          ...prev,
        ])
      );
      setStats((prev) => ({ ...prev, salidas: prev.salidas + 1 }));
    }

    if (sourceIsBodega) {
      setSlots((prev) =>
        prev.map((item) =>
          item.position === order.sourcePosition
            ? { ...item, autoId: "", name: "", temperature: null }
            : item
        )
      );
    } else {
      setInboundBoxes((prev) =>
        prev.filter((item) => item.position !== order.sourcePosition)
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
      (box) => box.autoId === id || box.name === id
    );
    if (ingreso) {
      setMessage(`El id ${id} esta en ingresos ${ingreso.position}.`);
      return;
    }

    const bodega = slots.find(
      (slot) => slot.autoId === id || slot.name === id
    );
    if (bodega) {
      setMessage(`El id ${id} esta en bodega ${bodega.position}.`);
      return;
    }

    const salida = outboundBoxes.find(
      (box) => box.autoId === id || box.name === id
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

    setOutboundBoxes((prev) => prev.filter((item) => item.position !== position));
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
      },
      ...prev,
    ]);
    setMessage("Reporte enviado al jefe.");
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  const handleAlertReasonChange = (alertId: string, reason: AlertReason) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, reason } : alert
      )
    );
  };

  const openResolveModal = (alert: AlertItem) => {
    setResolveModalAlert(alert);
    if (alert.id === ALERT_TEMPERATURE_ID) {
      const first = tempFixOptions[0];
      if (first) {
        setTempFixZone(first.zone);
        setTempFixPosition(first.position);
      }
      setTempFixValue("");
    }
  };

  const handleResolveWithSolution = () => {
    if (!resolveModalAlert) {
      return;
    }

    if (resolveModalAlert.id === ALERT_TEMPERATURE_ID) {
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
              : box
          )
        );
      } else if (tempFixZone === "salida") {
        setOutboundBoxes((prev) =>
          prev.map((box) =>
            box.position === tempFixPosition
              ? { ...box, temperature: parsedTemp }
              : box
          )
        );
      } else {
        setSlots((prev) =>
          prev.map((slot) =>
            slot.position === tempFixPosition
              ? { ...slot, temperature: parsedTemp }
              : slot
          )
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
            : order
        )
      );
      setMessage("Tarea reprogramada.");
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
        { key: "reportes", label: "Reportes", visible: isAdmin },
      ].filter((tab) => tab.visible),
    [isAdmin, isCustodio, isOperario, isJefe, canUseOrderForm]
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
            users={USERS}
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
          <section className="rounded-2xl bg-white p-2 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "estado" && canSeeBodega ? (
          <section className="grid gap-6 xl:grid-cols-[1fr_1.8fr_1fr] 2xl:grid-cols-[1fr_2.1fr_1fr]">
            <div className="min-w-0 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Entrada</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {renderStatusButtons("entrada")}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {inboundBoxes.length} cajas
                  </span>
                </div>
              </div>
              {/* <p className="mt-1 text-sm text-slate-600">
                Cajas registradas en ingresos.
              </p> */}
              <div className="mt-4 grid gap-3">
                {inboundBoxes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay cajas en ingresos.
                  </p>
                ) : (
                  sortByPosition(inboundBoxes).map((box) => (
                    <div
                      key={`estado-ingreso-${box.position}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                    >
                      <p className="font-semibold">Ingreso {box.position}</p>
                      <p>Id unico: {box.autoId}</p>
                      <p>Nombre: {box.name}</p>
                      <p>Temperatura: {box.temperature} °C</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="min-w-0 flex flex-col gap-4">
              <SlotsGrid
                slots={slots}
                selectedPosition={selectedPosition}
                onSelect={handleSelectSlot}
                headerActions={renderStatusButtons("bodega")}
              />
              <SelectedSlotCard
                slot={selectedSlot}
                onClose={() => setSelectedPosition(null)}
                onSave={() => undefined}
                canEdit={false}
              />
            </div>

            <div className="min-w-0 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Salida</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {renderStatusButtons("salida")}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {outboundBoxes.length} cajas
                  </span>
                </div>
              </div>
              {/* <p className="mt-1 text-sm text-slate-600">
                Cajas despachadas por el operario.
              </p> */}
              <div className="mt-4 grid gap-3">
                {outboundBoxes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay cajas en salida.
                  </p>
                ) : (
                  sortByPosition(outboundBoxes).map((box) => (
                    <div
                      key={`estado-salida-${box.position}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                    >
                      <p className="font-semibold">Salida {box.position}</p>
                      <p>Id unico: {box.autoId}</p>
                      <p>Nombre: {box.name}</p>
                      <p>Temperatura: {box.temperature} °C</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "ingresos" ? (
          isCustodio ? (
            <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="flex flex-col gap-4">
                {canUseIngresoForm ? (
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Ingreso de cajas
                    </h2>
                    {/* <p className="mt-1 text-sm text-slate-600">
                      Registra nuevas cajas en la zona de ingresos.
                    </p> */}
                    <div className="mt-4 grid gap-3">
                      <label className="text-sm font-medium text-slate-600">
                        Orden de posicion
                      </label>
                      <input
                        value={ingresoPosition}
                        type="number"
                        readOnly
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                      />
                      <label className="text-sm font-medium text-slate-600">
                        Nombre de la caja
                      </label>
                      <input
                        value={ingresoName}
                        onChange={(event) => setIngresoName(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Ej: Caja banano"
                      />
                      <label className="text-sm font-medium text-slate-600">
                        Temperatura (°C)
                      </label>
                      <input
                        value={ingresoTemp}
                        onChange={(event) => setIngresoTemp(event.target.value)}
                        type="number"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Ej: -8"
                      />
                      <button
                        type="button"
                        onClick={handleIngreso}
                        className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Registrar ingreso
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Zona de ingresos
                    </h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {inboundBoxes.length} cajas
                    </span>
                  </div>
                  {/* <p className="mt-1 text-sm text-slate-600">
                    Cajas registradas por el custodio.
                  </p> */}
                  <div className="mt-4 grid gap-3">
                    {inboundBoxes.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No hay cajas en ingresos.
                      </p>
                    ) : (
                      sortByPosition(inboundBoxes).map((box) => (
                        <div
                          key={`ingreso-${box.position}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                        >
                          <p className="font-semibold">Ingreso {box.position}</p>
                          <p>Id unico: {box.autoId}</p>
                          <p>Nombre: {box.name}</p>
                          <p>Temperatura: {box.temperature} °C</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Zona de salida
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {outboundBoxes.length} cajas
                  </span>
                </div>
                {/* <p className="mt-1 text-sm text-slate-600">
                  Cajas listas para enviar.
                </p> */}
                <div className="mt-4 grid gap-3">
                  {outboundBoxes.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No hay cajas en salida.
                    </p>
                  ) : (
                    sortByPosition(outboundBoxes).map((box) => (
                      <div
                        key={`ingreso-salida-${box.position}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">Salida {box.position}</p>
                            <p>Id unico: {box.autoId}</p>
                            <p>Nombre: {box.name}</p>
                            <p>Temperatura: {box.temperature} °C</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDispatchBox(box.position)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-3">
              {isAdmin ? (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Zona de ingresos
                    </h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {inboundBoxes.length} cajas
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Cajas registradas por el custodio.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {inboundBoxes.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No hay cajas en ingresos.
                      </p>
                    ) : (
                      sortByPosition(inboundBoxes).map((box) => (
                        <div
                          key={`ingreso-${box.position}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                        >
                          <p className="font-semibold">Ingreso {box.position}</p>
                          <p>Id unico: {box.autoId}</p>
                          <p>Nombre: {box.name}</p>
                          <p>Temperatura: {box.temperature} °C</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          )
        ) : null}

        {(activeTab === "ordenes" || isJefe) && canUseOrderForm ? (
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Ingresos</h2>
              {/* <p className="mt-1 text-sm text-slate-600">
                Ordena ingresos hacia posiciones de bodega.
              </p> */}
              <div className="mt-4 grid flex-1 gap-3">
                <label className="text-sm font-medium text-slate-600">
                  Origen
                </label>
                <input
                  value="Ingresos"
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
                <label className="text-sm font-medium text-slate-600">
                  Caja en ingresos
                </label>
                <select
                  value={ingresoOrderSourcePosition}
                  onChange={(event) =>
                    setIngresoOrderSourcePosition(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {availableInboundForOrders.length === 0
                    ? (
                      <option value={1}>Sin cajas</option>
                    )
                    : sortByPosition(availableInboundForOrders).map((box) => (
                      <option key={box.position} value={box.position}>
                        {`Ingreso ${box.position} - ${box.name} (${box.autoId})`}
                      </option>
                    ))}
                </select>
                <label className="text-sm font-medium text-slate-600">
                  Posicion en bodega
                </label>
                <select
                  value={ingresoOrderTargetPosition}
                  onChange={(event) =>
                    setIngresoOrderTargetPosition(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {availableBodegaTargets.length === 0 ? (
                    <option value={1}>Sin posiciones libres</option>
                  ) : (
                    availableBodegaTargets.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    handleCreateOrder({
                      destination: "a_bodega",
                      sourceZone: "ingresos",
                      sourcePosition: ingresoOrderSourcePosition,
                      targetPosition: ingresoOrderTargetPosition,
                    })
                  }
                  className="mt-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Crear ingreso
                </button>
              </div>
            </div>

            <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Bodega a Bodega
              </h2>
              {/* <p className="mt-1 text-sm text-slate-600">
                Movimiento interno de bodega a bodega.
              </p> */}
              <div className="mt-4 grid flex-1 gap-3">
                <label className="text-sm font-medium text-slate-600">
                  Destino
                </label>
                <select
                  value="a_bodega"
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm"
                >
                  <option value="a_bodega">Bodega</option>
                </select>
                <label className="text-sm font-medium text-slate-600">
                  Origen
                </label>
                <input
                  value="Bodega"
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
                <label className="text-sm font-medium text-slate-600">
                  Caja en bodega
                </label>
                <select
                  value={bodegaOrderSourcePosition}
                  onChange={(event) =>
                    setBodegaOrderSourcePosition(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {availableBodegaForOrders.length === 0
                    ? (
                      <option value={1}>Sin cajas</option>
                    )
                    : sortByPosition(availableBodegaForOrders).map((box) => (
                      <option key={box.position} value={box.position}>
                        {`Bodega ${box.position} - ${box.name} (${box.autoId})`}
                      </option>
                    ))}
                </select>
                <label className="text-sm font-medium text-slate-600">
                  Posicion en bodega
                </label>
                <select
                  value={bodegaOrderTargetPosition}
                  onChange={(event) =>
                    setBodegaOrderTargetPosition(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {availableBodegaTargets.length === 0 ? (
                    <option value={1}>Sin posiciones libres</option>
                  ) : (
                    availableBodegaTargets.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    handleCreateOrder({
                      destination: "a_bodega",
                      sourceZone: "bodega",
                      sourcePosition: bodegaOrderSourcePosition,
                      targetPosition: bodegaOrderTargetPosition,
                    })
                  }
                  className="mt-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Crear orden
                </button>
              </div>
            </div>

            <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Revisar
              </h2>
              {/* <p className="mt-1 text-sm text-slate-600">
                Crea una tarea para que el operario revise una caja.
              </p> */}
              <div className="mt-4 grid flex-1 gap-3">
                <label className="text-sm font-medium text-slate-600">
                  Zona
                </label>
                <select
                  value="bodega"
                  disabled
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="bodega">Bodega</option>
                </select>
                <label className="text-sm font-medium text-slate-600">
                  Caja
                </label>
                <select
                  value={reviewSourcePosition}
                  onChange={(event) =>
                    setReviewSourcePosition(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {reviewBodegaList.length === 0
                    ? (
                      <option value={1}>Sin cajas</option>
                    )
                    : sortByPosition(reviewBodegaList).map((box) => (
                      <option key={box.position} value={box.position}>
                        {`Bodega ${box.position} - ${box.name} (${box.autoId})`}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleCreateReviewOrder}
                  className="mt-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Crear revision
                </button>
              </div>
            </div>

            <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Crear salida
              </h2>
              {/* <p className="mt-1 text-sm text-slate-600">
                Define la caja en bodega y la posicion final en salida.
              </p> */}
              <div className="mt-4 grid flex-1 gap-3">
                <label className="text-sm font-medium text-slate-600">
                  Origen
                </label>
                <input
                  value="Bodega"
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
                <label className="text-sm font-medium text-slate-600">
                  Caja en bodega
                </label>
                <select
                  value={salidaSourcePosition}
                  onChange={(event) =>
                    setSalidaSourcePosition(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {availableBodegaForOrders.length === 0
                    ? (
                      <option value={1}>Sin cajas</option>
                    )
                    : sortByPosition(availableBodegaForOrders).map((box) => (
                      <option key={box.position} value={box.position}>
                        {`Bodega ${box.position} - ${box.name} (${box.autoId})`}
                      </option>
                    ))}
                </select>
                <label className="text-sm font-medium text-slate-600">
                  Posicion en salida
                </label>
                <input
                  value={salidaTargetPosition}
                  type="number"
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCreateOrder({
                      destination: "a_salida",
                      sourceZone: "bodega",
                      sourcePosition: salidaSourcePosition,
                    })
                  }
                  className="mt-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Crear salida
                </button>
              </div>
            </div>
            {isJefe ? (
              <div className="lg:col-span-2 xl:col-span-4">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Gestion de alertas
                      </h2>
                      {/* <p className="mt-1 text-sm text-slate-600">
                        Revisa y gestiona las alertas activas.
                      </p> */}
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
                      nextAlert ? (
                        <div
                          key={nextAlert.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {nextAlert.title}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {nextAlert.description}
                              </p>
                              {nextAlert.reason ? (
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  No gestionada: {ALERT_REASONS.find((r) => r.value === nextAlert.reason)?.label}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openResolveModal(nextAlert)}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                              >
                                Gestionada
                              </button>
                              <select
                                value={nextAlert.reason ?? ""}
                                onChange={(event) =>
                                  handleAlertReasonChange(
                                    nextAlert.id,
                                    event.target.value as AlertReason
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                              >
                                <option value="" disabled>
                                  No gestionada...
                                </option>
                                {ALERT_REASONS.map((reason) => (
                                  <option key={reason.value} value={reason.value}>
                                    {reason.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
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
                              No gestionada: {ALERT_REASONS.find((r) => r.value === alert.reason)?.label}
                            </p>
                          ) : null}
                        </div>
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
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Despachados
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {dispatchedBoxes.length} cajas
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Cajas enviadas por el custodio.
            </p>
            <div className="mt-4 grid gap-3">
              {dispatchedBoxes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay cajas despachadas.
                </p>
              ) : (
                sortByPosition(dispatchedBoxes).map((box) => (
                  <div
                    key={`despachado-${box.position}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    <p className="font-semibold">Salida {box.position}</p>
                    <p>Id unico: {box.autoId}</p>
                    <p>Nombre: {box.name}</p>
                    <p>Temperatura: {box.temperature} °C</p>
                  </div>
                ))
              )}
            </div>
          </section>
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
                      ? "Revisa y gestiona las alertas activas."
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
                              No gestionada: {ALERT_REASONS.find((r) => r.value === alert.reason)?.label}
                            </p>
                          ) : null}
                        </div>
                        {canManageAlerts ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openResolveModal(alert)}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                            >
                              Gestionada
                            </button>
                            <select
                              value={alert.reason ?? ""}
                              onChange={(event) =>
                                handleAlertReasonChange(
                                  alert.id,
                                  event.target.value as AlertReason
                                )
                              }
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                            >
                              <option value="" disabled>
                                No gestionada...
                              </option>
                              {ALERT_REASONS.map((reason) => (
                                <option key={reason.value} value={reason.value}>
                                  {reason.label}
                                </option>
                              ))}
                            </select>
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

        {activeTab === "reportes" && isAdmin ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Reportes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Aqui podras consultar los reportes de la bodega.
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-700">
                  Totales por tipo
                </h3>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {reportData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-700">
                  Distribucion
                </h3>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip />
                      <Pie
                        data={reportData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {reportData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {reportData.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-slate-100 bg-white p-4"
                >
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {item.name}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {statusModal ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setStatusModal(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    {statusModal.kind === "alertas"
                      ? "Alertas"
                      : "Lista de tareas"}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    {zoneLabels[statusModal.zone]}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {statusModal.kind === "alertas"
                      ? "Detalles de alertas activas en esta zona."
                      : "Tareas pendientes relacionadas con esta zona."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusModal(null)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>
              <div className="mt-6 grid gap-3">
                {(statusModal.kind === "alertas"
                  ? zoneAlertItems[statusModal.zone]
                  : zoneTaskItems[statusModal.zone]
                ).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.description}
                        </p>
                        {item.meta ? (
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {item.meta}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
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
                {resolveModalAlert.id === ALERT_TEMPERATURE_ID ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-slate-600">
                        Caja con temperatura alta
                      </label>
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
                    Marca el reporte como solucionado.
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
