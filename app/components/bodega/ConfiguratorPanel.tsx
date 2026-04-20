"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiUsers,
  FiUserCheck,
  FiHome,
  FiExternalLink,
  FiPlus,
  FiEdit2,
  FiArrowRight,
  FiArrowLeft,
  FiTrash2,
  FiCheck,
  FiRefreshCw,
  FiLayers,
  FiMapPin,
  FiClipboard,
  FiAlertCircle,
  FiBox,
  FiCalendar,
  FiPackage,
  FiPhoneCall,
  FiUser,
} from "react-icons/fi";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import type { Client, ConfigUser, Role, WarehouseMeta } from "../../interfaces/bodega";
import { MdOutlineAutorenew } from "react-icons/md";
import { SolicitudIntegracionService } from "@/app/services/solicitudIntegracionService";
import {
  etiquetasTipoIntegracionRow,
  type SolicitudIntegracion,
} from "@/app/types/solicitudIntegracion";


type Props = {
  warehouses: WarehouseMeta[];
  warehousesLoading: boolean;
  warehouseSaving: boolean;
  fetchWarehouses: () => Promise<void>;
  newWarehouseName: string;
  setNewWarehouseName: Dispatch<SetStateAction<string>>;
  newWarehouseCapacity: string;
  setNewWarehouseCapacity: Dispatch<SetStateAction<string>>;
  handleCreateWarehouse: (payload: { status: "interna" | "externa" }) => Promise<void>;
  handleUpdateWarehouse: (
    warehouseId: string,
    payload: { name: string; capacity: number; status?: "interna" | "externa" },
  ) => Promise<void>;
  toggleWarehouseDisabled: (warehouseId: string, disabled: boolean) => Promise<void>;
  newClientName: string;
  newClientCode: string;
  setNewClientName: Dispatch<SetStateAction<string>>;
  setNewClientCode: Dispatch<SetStateAction<string>>;
  clientSaving: boolean;
  clientsLoading: boolean;
  handleCreateClient: () => Promise<void>;
  fetchClients: () => Promise<void>;
  clients: Client[];
  toggleClientDisabled: (clientId: string, disabled: boolean) => Promise<void>;
  handleUpdateClient: (clientId: string, payload: { name: string; code: string }) => Promise<void>;
  fetchUsers: () => Promise<void>;
  users: ConfigUser[];
  newUserName: string;
  setNewUserName: Dispatch<SetStateAction<string>>;
  newUserCode: string;
  setNewUserCode: Dispatch<SetStateAction<string>>;
  newUserRole: Role;
  setNewUserRole: Dispatch<SetStateAction<Role>>;
  newUserClientId: string;
  setNewUserClientId: Dispatch<SetStateAction<string>>;
  newUserEmail: string;
  setNewUserEmail: Dispatch<SetStateAction<string>>;
  newUserPassword: string;
  setNewUserPassword: Dispatch<SetStateAction<string>>;
  usersLoading: boolean;
  userSaving: boolean;
  handleCreateUser: () => Promise<void>;
  toggleUserDisabled: (userId: string, disabled: boolean) => Promise<void>;
  handleUpdateUser: (userId: string, payload: { name: string; role: Role; clientId: string }) => Promise<void>;
  /** Pulso desde el botón Menú del header: vuelve a la pantalla principal (Creación / Creación y asignación / Integración). */
  menuResetNonce?: number;
};

