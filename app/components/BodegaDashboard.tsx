"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useBodegaHistory } from "./BodegaDashboard/BodegaHistoryContext";
import EstadoBodegaSection from "./BodegaDashboard/EstadoBodegaSection";
import IngresosSection from "./BodegaDashboard/IngresosSection";
import OrdenesJefeSection from "./BodegaDashboard/OrdenesJefeSection";
import DespachadosSection from "./BodegaDashboard/DespachadosSection";
import ReportesSection from "./BodegaDashboard/ReportesSection";
import { AiTwotoneAppstore } from "react-icons/ai";
import { SlGraph } from "react-icons/sl";
import {
  FiAlertTriangle,
  FiClipboard,
  FiShoppingCart,
  FiTruck,
  FiHome,
  FiExternalLink,
} from "react-icons/fi";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  Role,
  Slot,
} from "../interfaces/bodega";
import WarehouseSelector from "./bodega/WarehouseSelector";
import RequestsQueue from "./bodega/RequestsQueue";
import LoginCard from "./bodega/LoginCard";
import {
  DEFAULT_WAREHOUSE_ID,
  ensureHistoryState,
  ensureWarehouseState,
  saveWarehouseState,
  subscribeWarehouseState,
} from "../../lib/bodegaCloudState";
import { fetchFridemSlots } from "../../lib/fridemInventory";

// --- SESION DESDE FIREBASE ---
type Session = {
  uid: string;
  email: string | null;
  role: Role;
  displayName: string;
  clientId?: string;
};

type UserProfile = {
  role: Role;
  displayName: string;
  clientId?: string;
};

// --- TIPOS Y CONSTANTES ---
const DEFAULT_TOTAL_SLOTS = 12;
const WAREHOUSE_ID = DEFAULT_WAREHOUSE_ID;

type AlertReason = "no_tuve_tiempo" | "no_quise" | "no_pude";

type AdminSection =
  | "menu"
  | "compras"
  | "transporte"
  | "bodega_interna"
  | "bodega_externa";

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
  value === "jefe" ||
  value === "cliente" ||
  value === "configurador";

const normalizeSlots = (value: unknown, expectedSize = DEFAULT_TOTAL_SLOTS): Slot[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const target = normalizeCapacity(expectedSize);
  const map = new Map<number, Slot>();

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const record = item as Record<string, unknown>;
    const position = typeof record.position === "number" ? Math.floor(record.position) : NaN;
    if (!Number.isFinite(position) || position < 1) {
      return null;
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

    map.set(position, {
      position,
      autoId: normalizedAutoId,
      name: normalizedName,
      temperature: normalizedTemp,
      client: normalizedClient,
    });
  }

  const sortedPositions = [...map.keys()].sort((a, b) => a - b);
  const result: Slot[] = [];
  for (const pos of sortedPositions) {
    if (pos > target) break;
    const slot = map.get(pos);
    if (slot) {
      result.push(slot);
    }
    if (result.length >= target) break;
  }

  for (let pos = 1; result.length < target; pos += 1) {
    if (!map.has(pos)) {
      result.push({ position: pos, autoId: "", name: "", temperature: null, client: "" });
    }
  }

  return result.slice(0, target);
};

const resizeSlotsToCapacity = (slots: Slot[], capacity: number) =>
  normalizeSlots(slots, capacity) ?? createInitialSlots(capacity);

const filterBoxesByCapacity = (items: Box[], capacity: number) =>
  items.filter((item) => item.position <= capacity);

