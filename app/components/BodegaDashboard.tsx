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
    username: "operario",
    password: "operario123",
    role: "operario",
    displayName: "Operario",
  },
];

import { useEffect, useMemo, useState } from "react";
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

const defaultStats: BodegaStats = {
  ingresos: 0,
  salidas: 0,
  movimientosBodega: 0,
};

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
  value === "custodio" || value === "administrador" || value === "operario";

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
    if (
      typeof id !== "string" ||
      (type !== "a_bodega" && type !== "a_salida") ||
      typeof createdAt !== "string" ||
      typeof createdBy !== "string"
    ) {
      return null;
    }

    const sourceZone: OrderSource =
      record.sourceZone === "bodega" ? "bodega" : "ingresos";
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

    orders.push({
      id,
      type,
      sourcePosition,
      sourceZone,
      targetPosition,
      createdAt,
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

const sortByPosition = <T extends { position: number }>(items: T[]) =>
  [...items].sort((a, b) => a.position - b.position);


export default function BodegaDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "bodega"
    | "ingresos"
    | "salida"
    | "ordenes"
    | "solicitudes"
    | "reportes"
  >("bodega");

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
  const [orders, setOrders] = useState<BodegaOrder[]>([]);
  const [stats, setStats] = useState<BodegaStats>(defaultStats);

  const [ingresoPosition, setIngresoPosition] = useState<number>(1);
  const [ingresoName, setIngresoName] = useState<string>("");
  const [ingresoTemp, setIngresoTemp] = useState<string>("");

  const [orderSourcePosition, setOrderSourcePosition] = useState<number>(1);
  const [orderSourceZone, setOrderSourceZone] =
    useState<OrderSource>("ingresos");
  const [orderDestination, setOrderDestination] =
    useState<OrderType>("a_bodega");
  const [orderTargetPosition, setOrderTargetPosition] = useState<number>(1);

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
    try {
      localStorage.setItem(OUTBOUND_STORAGE_KEY, JSON.stringify(outboundBoxes));
    } catch {
      // ignore storage errors
    }
  }, [outboundBoxes]);

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

  const reportData = useMemo(
    () => [
      { name: "Ingresos", value: stats.ingresos, fill: "#38bdf8" },
      { name: "Salidas", value: stats.salidas, fill: "#f97316" },
      {
        name: "Movimientos a bodega",
        value: stats.movimientosBodega,
        fill: "#22c55e",
      },
    ],
    [stats]
  );

  useEffect(() => {
    const sourceList =
      orderSourceZone === "bodega" ? bodegaBoxes : inboundBoxes;
    if (sourceList.length === 0) {
      setOrderSourcePosition(1);
      return;
    }
    if (!sourceList.some((box) => box.position === orderSourcePosition)) {
      setOrderSourcePosition(sourceList[0].position);
    }
  }, [bodegaBoxes, inboundBoxes, orderSourcePosition, orderSourceZone]);

  useEffect(() => {
    if (orderDestination !== "a_bodega") {
      return;
    }
    if (orderSourceZone !== "ingresos") {
      setOrderSourceZone("ingresos");
    }
    if (freeSlots.length === 0) {
      setOrderTargetPosition(1);
      return;
    }
    if (!freeSlots.includes(orderTargetPosition)) {
      setOrderTargetPosition(freeSlots[0]);
    }
  }, [freeSlots, orderDestination, orderSourceZone, orderTargetPosition]);

  // role ahora se deriva de session
  const role = session?.role ?? "custodio";
  const isAdmin = role === "administrador";
  const isOperario = role === "operario";
  const isCustodio = role === "custodio";

  const canSeeBodega = isAdmin || isOperario;
  const canUseIngresoForm = isCustodio;
  const canUseOrderForm = isAdmin;
  const canSeeOrders = isAdmin || isOperario;
  const canUseSearch = isAdmin || isOperario;

  useEffect(() => {
    if (role === "administrador" && orderDestination !== "a_bodega") {
      setOrderDestination("a_bodega");
      return;
    }
    if (role === "custodio" && orderDestination !== "a_salida") {
      setOrderDestination("a_salida");
    }
  }, [orderDestination, role]);

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

    if (ingresoPosition <= 0) {
      setMessage("Ingresa una posicion valida.");
      return;
    }

    if (inboundBoxes.some((box) => box.position === ingresoPosition)) {
      setMessage("La posicion de ingreso ya esta ocupada.");
      return;
    }

    const newBox: Box = {
      position: ingresoPosition,
      autoId: createAutoId("BOX"),
      name: ingresoName.trim(),
      temperature: parsedTemp,
    };

    setInboundBoxes((prev) => sortByPosition([newBox, ...prev]));
    setStats((prev) => ({ ...prev, ingresos: prev.ingresos + 1 }));
    setIngresoName("");
    setIngresoTemp("");
    setMessage(`Caja registrada en ingresos ${ingresoPosition}.`);
  };

  const handleCreateOrder = (destinationOverride?: OrderType) => {
    const destination = destinationOverride ?? orderDestination;

    if (role === "administrador") {
      if (destination !== "a_bodega") {
        setMessage("El administrador solo crea ordenes a bodega.");
        return;
      }
    } else if (role === "custodio") {
      if (destination !== "a_salida") {
        setMessage("El custodio solo crea ordenes de salida.");
        return;
      }
    } else {
      setMessage("Solo el administrador o el custodio crean ordenes.");
      return;
    }

    const sourceList =
      orderSourceZone === "bodega" ? bodegaBoxes : inboundBoxes;
    if (sourceList.length === 0) {
      setMessage("No hay cajas disponibles en el origen.");
      return;
    }

    const box = sourceList.find(
      (item) => item.position === orderSourcePosition
    );
    if (!box) {
      setMessage("Selecciona una caja valida.");
      return;
    }

    if (destination === "a_bodega") {
      if (!freeSlots.includes(orderTargetPosition)) {
        setMessage("Selecciona una posicion libre en bodega.");
        return;
      }
    } else {
      if (orderTargetPosition <= 0) {
        setMessage("Ingresa una posicion de salida valida.");
        return;
      }
      if (outboundBoxes.some((item) => item.position === orderTargetPosition)) {
        setMessage("La posicion de salida ya esta ocupada.");
        return;
      }
    }

    if (destination === "a_bodega" && orderSourceZone === "bodega") {
      setMessage("La orden a bodega debe salir de ingresos.");
      return;
    }

    const newOrder: BodegaOrder = {
      id: createOrderId(),
      type: destination,
      sourcePosition: box.position,
      sourceZone: orderSourceZone,
      targetPosition: orderTargetPosition,
      createdAt: new Date().toLocaleString("es-CO"),
      createdBy: role,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setMessage("Orden creada correctamente.");
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

    if (order.type === "a_bodega") {
      if (sourceIsBodega) {
        setMessage("La orden a bodega debe salir de ingresos.");
        return;
      }
      if (!boxFromIngreso) {
        setMessage("La caja ya no esta en ingresos.");
        return;
      }
      const target = order.targetPosition;
      const slot = slots.find((item) => item.position === target);
      if (!target || !slot) {
        setMessage("La posicion de bodega no es valida.");
        return;
      }
      if (slot.autoId.trim()) {
        setMessage("La posicion de bodega ya esta ocupada.");
        return;
      }
      setSlots((prev) =>
        prev.map((item) =>
          item.position === target
            ? {
                ...item,
                autoId: boxFromIngreso.autoId,
                name: boxFromIngreso.name,
                temperature: boxFromIngreso.temperature,
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

  const tabs = useMemo(
    () =>
      [
        { key: "bodega", label: "Bodega", visible: isAdmin },
        {
          key: "ingresos",
          label: "Ingresos",
          visible: isAdmin || isCustodio,
        },
        { key: "salida", label: "Salida", visible: isAdmin || isCustodio },
        {
          key: "ordenes",
          label: "Orden de trabajo",
          visible: canUseOrderForm,
        },
        {
          key: "solicitudes",
          label: "Solicitudes pendientes",
          visible: canSeeOrders || canUseSearch,
        },
        { key: "reportes", label: "Reportes", visible: isAdmin },
      ].filter((tab) => tab.visible),
    [isAdmin, isCustodio, canUseOrderForm, canSeeOrders, canUseSearch]
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab((tabs[0]?.key ?? "ingresos") as typeof activeTab);
    }
  }, [activeTab, tabs]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
        <main className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md" />
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
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

        {activeTab === "bodega" && isAdmin ? (
          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-4">
              <SlotsGrid
                slots={slots}
                selectedPosition={selectedPosition}
                onSelect={handleSelectSlot}
              />
              <SelectedSlotCard
                slot={selectedSlot}
                onClose={() => setSelectedPosition(null)}
                onSave={() => undefined}
                canEdit={false}
              />
            </div>
          </section>
        ) : null}

        {activeTab === "ingresos" ? (
          <section className="grid gap-4">
            {isAdmin || isCustodio ? (
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

            {canUseIngresoForm ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Ingreso de cajas
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Registra nuevas cajas en la zona de ingresos.
                </p>
                <div className="mt-4 grid gap-3">
                  <label className="text-sm font-medium text-slate-600">
                    Posicion de ingreso
                  </label>
                  <input
                    value={ingresoPosition}
                    onChange={(event) =>
                      setIngresoPosition(Number(event.target.value))
                    }
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
          </section>
        ) : null}

        {activeTab === "salida" && (isAdmin || isCustodio) ? (
          <section className="grid gap-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Zona de salida
                </h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {outboundBoxes.length} cajas
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Cajas despachadas por el operario.
              </p>
              <div className="mt-4 grid gap-3">
                {outboundBoxes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay cajas en salida.
                  </p>
                ) : (
                  sortByPosition(outboundBoxes).map((box) => (
                    <div
                      key={`salida-${box.position}`}
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
            {isCustodio ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Crear salida
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Define el origen y la posicion final para que el operario ejecute.
                </p>
                <div className="mt-4 grid gap-3">
                  <label className="text-sm font-medium text-slate-600">
                    Origen
                  </label>
                  <select
                    value={orderSourceZone}
                    onChange={(event) =>
                      setOrderSourceZone(event.target.value as OrderSource)
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="ingresos">Ingresos</option>
                    <option value="bodega">Bodega</option>
                  </select>
                  <label className="text-sm font-medium text-slate-600">
                    {orderSourceZone === "bodega"
                      ? "Caja en bodega"
                      : "Caja en ingresos"}
                  </label>
                  <select
                    value={orderSourcePosition}
                    onChange={(event) =>
                      setOrderSourcePosition(Number(event.target.value))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {orderSourceZone === "bodega"
                      ? bodegaBoxes.length === 0
                        ? (
                          <option value={1}>Sin cajas</option>
                        )
                        : sortByPosition(bodegaBoxes).map((box) => (
                          <option key={box.position} value={box.position}>
                            {`Bodega ${box.position} - ${box.name} (${box.autoId})`}
                          </option>
                        ))
                      : inboundBoxes.length === 0
                        ? (
                          <option value={1}>Sin cajas</option>
                        )
                        : sortByPosition(inboundBoxes).map((box) => (
                          <option key={box.position} value={box.position}>
                            {`Ingreso ${box.position} - ${box.name} (${box.autoId})`}
                          </option>
                        ))}
                  </select>
                  <label className="text-sm font-medium text-slate-600">
                    Posicion en salida
                  </label>
                  <input
                    value={orderTargetPosition}
                    onChange={(event) =>
                      setOrderTargetPosition(Number(event.target.value))
                    }
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateOrder("a_salida")}
                    className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Crear salida
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "ordenes" && canUseOrderForm ? (
          <section className="grid gap-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Orden de trabajo
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Selecciona una caja y el destino final.
              </p>
              <div className="mt-4 grid gap-3">
                <label className="text-sm font-medium text-slate-600">
                  Destino
                </label>
                <select
                  value={orderDestination}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm"
                >
                  <option value="a_bodega">Bodega</option>
                </select>
                <label className="text-sm font-medium text-slate-600">
                  {orderDestination === "a_salida" && orderSourceZone === "bodega"
                    ? "Caja en bodega"
                    : "Caja en ingresos"}
                </label>
                <select
                  value={orderSourcePosition}
                  onChange={(event) =>
                    setOrderSourcePosition(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {orderDestination === "a_salida" && orderSourceZone === "bodega"
                    ? bodegaBoxes.length === 0
                      ? (
                        <option value={1}>Sin cajas</option>
                      )
                      : sortByPosition(bodegaBoxes).map((box) => (
                        <option key={box.position} value={box.position}>
                          {`Bodega ${box.position} - ${box.name} (${box.autoId})`}
                        </option>
                      ))
                    : inboundBoxes.length === 0
                      ? (
                        <option value={1}>Sin cajas</option>
                      )
                      : sortByPosition(inboundBoxes).map((box) => (
                        <option key={box.position} value={box.position}>
                          {`Ingreso ${box.position} - ${box.name} (${box.autoId})`}
                        </option>
                      ))}
                </select>
                {orderDestination === "a_bodega" ? (
                  <>
                    <label className="text-sm font-medium text-slate-600">
                      Posicion en bodega
                    </label>
                    <select
                      value={orderTargetPosition}
                      onChange={(event) =>
                        setOrderTargetPosition(Number(event.target.value))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {freeSlots.length === 0 ? (
                        <option value={1}>Sin posiciones libres</option>
                      ) : (
                        freeSlots.map((position) => (
                          <option key={position} value={position}>
                            {position}
                          </option>
                        ))
                      )}
                    </select>
                  </>
                ) : (
                  <>
                    <label className="text-sm font-medium text-slate-600">
                      Posicion en salida
                    </label>
                    <input
                      value={orderTargetPosition}
                      onChange={(event) =>
                        setOrderTargetPosition(Number(event.target.value))
                      }
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleCreateOrder()}
                  className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Crear orden
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "solicitudes" ? (
          <section className="grid gap-4">
            {canSeeOrders ? (
              <RequestsQueue
                requests={orders}
                canExecute={isOperario}
                onExecute={executeOrder}
              />
            ) : null}
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

        <MessageBanner message={message} />
      </main>
    </div>
  );
}