export default function ConfiguratorPanel({
  warehouses,
  warehousesLoading,
  warehouseSaving,
  fetchWarehouses,
  newWarehouseName,
  setNewWarehouseName,
  newWarehouseCapacity,
  setNewWarehouseCapacity,
  handleCreateWarehouse,
  handleUpdateWarehouse,
  toggleWarehouseDisabled,
  newClientName,
  newClientCode,
  setNewClientName,
  setNewClientCode,
  clientSaving,
  clientsLoading,
  handleCreateClient,
  fetchClients,
  clients,
  toggleClientDisabled,
  handleUpdateClient,
  fetchUsers,
  users,
  newUserName,
  setNewUserName,
  newUserCode,
  setNewUserCode,
  newUserRole,
  setNewUserRole,
  newUserClientId,
  setNewUserClientId,
  newUserEmail,
  setNewUserEmail,
  newUserPassword,
  setNewUserPassword,
  usersLoading,
  userSaving,
  handleCreateUser,
  toggleUserDisabled,
  handleUpdateUser,
  menuResetNonce,
}: Props) {
  type ConfiguratorView =
    | "main"
    | "creacion"
    | "asignacion"
    | "tareasPendiente"
    | "clientes"
    | "usuarios"
    | "bodegaInterna"
    | "bodegaExterna";

  const [view, setView] = useState<ConfiguratorView>("main");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editUser, setEditUser] = useState<ConfigUser | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState<Role>("operario");
  const [editUserClientId, setEditUserClientId] = useState("");
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [showCreateWarehouseModal, setShowCreateWarehouseModal] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<WarehouseMeta | null>(null);
  const [editWarehouseName, setEditWarehouseName] = useState("");
  const [editWarehouseCapacity, setEditWarehouseCapacity] = useState<string>("");
  const [editWarehouseSaving, setEditWarehouseSaving] = useState(false);
  const [createWarehouseStatus, setCreateWarehouseStatus] = useState<"interna" | "externa">("interna");
  const [editWarehouseStatus, setEditWarehouseStatus] = useState<"interna" | "externa">("interna");
  const [solicitudesIntegracionCola, setSolicitudesIntegracionCola] = useState<SolicitudIntegracion[]>([]);
  const [integracionLoading, setIntegracionLoading] = useState(false);
  const [integracionError, setIntegracionError] = useState<string | null>(null);
  const [integracionEjecutandoId, setIntegracionEjecutandoId] = useState<string | null>(null);

  const normalizeBase36 = (value: string) => value.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const ensureFiveClientCode = (value: string) => {
    const normalized = normalizeBase36(value);
    if (!normalized) return "";
    return normalized.padEnd(5, "0").slice(0, 5);
  };

  const roleClientDefaults: Record<Role, string> = {
    configurador: "",
    administrador: "bodega",
    operario: "bodega",
    procesador: "bodega",
    jefe: "bodega",
    cliente: "",
    custodio: "bodega",
    operadorCuentas: "",
    transporte: "",
  };

  const roleLabels: Record<Role, string> = {
    custodio: "custodio",
    administrador: "administrador",
    operario: "operario",
    procesador: "procesador",
    jefe: "jefe",
    cliente: "administrador de cuentas",
    configurador: "configurador",
    operadorCuentas: "operador de cuentas",
    transporte: "transporte (entregas venta)",
  };

  const warehouseNameByAccountCode = useMemo(() => {
    const map = new Map<string, string>();
    warehouses.forEach((warehouse) => {
      const code = warehouse.codeCuenta?.trim();
      if (code) {
        map.set(ensureFiveClientCode(code), warehouse.name ?? "");
      }
    });
    return map;
  }, [warehouses]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => {
      if (client.id) {
        map.set(client.id, client.name ?? "");
      }
    });
    return map;
  }, [clients]);

  const clientNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => {
      const code = ensureFiveClientCode(client.code ?? "");
      if (code) {
        map.set(code, client.name ?? "");
      }
    });
    return map;
  }, [clients]);

  useEffect(() => {
    if (showCreateUserModal) {
      setNewUserClientId(roleClientDefaults[newUserRole] ?? "");
    }
  }, [newUserRole, showCreateUserModal, setNewUserClientId]);

  const prevMenuNonce = useRef<number | null>(null);
  useEffect(() => {
    if (menuResetNonce === undefined) return;
    if (prevMenuNonce.current === null) {
      prevMenuNonce.current = menuResetNonce;
      return;
    }
    if (prevMenuNonce.current === menuResetNonce) return;
    prevMenuNonce.current = menuResetNonce;
    setView("main");
    setShowCreateModal(false);
    setShowCreateUserModal(false);
    setShowCreateWarehouseModal(false);
    setEditClient(null);
    setEditUser(null);
    setEditWarehouse(null);
  }, [menuResetNonce]);

  useEffect(() => {
    if (view !== "tareasPendiente") return;
    setIntegracionLoading(true);
    setIntegracionError(null);
    const clientIds = clients.map((c) => c.id);
    const unsub = SolicitudIntegracionService.subscribePendientesConfigurador(
      clientIds,
      (items) => {
        setSolicitudesIntegracionCola(items);
        setIntegracionLoading(false);
        setIntegracionError(null);
      },
      (err) => {
        console.error(err);
        setSolicitudesIntegracionCola([]);
        setIntegracionError(
          "No se pudieron cargar las solicitudes. Revisá permisos en clientes/{id}/solicitudesIntegracion.",
        );
        setIntegracionLoading(false);
      },
    );
    return () => unsub();
  }, [view, clients]);

  const formatIntegracionFecha = (s: SolicitudIntegracion) => {
    const ts = s.createdAt;
    if (!ts || typeof ts.toDate !== "function") return "—";
    try {
      return ts.toDate().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "—";
    }
  };

  const solicitudesIntegracionOrdenadas = useMemo(() => {
    return [...solicitudesIntegracionCola].sort((a, b) => {
      const ma =
        a.createdAt && typeof a.createdAt.toMillis === "function" ? a.createdAt.toMillis() : 0;
      const mb =
        b.createdAt && typeof b.createdAt.toMillis === "function" ? b.createdAt.toMillis() : 0;
      return ma - mb;
    });
  }, [solicitudesIntegracionCola]);

  const proximaSolicitudIntegracion = solicitudesIntegracionOrdenadas[0];

  const handleIntegracionExecute = (event: MouseEvent<HTMLButtonElement>) => {
    const s = proximaSolicitudIntegracion;
    if (!s || integracionEjecutandoId) return;
    setIntegracionError(null);
    const btn = event.currentTarget;
    btn.classList.add("zoom-out");
    window.setTimeout(() => {
      btn.classList.remove("zoom-out");
      setIntegracionEjecutandoId(s.id);
      void SolicitudIntegracionService.ejecutarSolicitudConfigurador(s.clientId, s.id)
        .catch((err) => {
          console.error(err);
          setIntegracionError("No se pudo completar la solicitud. Reintentá.");
        })
        .finally(() => {
          setIntegracionEjecutandoId(null);
        });
    }, 180);
  };

  const internalWarehouses = warehouses.filter((warehouse) => warehouse.status !== "externa");
  const externalWarehouses = warehouses.filter((warehouse) => warehouse.status === "externa");

  const renderClientes = () => (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Cuentas</p>
            <p className="text-xs text-slate-500">Código, nombre y acciones.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">Total: {clients.length}</span>
            <button
              type="button"
              onClick={fetchClients}
              disabled={clientsLoading || clientSaving}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <FiRefreshCw className={`h-4 w-4 ${clientsLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <FiPlus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Código
                </th>
                <th className="min-w-[10rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Nombre
                </th>
                <th className="min-w-[10rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Bodega asignada
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Credenciales
                </th>
                <th className="min-w-[8rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {clientsLoading && !clients.length ? (
                <>
                  {[1, 2, 3].map((item) => (
                    <tr key={item} className="border-b border-slate-100">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-10 animate-pulse rounded-md bg-slate-100" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : clients.length ? (
                clients.map((client) => {
                  const hasCreds = users.some((user) => user.clientId === client.id && user.email?.trim());
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-slate-100 transition-colors hover:bg-violet-50/80"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-semibold text-slate-900">
                        {client.code}
                      </td>
                      <td className="max-w-[14rem] px-4 py-3 text-[13px] font-medium text-slate-800">
                        <span className={client.disabled ? "text-slate-400" : ""}>{client.name}</span>
                      </td>
                      <td
                        className="max-w-[12rem] px-4 py-3 text-[13px] text-slate-800"
                        title={
                          warehouseNameByAccountCode.get(ensureFiveClientCode(client.code ?? "")) ??
                          undefined
                        }
                      >
                        <span className="line-clamp-2">
                          {warehouseNameByAccountCode.get(ensureFiveClientCode(client.code ?? "")) ??
                            "Sin asignar"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            hasCreds ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {hasCreds ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditClient(client);
                            setEditName(client.name);
                            setEditCode(client.code);
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/80 transition hover:bg-sky-100"
                        >
                          <FiEdit2 className="h-4 w-4" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Aún no hay clientes creados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderWarehouses = (
    list: WarehouseMeta[],
    title: string,
    subtitle: string,
    statusKey: "interna" | "externa",
  ) => (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">Total: {list.length}</span>
            <button
              type="button"
              onClick={fetchWarehouses}
              disabled={warehousesLoading || warehouseSaving}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <FiRefreshCw className={`h-4 w-4 ${warehousesLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateWarehouseStatus(statusKey);
                setShowCreateWarehouseModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <FiPlus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="min-w-[12rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Nombre
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Capacidad
                </th>
                <th className="min-w-[11rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Bodega asignada
                </th>
                <th className="min-w-[8rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {warehousesLoading && !list.length ? (
                <>
                  {[1, 2, 3].map((item) => (
                    <tr key={item} className="border-b border-slate-100">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="h-10 animate-pulse rounded-md bg-slate-100" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : list.length ? (
                list.map((warehouse) => {
                  const shortId =
                    warehouse.id.length > 12
                      ? `${warehouse.id.slice(0, 6)}...${warehouse.id.slice(-3)}`
                      : warehouse.id;
                  const capacityLabel =
                    typeof warehouse.capacity === "number" && Number.isFinite(warehouse.capacity)
                      ? warehouse.capacity
                      : "—";
                  const effectiveStatus = warehouse.status === "externa" ? "externa" : "interna";
                  const normalizedCode = ensureFiveClientCode(warehouse.codeCuenta ?? "");
                  const assignedLabel = normalizedCode ? clientNameByCode.get(normalizedCode) : undefined;
                  const assignedDisplay = assignedLabel ?? (normalizedCode || "Sin asignar");
                  return (
                    <tr
                      key={warehouse.id}
                      className="border-b border-slate-100 transition-colors hover:bg-violet-50/80"
                    >
                      <td className="max-w-[16rem] px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-[13px] font-semibold text-slate-900 ${warehouse.disabled ? "text-slate-400" : ""}`}
                          >
                            {warehouse.name || "Sin nombre"}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">{shortId}</span>
                          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                            {effectiveStatus === "externa" ? "Externa" : "Interna"}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] font-semibold tabular-nums text-slate-800">
                        {capacityLabel}
                      </td>
                      <td className="max-w-[14rem] px-4 py-3 text-[13px] text-slate-800" title={assignedDisplay}>
                        <div className="flex flex-col gap-0.5">
                          <span className="line-clamp-2">{assignedDisplay}</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {normalizedCode || "Sin código"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditWarehouse(warehouse);
                            setEditWarehouseName(warehouse.name ?? "");
                            setEditWarehouseCapacity(
                              typeof warehouse.capacity === "number" && Number.isFinite(warehouse.capacity)
                                ? warehouse.capacity.toString()
                                : "",
                            );
                            setEditWarehouseStatus(effectiveStatus);
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/80 transition hover:bg-sky-100"
                        >
                          <FiEdit2 className="h-4 w-4" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Aún no hay bodegas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

      const renderUsuarios = () => (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Usuarios</p>
                <p className="text-xs text-slate-500">ID, rol, nombre, cliente y acciones.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-600">Total: {users.length}</span>
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={usersLoading || userSaving}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <FiRefreshCw className={`h-4 w-4 ${usersLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <FiPlus className="h-4 w-4" />
                  Agregar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Código
                    </th>
                    <th className="min-w-[8rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Rol
                    </th>
                    <th className="min-w-[10rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Nombre
                    </th>
                    <th className="min-w-[10rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Cuenta
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Credenciales
                    </th>
                    <th className="min-w-[8rem] px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-slate-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading && !users.length ? (
                    <>
                      {[1, 2, 3].map((item) => (
                        <tr key={item} className="border-b border-slate-100">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="h-10 animate-pulse rounded-md bg-slate-100" />
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : users.length ? (
                    users.map((user, index) => {
                      const hasCredentials = Boolean(user.email?.trim());
                      const shortId =
                        user.id.length > 12 ? `${user.id.slice(0, 6)}...${user.id.slice(-3)}` : user.id;
                      const code = ensureFiveClientCode(user.code ?? shortId);
                      return (
                        <tr
                          key={`${user.id}-${index}`}
                          className="border-b border-slate-100 transition-colors hover:bg-violet-50/80"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-semibold text-slate-900">
                            {code}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex max-w-full truncate rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                              {roleLabels[user.role] ?? user.role}
                            </span>
                          </td>
                          <td className="max-w-[14rem] px-4 py-3 text-[13px] font-medium text-slate-800">
                            <span className={user.disabled ? "text-slate-400" : ""}>{user.name}</span>
                          </td>
                          <td
                            className="max-w-[12rem] px-4 py-3 text-[13px] text-slate-800"
                            title={
                              user.clientId
                                ? (clientNameById.get(user.clientId) ?? user.clientId)
                                : undefined
                            }
                          >
                            <span className="line-clamp-2">
                              {user.clientId ? clientNameById.get(user.clientId) ?? user.clientId : "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                hasCredentials
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {hasCredentials ? "Sí" : "No"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditUser(user);
                                  setEditUserName(user.name);
                                  setEditUserRole(user.role);
                                  setEditUserClientId(user.clientId ?? "");
                                }}
                                className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/80 transition hover:bg-sky-100"
                              >
                                <FiEdit2 className="h-4 w-4" />
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        Aún no hay usuarios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );

  const configLandingLabel = "text-[#1A2B48]";
  const configLandingTile =
    "group flex min-h-[200px] flex-col items-center justify-center gap-5 rounded-[24px] px-6 py-8 text-center outline-none transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#1A2B48]/25 focus-visible:ring-offset-2 sm:min-h-0 sm:aspect-square sm:p-8";
  const configLandingIconWrap =
    "flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-[0_2px_14px_rgba(26,43,72,0.08)] ring-1 ring-[#1A2B48]/[0.06] backdrop-blur-[2px] transition-transform duration-300 group-hover:scale-[1.04]";

  const isMainOrHubPadding =
    view === "main" || view === "creacion" || view === "asignacion" || view === "tareasPendiente";
  const isLeafView =
    view === "clientes" || view === "usuarios" || view === "bodegaInterna" || view === "bodegaExterna";

  const handleConfiguratorBack = () => {
    if (view === "clientes" || view === "bodegaInterna" || view === "bodegaExterna") {
      setView("creacion");
      return;
    }
    if (view === "usuarios") {
      setView("asignacion");
      return;
    }
    setView("main");
  };

  return (
    <section
      className={
        isMainOrHubPadding
          ? "p-4 sm:p-8"
          : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      }
    >
      {view !== "main" ? (
        <div className="mb-6 space-y-3">
          <button
            type="button"
            onClick={handleConfiguratorBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            <FiArrowLeft className="h-4 w-4" aria-hidden />
            Volver
          </button>
          {isLeafView ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Configuración</p>
              <h2 className="text-lg font-semibold text-slate-900">Panel de configurador</h2>
              <p className="text-sm text-slate-600">
                Usá el botón Menú del encabezado para volver al inicio del configurador.
              </p>
            </>
          ) : view === "creacion" ? (
            <h2 className="text-lg font-semibold text-slate-900">Creación</h2>
          ) : view === "asignacion" ? (
            <h2 className="text-lg font-semibold text-slate-900">Creación y asignación</h2>
          ) : view === "tareasPendiente" ? (
            <h2 className="text-lg font-semibold text-slate-900">Integración</h2>
          ) : null}
        </div>
      ) : null}

      {view === "main" ? (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {(
            [
              {
                key: "creacion" as const,
                label: "Creación",
                bg: "#C2E3CD",
                shadowClass:
                  "shadow-[0_14px_40px_-10px_rgba(0,109,62,0.28)] hover:shadow-[0_20px_48px_-12px_rgba(0,109,62,0.32)]",
                icon: <FiLayers size={38} className="text-[#006D3E]" aria-hidden />,
              },
              {
                key: "asignacion" as const,
                label: "Creación y asignación",
                bg: "#FEF6CD",
                shadowClass:
                  "shadow-[0_14px_40px_-10px_rgba(133,91,17,0.28)] hover:shadow-[0_20px_48px_-12px_rgba(133,91,17,0.3)]",
                icon: <FiUserCheck size={38} className="text-[#855B11]" aria-hidden />,
              },
              {
                key: "tareasPendiente" as const,
                label: "Integración",
                bg: "#E2E8F0",
                shadowClass:
                  "shadow-[0_14px_40px_-10px_rgba(51,65,85,0.22)] hover:shadow-[0_20px_48px_-12px_rgba(51,65,85,0.28)]",
                icon: <FiClipboard size={38} className="text-[#334155]" aria-hidden />,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              style={{ backgroundColor: item.bg }}
              className={`${configLandingTile} transition-shadow duration-300 ${item.shadowClass}`}
            >
              <span className={configLandingIconWrap}>{item.icon}</span>
              <span
                className={`max-w-[13rem] text-lg font-bold leading-snug tracking-tight sm:text-xl ${configLandingLabel}`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {view === "creacion" ? (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {(
            [
              {
                key: "clientes" as const,
                label: "Cuentas",
                bg: "#C2E3CD",
                shadowClass:
                  "shadow-[0_14px_40px_-10px_rgba(0,109,62,0.28)] hover:shadow-[0_20px_48px_-12px_rgba(0,109,62,0.32)]",
                icon: <FiUsers size={38} className="text-[#006D3E]" aria-hidden />,
              },
              {
                key: "bodegaInterna" as const,
                label: "Bodega interna",
                bg: "#D2E0FB",
                shadowClass:
                  "shadow-[0_14px_40px_-10px_rgba(0,71,171,0.26)] hover:shadow-[0_20px_48px_-12px_rgba(0,71,171,0.3)]",
                icon: <FiHome size={38} className="text-[#0047AB]" aria-hidden />,
              },
              {
                key: "bodegaExterna" as const,
                label: "Bodega externa",
                bg: "#E3D2F1",
                shadowClass:
                  "shadow-[0_14px_40px_-10px_rgba(106,13,173,0.26)] hover:shadow-[0_20px_48px_-12px_rgba(106,13,173,0.3)]",
                icon: <FiExternalLink size={38} className="text-[#6A0DAD]" aria-hidden />,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              style={{ backgroundColor: item.bg }}
              className={`${configLandingTile} transition-shadow duration-300 ${item.shadowClass}`}
            >
              <span className={configLandingIconWrap}>{item.icon}</span>
              <span
                className={`max-w-[13rem] text-lg font-bold leading-snug tracking-tight sm:text-xl ${configLandingLabel}`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {view === "asignacion" ? (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:max-w-md">
          <button
            type="button"
            onClick={() => setView("usuarios")}
            style={{ backgroundColor: "#FEF6CD" }}
            className={`${configLandingTile} transition-shadow duration-300 shadow-[0_14px_40px_-10px_rgba(133,91,17,0.28)] hover:shadow-[0_20px_48px_-12px_rgba(133,91,17,0.3)]`}
          >
            <span className={configLandingIconWrap}>
              <FiUserCheck size={38} className="text-[#855B11]" aria-hidden />
            </span>
            <span
              className={`max-w-[13rem] text-lg font-bold leading-snug tracking-tight sm:text-xl ${configLandingLabel}`}
            >
              Usuarios
            </span>
          </button>
        </div>
      ) : null}

      {view === "tareasPendiente" ? (
        <div className="mx-auto w-full max-w-5xl">
          <p className="mb-4 text-center text-xs text-slate-500 sm:text-left">
            Las <strong>solicitudes de integración</strong> que envía el operador desde Reportes → Bodega externa →
            Integración aparecen aquí mientras están <strong>Activas</strong>. Al tocá la tarjeta y ejecutar la tarea, el
            estado pasa a <strong>Finalizado</strong> en Firestore y la tabla del operador se actualiza sola.
          </p>
          {integracionError ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
              {integracionError}
            </p>
          ) : integracionLoading ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
              Cargando solicitudes…
            </p>
          ) : (
            <button
              type="button"
              disabled={!proximaSolicitudIntegracion || !!integracionEjecutandoId}
              onClick={handleIntegracionExecute}
              className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm w-full border border-emerald-200 transition-transform duration-150 hover:shadow-lg focus:shadow-lg active:shadow-lg hover:scale-[0.98] active:scale-[0.95] text-left disabled:hover:scale-100 disabled:active:scale-100 disabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-95"
              style={{ outline: "none" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pointer-events-none">
                <span className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-lg flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                  <FiBox className="w-5 h-5" aria-hidden />
                  Integración
                </span>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
                  <span className="px-4 py-1 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-700 font-semibold text-base flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                    <FiAlertCircle className="w-5 h-5" aria-hidden />
                    {integracionEjecutandoId ? "Guardando…" : "Pendiente"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-base border border-emerald-200 w-full sm:w-auto text-center">
                    {solicitudesIntegracionOrdenadas.length} solicitudes
                  </span>
                </div>
              </div>
              {!proximaSolicitudIntegracion ? (
                <div className="flex min-h-88 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-center pointer-events-none">
                  <p className="text-2xl font-semibold text-slate-700">No hay solicitudes pendientes.</p>
                </div>
              ) : (
                <div className="rounded-2xl p-4 sm:p-8 pointer-events-none">
                  <div className="flex flex-col items-center">
                    <span className="text-slate-500 font-semibold text-lg mb-4">
                      Solicitud de integración · tocá para ejecutar y cerrar (queda Finalizado en la cuenta)
                    </span>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full">
                      <div className="flex flex-col items-center rounded-2xl px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-64 max-w-md border bg-blue-50 border-blue-200">
                        <FiMapPin className="w-8 h-8 mb-2 text-blue-500" aria-hidden />
                        <span className="text-xs mb-1 text-blue-500">CUENTA</span>
                        <span className="text-2xl font-bold text-blue-700 text-center leading-tight break-words max-w-full">
                          {proximaSolicitudIntegracion.clientName?.trim() ||
                            proximaSolicitudIntegracion.clientId ||
                            "—"}
                        </span>
                      </div>
                      <FiArrowRight className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 shrink-0" aria-hidden />
                      <div className="flex flex-col items-center rounded-2xl px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-64 max-w-md border bg-yellow-50 border-yellow-200">
                        <FiClipboard className="w-8 h-8 mb-2 text-yellow-600" aria-hidden />
                        <span className="text-xs mb-1 text-yellow-600">BODEGA EXTERNA</span>
                        <span className="text-xl font-bold text-yellow-800 text-center leading-snug break-words max-w-full">
                          {proximaSolicitudIntegracion.bodegaExternaNombre?.trim() || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 w-full max-w-2xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700">
                      <span className="font-semibold text-slate-600">Tipo: </span>
                      {etiquetasTipoIntegracionRow(proximaSolicitudIntegracion)}
                    </div>
                    <hr className="my-8 border-slate-200 w-full" />
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-8 w-full mb-2">
                      <div className="flex items-center gap-1 sm:gap-2 text-center sm:text-left">
                        <FiUser className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
                        <span className="text-xs text-slate-500">Solicitado por</span>
                        <span className="font-semibold text-slate-700">
                          {proximaSolicitudIntegracion.creadoPorNombre || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-center sm:text-left">
                        <FiCalendar className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
                        <span className="text-xs text-slate-500">Fecha y hora</span>
                        <span className="font-semibold text-slate-700">
                          {formatIntegracionFecha(proximaSolicitudIntegracion)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-center sm:text-left max-w-full">
                        <FiPackage className="w-5 h-5 text-slate-400 shrink-0" aria-hidden />
                        <span className="text-xs text-slate-500">ID de solicitud</span>
                        <span className="font-semibold text-slate-700 break-all text-left">
                          {proximaSolicitudIntegracion.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </button>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold text-lg py-4 shadow transition-all border-2 border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-80 focus:outline-none focus:ring-2 focus:ring-slate-300"
              style={{ minWidth: 0 }}
              title="No disponible en integración"
            >
              <FiAlertCircle className="w-6 h-6 shrink-0" aria-hidden />
              Alertas
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-yellow-100 text-yellow-600 font-bold text-lg py-4 shadow transition-all border-2 border-yellow-200 cursor-not-allowed opacity-70 focus:outline-none focus:ring-2 focus:ring-yellow-200"
              style={{ minWidth: 0 }}
              title="No disponible en integración"
            >
              <FiPhoneCall className="w-6 h-6 shrink-0" aria-hidden />
              Llamar
            </button>
          </div>
        </div>
      ) : null}

      {view === "clientes" ? (
        <div className="mt-6 space-y-6">
          {renderClientes()}
        </div>
      ) : null}

      {view === "usuarios" ? (
        <div className="mt-6 space-y-6">
          {renderUsuarios()}
        </div>
      ) : null}

      {view === "bodegaInterna" ? (
        <div className="mt-6 space-y-6">
          {renderWarehouses(internalWarehouses, "Bodegas internas", "Nombre, capacidad y acciones.", "interna")}
        </div>
      ) : null}

      {view === "bodegaExterna" ? (
        <div className="mt-6 space-y-6">
          {renderWarehouses(externalWarehouses, "Bodegas externas", "Nombre, capacidad y acciones.", "externa")}
        </div>
      ) : null}

      {showCreateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Nueva cuenta</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Crear cuenta</h3>
                <p className="mt-1 text-sm text-slate-600">Completa los campos para registrar una cuenta.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">ID automático</label>
                <input
                  value="Se genera al guardar"
                  disabled
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(event) => setNewClientName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Nombre de la cuenta"
                  disabled={clientSaving || clientsLoading}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Código</label>
                <input
                  type="text"
                  value={newClientCode}
                  onChange={(event) => setNewClientCode(ensureFiveClientCode(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Código generado"
                  disabled={clientSaving || clientsLoading}
                />
                <p className="mt-1 text-xs text-slate-500">Se genera al escribir el nombre (base 36, 5 caracteres); puedes ajustarlo si lo necesitas.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleCreateClient();
                  setShowCreateModal(false);
                }}
                disabled={clientSaving || !newClientName.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {clientSaving ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateUserModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreateUserModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Nuevo usuario</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Crear usuario</h3>
                <p className="mt-1 text-sm text-slate-600">ID se genera al guardar.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">ID único</label>
                <input
                  value="Se genera al guardar"
                  disabled
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Código</label>
                <input
                  type="text"
                  value={newUserCode}
                  onChange={(event) => setNewUserCode(ensureFiveClientCode(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Código base 36 (5 caracteres)"
                  disabled={userSaving || usersLoading}
                />
                <p className="mt-1 text-xs text-slate-500">Se genera igual que las cuentas (base 36, 5 caracteres).</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(event) => setNewUserName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Nombre del usuario"
                  disabled={userSaving || usersLoading}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Rol</label>
                <select
                  value={newUserRole}
                  onChange={(event) => {
                    const role = event.target.value as Role;
                    setNewUserRole(role);
                    setNewUserClientId(roleClientDefaults[role] ?? "");
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  disabled={userSaving || usersLoading}
                >
                  {[
                    "custodio",
                    "administrador",
                    "operario",
                    "procesador",
                    "jefe",
                    "cliente",
                    "configurador",
                    "operadorCuentas",
                    "transporte",
                  ].map((role) => (
                    <option key={role} value={role}>{roleLabels[role as Role] ?? role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Asignado</label>
                {newUserRole === "cliente" ? (
                  <select
                    value={newUserClientId}
                    onChange={(event) => setNewUserClientId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    disabled={userSaving || usersLoading}
                  >
                    <option value="">Selecciona una cuenta</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newUserClientId}
                    readOnly
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                    placeholder="Se autocompleta según rol"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Correo</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(event) => setNewUserEmail(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="correo@ejemplo.com"
                  disabled={userSaving || usersLoading}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Clave</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(event) => setNewUserPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="********"
                  disabled={userSaving || usersLoading}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleCreateUser();
                  setShowCreateUserModal(false);
                }}
                disabled={
                  userSaving ||
                  !newUserName.trim() ||
                  !newUserEmail.trim() ||
                  !newUserPassword.trim() ||
                  !newUserCode.trim()
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {userSaving ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateWarehouseModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreateWarehouseModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Nueva bodega</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Crear bodega</h3>
                <p className="mt-1 text-sm text-slate-600">ID se genera al guardar.</p>
                <p className="mt-2 inline-flex rounded-full bg-[#f1f5f9] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#334155]">
                  {createWarehouseStatus === "externa" ? "Bodega externa" : "Bodega interna"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateWarehouseModal(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">ID único</label>
                <input
                  value="Se genera al guardar"
                  disabled
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={newWarehouseName}
                  onChange={(event) => setNewWarehouseName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Nombre de la bodega"
                  disabled={warehousesLoading || warehouseSaving}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Capacidad</label>
                <input
                  type="number"
                  min={0}
                  value={newWarehouseCapacity}
                  onChange={(event) => setNewWarehouseCapacity(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Capacidad (número)"
                  disabled={warehousesLoading || warehouseSaving}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateWarehouseModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleCreateWarehouse({ status: createWarehouseStatus });
                  setShowCreateWarehouseModal(false);
                }}
                disabled={
                  warehouseSaving || warehousesLoading || !newWarehouseName.trim() || newWarehouseCapacity.trim() === ""
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {warehouseSaving ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editClient ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditClient(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Editar cliente</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{editClient.name}</h3>
                <p className="mt-1 text-sm text-slate-600">Actualiza nombre o código.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditClient(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">ID</label>
                <input
                  value={editClient.id}
                  disabled
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Nombre del cliente"
                  disabled={editSaving || clientsLoading}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Código</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(event) => setEditCode(ensureFiveClientCode(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Código"
                  disabled={editSaving || clientsLoading}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditClient(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editClient) return;
                  setEditSaving(true);
                  await handleUpdateClient(editClient.id, { name: editName, code: editCode });
                  setEditSaving(false);
                  setEditClient(null);
                }}
                disabled={editSaving || !editName.trim() || !editCode.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {editSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editWarehouse ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditWarehouse(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Editar bodega</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{editWarehouse.name ?? "Sin nombre"}</h3>
                <p className="mt-1 text-sm text-slate-600">Actualiza nombre, capacidad o tipo.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditWarehouse(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">ID</label>
                <input
                  value={editWarehouse.id}
                  disabled
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={editWarehouseName}
                  onChange={(event) => setEditWarehouseName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Nombre"
                  disabled={editWarehouseSaving || warehousesLoading}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Capacidad</label>
                <input
                  type="number"
                  min={0}
                  value={editWarehouseCapacity}
                  onChange={(event) => setEditWarehouseCapacity(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Capacidad"
                  disabled={editWarehouseSaving || warehousesLoading}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Tipo</label>
                <select
                  value={editWarehouseStatus}
                  onChange={(event) => setEditWarehouseStatus(event.target.value as "interna" | "externa")}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  disabled={editWarehouseSaving || warehousesLoading}
                >
                  <option value="interna">Bodega interna</option>
                  <option value="externa">Bodega externa</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditWarehouse(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editWarehouse) return;
                  setEditWarehouseSaving(true);
                  await handleUpdateWarehouse(editWarehouse.id, {
                    name: editWarehouseName,
                    capacity: Number(editWarehouseCapacity) || 0,
                    status: editWarehouseStatus,
                  });
                  setEditWarehouseSaving(false);
                  setEditWarehouse(null);
                }}
                disabled={editWarehouseSaving || !editWarehouseName.trim() || editWarehouseCapacity.trim() === ""}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {editWarehouseSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditUser(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Editar usuario</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{editUser.name}</h3>
                <p className="mt-1 text-sm text-slate-600">Actualiza rol, nombre o cliente.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">ID</label>
                <input
                  value={editUser.id}
                  disabled
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(event) => setEditUserName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Nombre"
                  disabled={editUserSaving || usersLoading}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Rol</label>
                <select
                  value={editUserRole}
                  onChange={(event) => setEditUserRole(event.target.value as Role)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  disabled={editUserSaving || usersLoading}
                >
                  {[
                    "custodio",
                    "administrador",
                    "operario",
                    "procesador",
                    "jefe",
                    "cliente",
                    "configurador",
                    "operadorCuentas",
                    "transporte",
                  ].map((role) => (
                    <option key={role} value={role}>{roleLabels[role as Role] ?? role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Cuenta asignada</label>
                {editUserRole === "cliente" ? (
                  <select
                    value={editUserClientId}
                    onChange={(event) => setEditUserClientId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    disabled={editUserSaving || usersLoading}
                  >
                    <option value="">Selecciona una cuenta</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editUserClientId}
                    onChange={(event) => setEditUserClientId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    placeholder="ID de cliente"
                    disabled={editUserSaving || usersLoading}
                  />
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editUser) return;
                  setEditUserSaving(true);
                  await handleUpdateUser(editUser.id, {
                    name: editUserName,
                    role: editUserRole,
                    clientId: editUserClientId,
                  });
                  setEditUserSaving(false);
                  setEditUser(null);
                }}
                disabled={editUserSaving || !editUserName.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {editUserSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