const filterOrdersByCapacity = (items: BodegaOrder[], capacity: number) =>
  items.filter((order) => {
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
      client: typeof record.client === "string" ? record.client : undefined,
      autoId: typeof record.autoId === "string" ? record.autoId : undefined,
      boxName: typeof record.boxName === "string" ? record.boxName : undefined,
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

const getNextIngresoPosition = (boxes: Box[], capacity?: number) => {
  const max = capacity && capacity > 0 ? capacity : undefined;
  const occupied = new Set(boxes.map((box) => box.position));
  let next = 1;
  while (occupied.has(next)) {
    next += 1;
    if (max && next > max) return max;
  }
  if (max) return Math.min(next, max);
  return next;
};

const getNextSalidaPosition = (boxes: Box[], reserved?: Set<number>, capacity?: number) => {
  const max = capacity && capacity > 0 ? capacity : undefined;
  const occupied = new Set(boxes.map((box) => box.position));
  if (reserved) {
    reserved.forEach((position) => occupied.add(position));
  }
  let next = 1;
  while (occupied.has(next)) {
    next += 1;
    if (max && next > max) return max;
  }
  if (max) return Math.min(next, max);
  return next;
};

const loadUserProfile = async (uid: string): Promise<UserProfile> => {
  const primaryRef = doc(db, "users", uid);
  const primarySnap = await getDoc(primaryRef);
  if (primarySnap.exists()) {
    const data = primarySnap.data() as Partial<UserProfile>;
    if (!data.role) {
      throw new Error("El perfil de usuario no tiene rol definido");
    }
    return {
      role: data.role as Role,
      displayName: data.displayName ?? "Usuario",
      clientId: data.clientId,
    };
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
  return {
    role: data.role as Role,
    displayName: data.displayName ?? data.name ?? "Usuario",
    clientId: data.clientId,
  };
};

export default function BodegaDashboard() {
  const [selectedBoxModal, setSelectedBoxModal] = useState<Box | Slot | null>(null);
  const [editTempModal, setEditTempModal] = useState<{
    position: number;
    autoId: string;
    name: string;
    temperature: number | null;
  } | null>(null);
  const [orderModalType, setOrderModalType] = React.useState<string | null>(null);
  const [reportDetailModal, setReportDetailModal] = useState<null | {
    type: "ingresos" | "salidas" | "movimientos" | "despachados" | "alertas";
  }>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
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
      setSession({
        uid: credentials.user.uid,
        email: credentials.user.email ?? loginUser,
        role: profile.role,
        displayName: profile.displayName,
        clientId: profile.clientId,
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
  const [adminSection, setAdminSection] = useState<AdminSection>("bodega_interna");
  /** Pulso para que clientes en Reportes vuelvan al submenú de vistas al pulsar Menú en el header */
  const [reportesClienteMenuNonce, setReportesClienteMenuNonce] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSession(null);
        return;
      }
      try {
        const profile = await loadUserProfile(user.uid);
        setSession({
          uid: user.uid,
          email: user.email ?? null,
          role: profile.role,
          displayName: profile.displayName,
          clientId: profile.clientId,
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

  useEffect(() => {
    if (session?.role === "administrador") {
      setAdminSection("menu");
    } else {
      setAdminSection("bodega_interna");
    }
  }, [session?.role]);

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

  const [ingresoPosition, setIngresoPosition] = useState<number>(1);
  const [ingresoName, setIngresoName] = useState<string>("");
  const [ingresoTemp, setIngresoTemp] = useState<string>("");
  const [ingresoClient, setIngresoClient] = useState<string>("cliente1");
  const [clientFilterId, setClientFilterId] = useState<string>("cliente1");
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
      const items: ConfigUser[] = snapshot.docs.map((docSnap) => {
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
      });

      items.sort(
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
      setUsers((prev) => [newUser, ...prev]);
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
    loadWarehouses();
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
      setLlamadasJefe(cloud.llamadasJefe ?? []);
      setCloudReady(true);
    });

    return () => unsubscribe();
  }, [currentWarehouse, isExternalWarehouse, loadExternalWarehouseData, resolveCapacityForWarehouse, session, warehouseId]);

  useEffect(() => {
    if (!cloudReady || !warehouseId || isExternalWarehouse) return;
    if (remoteUpdate.current) {
      remoteUpdate.current = false;
      return;
    }

    const snapshot = JSON.stringify({
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
      llamadasJefe,
    });

    if (lastSavedSnapshot.current === snapshot) {
      return;
    }

    lastSavedSnapshot.current = snapshot;
    saveWarehouseState(warehouseId, {
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
      llamadasJefe,
    }).catch(() => { });
  }, [
    alerts,
    alertasOperario,
    alertasOperarioSolved,
    assignedAlerts,
    cloudReady,
    dispatchedBoxes,
    isExternalWarehouse,
    inboundBoxes,
    llamadasJefe,
    orders,
    outboundBoxes,
    slots,
    stats,
    warehouseId,
    warehouseName,
  ]);

  useEffect(() => {
    setIngresoPosition(getNextIngresoPosition(inboundBoxes, warehouseCapacity));
  }, [inboundBoxes, warehouseCapacity]);

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
      keys.add(`${order.sourceZone}:${order.sourcePosition}`);
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

  const reviewBodegaList = useMemo(() => availableBodegaForOrders, [availableBodegaForOrders]);

  const {
    ingresos: historyIngresos,
    salidas: historySalidas,
    movimientosBodega: historyMovimientos,
    alertas,
    addIngreso,
    addSalida,
    addMovimientoBodega,
    addAlerta,
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
  const bodegaHighSlots = React.useMemo(() => {
    const solvedPositions = new Set(alertasOperarioSolved);
    return slots.filter(
      (slot) =>
        typeof slot.temperature === "number" &&
        slot.temperature > 5 &&
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
    setSalidaTargetPosition(getNextSalidaPosition(outboundBoxes, reservedSalidaTargets, warehouseCapacity));
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
  const isConfigurator = role === "configurador";
  const clientId = session?.clientId ?? null;
  const effectiveClientId = isCliente ? clientFilterId || clientId || "cliente1" : clientId;
  const canManageAlerts = isJefe;

  const showAdminMenu = isAdmin && adminSection !== "bodega_interna";
  const showDashboard = !isAdmin || adminSection === "bodega_interna" || isConfigurator;

  const canSeeBodega = isAdmin || isOperario;
  const canUseIngresoForm = isCustodio;
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
    fetchUsers();
  }, [fetchUsers, session]);

  const filterByClient = <T extends { client?: string }>(items: T[]) =>
    isCliente && effectiveClientId ? items.filter((item) => item.client === effectiveClientId) : items;

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
    [inboundClient, outboundClient, slotsClient, dispatchedClient].forEach((list) => {
      list.forEach((item) => {
        if (item.autoId) ids.add(item.autoId);
      });
    });
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
    [alertasCount, despachadosCount, ingresosCount, movimientosCount, salidasCount],
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

    if (warehouseCapacity <= 0) {
      setMessage("Configura una capacidad mayor a 0 para esta bodega.");
      return;
    }

    const nextPosition = getNextIngresoPosition(inboundBoxes, warehouseCapacity);
    if (nextPosition > warehouseCapacity) {
      setMessage("No hay cupos disponibles en esta bodega.");
      return;
    }

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
    const effectiveSourceZone = destination === "a_salida" ? "bodega" : sourceZone;
    const effectiveSourcePosition = sourcePosition;

    if (role !== "jefe") {
      setMessage("Solo el jefe crea ordenes.");
      return;
    }
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

    if (destination === "a_bodega") {
      if (!targetPosition || !availableBodegaTargets.includes(targetPosition)) {
        setMessage("Selecciona una posicion libre en bodega.");
        return;
      }
      if (warehouseCapacity > 0 && targetPosition > warehouseCapacity) {
        setMessage("La posicion excede la capacidad de la bodega.");
        return;
      }
    } else {
      if (warehouseCapacity <= 0) {
        setMessage("Configura una capacidad mayor a 0 para usar esta bodega.");
        return;
      }
      const salidaPosition = getNextSalidaPosition(outboundBoxes, reservedSalidaTargets, warehouseCapacity);
      if (salidaPosition <= 0) {
        setMessage("Ingresa una posicion de salida valida.");
        return;
      }
    }

    const finalTargetPosition =
      destination === "a_salida"
        ? getNextSalidaPosition(outboundBoxes, reservedSalidaTargets, warehouseCapacity)
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
    const boxFromIngreso = inboundBoxes.find((item) => item.position === order.sourcePosition);
    const boxFromBodega = slots.find((item) => item.position === order.sourcePosition);
    const boxFromSalida = outboundBoxes.find((item) => item.position === order.sourcePosition);

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

      const boxAutoId = sourceIsBodega ? boxFromBodega?.autoId ?? "" : boxFromIngreso?.autoId ?? "";
      const boxName = sourceIsBodega ? boxFromBodega?.name ?? "" : boxFromIngreso?.name ?? "";
      const boxTemp = sourceIsBodega ? boxFromBodega?.temperature ?? 0 : boxFromIngreso?.temperature ?? 0;
      const boxClient = sourceIsBodega ? boxFromBodega?.client ?? "" : boxFromIngreso?.client ?? "";

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
      setInboundBoxes((prev) => prev.filter((item) => item.position !== order.sourcePosition));
    } else if (order.sourceZone === "salida") {
      setOutboundBoxes((prev) => prev.filter((item) => item.position !== order.sourcePosition));
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

      if (tempFixZone === "ingresos") {
        setInboundBoxes((prev) =>
          prev.map((box) => (box.position === tempFixPosition ? { ...box, temperature: parsedTemp } : box)),
        );
      } else if (tempFixZone === "salida") {
        setOutboundBoxes((prev) =>
          prev.map((box) => (box.position === tempFixPosition ? { ...box, temperature: parsedTemp } : box)),
        );
      } else {
        setSlots((prev) =>
          prev.map((slot) =>
            slot.position === tempFixPosition ? { ...slot, temperature: parsedTemp } : slot,
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
        {
          key: "configuracion",
          label: "Configuración",
          visible: isConfigurator,
        },
        { key: "alertas", label: "Gestion de alertas", visible: false },
        { key: "reportes", label: "Reportes", visible: isAdmin || isCliente },
      ].filter((tab) => tab.visible),
    [isAdmin, isCliente, isCustodio, isOperario, isJefe, canUseOrderForm, isConfigurator],
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

  const renderAdminLanding = () => {
    const cards: Array<{
      key: AdminSection;
      label: string;
      icon: React.ReactNode;
      helper: string;
      span?: string;
    }> = [
        {
          key: "compras",
          label: "Compras",
          icon: <FiShoppingCart className="h-6 w-6" />,
          helper: "Órdenes y abastecimiento",
          span: "sm:col-span-2",
        },
        {
          key: "transporte",
          label: "Transporte",
          icon: <FiTruck className="h-6 w-6" />,
          helper: "Rutas y entregas",
          span: "sm:col-span-2",
        },
        {
          key: "bodega_interna",
          label: "Bodega interna",
          icon: <FiHome className="h-6 w-6" />,
          helper: "Control de slots y movimientos",
        },
        {
          key: "bodega_externa",
          label: "Bodega externa",
          icon: <FiExternalLink className="h-6 w-6" />,
          helper: "Integraciones externas",
        },
      ];

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Panel administrador</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Selecciona un módulo</h2>
            <p className="mt-1 text-sm text-slate-600">
              Elige la operación que quieres gestionar. Bodega interna abre la vista completa de slots.
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => setAdminSection(card.key)}
              className={`group flex h-full flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-md ${card.span ?? ""}`.trim()}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  {card.icon}
                </span>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-900">{card.label}</p>
                  <p className="text-xs text-slate-500">{card.helper}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-emerald-600 opacity-0 transition group-hover:opacity-100">
                Abrir módulo →
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderAdminPlaceholder = (title: string, description: string) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Vista en preparación</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>

        {title === "Bodega externa" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="grid grid-cols-4 gap-0 border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>ID único</span>
              <span className="col-span-2">Descripción</span>
              <span className="text-right">Peso / Temp</span>
            </div>
            {[
              {
                id: "EXT-001",
                description: "Operador aliado zona norte",
                weight: "12.4 t",
                temperature: "4 °C",
              },
              {
                id: "EXT-002",
                description: "Túnel de frío externo",
                weight: "8.9 t",
                temperature: "2 °C",
              },
              {
                id: "EXT-003",
                description: "Bodega portuaria transitoria",
                weight: "15.2 t",
                temperature: "5 °C",
              },
            ].map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-4 gap-0 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0"
              >
                <span className="font-semibold text-slate-900">{row.id}</span>
                <span className="col-span-2 truncate text-slate-800">{row.description}</span>
                <div className="flex items-center justify-end gap-2 text-slate-700">
                  <span className="whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {row.weight}
                  </span>
                  <span className="whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {row.temperature}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAdminSection("menu")}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver al menú
          </button>
          <button
            type="button"
            onClick={() => setAdminSection("bodega_interna")}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ir a bodega interna
          </button>
        </div>
      </div>
    </section>
  );

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
    setSlots((prev) =>
      prev.map((slot) => (slot.position === position ? { ...slot, temperature: newTemp } : slot)),
    );
    setSelectedBoxModal((prev) =>
      prev && prev.position === position ? { ...prev, temperature: newTemp } : prev,
    );
    setMessage("Temperatura actualizada");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Header
          occupiedCount={occupiedCount}
          totalSlots={warehouseCapacity}
          dateLabel={dateLabel}
          warehouseId={warehouseId}
          warehouseName={warehouseName}
          warehouses={warehouses}
          onSelectWarehouse={handleSelectWarehouse}
          showIntro={!isOperario}
          showMeta={!isOperario}
          canSearch={canUseSearch}
          searchValue={searchId}
          onSearchChange={setSearchId}
          onSearchSubmit={handleSearch}
          userDisplayName={session?.displayName}
          onLogout={handleLogout}
          onGoMenu={() => {
            if (isAdmin) {
              setAdminSection("menu");
              return;
            }
            if (isCliente && activeTab === "reportes") {
              setReportesClienteMenuNonce((n) => n + 1);
            }
          }}
          role={role}
        />
        {showAdminMenu ? (
          <>
            {adminSection === "menu" ? renderAdminLanding() : null}
            {adminSection === "compras"
              ? renderAdminPlaceholder("Compras", "Administra adquisiciones, proveedores y órdenes de compra.")
              : null}
            {adminSection === "transporte"
              ? renderAdminPlaceholder("Transporte", "Coordina rutas, entregas y transporte de mercancía.")
              : null}
            {adminSection === "bodega_externa"
              ? renderAdminPlaceholder("Bodega externa", "Conecta y sincroniza con bodegas externas.")
              : null}
          </>
        ) : null}

        {showDashboard ? (
          <>
            {isAdmin ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[260px]">
                  <WarehouseSelector
                    role={role}
                    warehouseId={warehouseId}
                    warehouseName={warehouseName}
                    warehouses={warehouses}
                    onSelectWarehouse={handleSelectWarehouse}
                    onCreateWarehouse={handleCreateWarehouse}
                    isLoading={warehousesLoading}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAdminSection("menu")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Volver al menú de administrador
                </button>
              </div>
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
              />
            ) : null}

            {activeTab === "ingresos" ? (
              <IngresosSection
                isCustodio={isCustodio}
                canUseIngresoForm={canUseIngresoForm}
                slots={slots}
                orders={orders}
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
                createReturnOrder={createReturnOrder}
                sortByPosition={sortByPosition}
                handleDispatchBox={handleDispatchBox}
                availableBodegaTargets={availableBodegaTargets}
                isCliente={isCliente}
                clientFilterId={clientFilterId}
                clientCatalog={clients.map((client) => client.name)}
                onClientChange={setClientFilterId}
              />
            ) : null}

            {(activeTab === "ordenes" || isJefe) && canUseOrderForm ? (
              <OrdenesJefeSection
                isJefe={isJefe}
                inboundBoxes={inboundBoxes}
                outboundBoxes={outboundBoxes}
                slots={slots}
                alertasOperario={alertasOperario}
                alertasOperarioSolved={alertasOperarioSolved}
                onUpdateAlertasOperario={setAlertasOperario}
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
                llamadasJefe={llamadasJefe}
                onUpdateLlamadasJefe={setLlamadasJefe}
              />
            ) : null}

            {activeTab === "actividades" && isAdmin ? (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Gestion de alertas</h2>
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
                      <h2 className="text-lg font-semibold text-slate-900">Solicitudes pendientes</h2>
                      <p className="mt-1 text-sm text-slate-600">Vista consolidada para el administrador.</p>
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
                      slots={slots}
                      inboundBoxes={inboundBoxes}
                      outboundBoxes={outboundBoxes}
                      alertasOperario={alertasOperario}
                      alertasOperarioSolved={alertasOperarioSolved}
                      llamadasJefe={llamadasJefe}
                      onUpdateAlertasOperario={setAlertasOperario}
                      onUpdateAlertasOperarioSolved={setAlertasOperarioSolved}
                      onUpdateLlamadasJefe={setLlamadasJefe}
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
                  slots={slots}
                  inboundBoxes={inboundBoxes}
                  outboundBoxes={outboundBoxes}
                  alertasOperario={alertasOperario}
                  alertasOperarioSolved={alertasOperarioSolved}
                  llamadasJefe={llamadasJefe}
                  onUpdateAlertasOperario={setAlertasOperario}
                  onUpdateAlertasOperarioSolved={setAlertasOperarioSolved}
                  onUpdateLlamadasJefe={setLlamadasJefe}
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
                      <h2 className="text-lg font-semibold text-slate-900">Gestion de alertas</h2>
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
                menuResetNonce={isCliente ? reportesClienteMenuNonce : undefined}
              />
            ) : null}
          </>
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
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Alertas activas</h3>
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
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Tareas del jefe</h3>
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
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-blue-50/80 px-6 py-4 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${statusModal.kind === "alertas" ? "bg-red-100" : "bg-amber-100"}`}>
                    {statusModal.kind === "alertas" ? (
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
                        <p className="text-base font-semibold text-slate-900 truncate">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600 truncate">{item.description}</p>
                        {item.meta ? (
                          <p className="mt-2 text-xs font-semibold text-slate-500">{item.meta}</p>
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
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">{resolveModalAlert.title}</h3>
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