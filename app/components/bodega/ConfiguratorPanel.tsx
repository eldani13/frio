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
  FiClipboard,
} from "react-icons/fi";
import type { Dispatch, SetStateAction } from "react";
import type { Client, ConfigUser, Role, WarehouseMeta } from "../../interfaces/bodega";
import { MdOutlineAutorenew } from "react-icons/md";


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
  /** Pulso desde el botón Menú del header: vuelve a la pantalla principal (Creación / Asignación / Tareas). */
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
    jefe: "bodega",
    cliente: "",
    custodio: "bodega",
    operadorCuentas: "",
  };

  const roleLabels: Record<Role, string> = {
    custodio: "custodio",
    administrador: "administrador",
    operario: "operario",
    jefe: "jefe",
    cliente: "administrador de cuentas",
    configurador: "configurador",
    operadorCuentas: "operador de cuentas",
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

  const internalWarehouses = warehouses.filter((warehouse) => warehouse.status !== "externa");
  const externalWarehouses = warehouses.filter((warehouse) => warehouse.status === "externa");

  const renderClientes = () => (
    <>
      <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#3b3b3b]">Cuentas</p>
            <p className="text-xs text-[#7c7c7c]">Código, nombre y acciones.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#4b5563]">Total: {clients.length}</span>
            <button
              type="button"
              onClick={fetchClients}
              disabled={clientsLoading || clientSaving}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] bg-white text-[#6b7280] transition hover:bg-[#f8fafc] disabled:opacity-60"
            >
              <FiRefreshCw className={`h-4 w-4 ${clientsLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#24a46d] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f8f60]"
            >
              <FiPlus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1.6fr_2.2fr_1.7fr_1.5fr_2fr] border-y border-[#edf1f5] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c8087]">
          <span>Código</span>
          <span>Nombre</span>
          <span>Bodega asignada</span>
          <span>Credenciales</span>
          <span>Acciones</span>
        </div>
        {clientsLoading && !clients.length ? (
          <div className="grid gap-0">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-12 animate-pulse border-t border-[#edf1f5] bg-white" />
            ))}
          </div>
        ) : clients.length ? (
          clients.map((client) => {
            const shortId = client.id.length > 14 ? `${client.id.slice(0, 8)}...${client.id.slice(-4)}` : client.id;
            return (
              <div
                key={client.id}
                className="grid grid-cols-[1.6fr_2.2fr_1.7fr_1.5fr_2fr] items-center gap-3 border-t border-[#edf1f5] bg-white px-4 py-3 text-sm text-[#3f3f3f]"
              >
                <span className="font-mono text-xs text-[#6b7280]">{client.code}</span>
                <span className={`font-semibold ${client.disabled ? "text-[#9ca3af]" : "text-[#2d2d2d]"}`}>
                  {client.name}
                </span>
                <span className="text-sm text-[#4b5563]">
                  {warehouseNameByAccountCode.get(ensureFiveClientCode(client.code ?? "")) ?? "Sin asignar"}
                </span>
                <span className={`text-sm font-semibold ${users.some((user) => user.clientId === client.id && user.email?.trim()) ? "text-[#15803d]" : "text-[#9ca3af]"}`}>
                  {users.some((user) => user.clientId === client.id && user.email?.trim()) ? "Sí" : "No"}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditClient(client);
                      setEditName(client.name);
                      setEditCode(client.code);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#e8f1ff] px-3 py-1.5 text-xs font-semibold text-[#2b4ea3] transition hover:bg-[#dce7ff]"
                  >
                    <FiEdit2 className="h-4 w-4" />
                    Editar
                  </button>
                  {/* Botón de habilitar/deshabilitar temporalmente oculto */}
                  {/* <button
                    type="button"
                    onClick={() => toggleClientDisabled(client.id, !client.disabled)}
                    title={client.disabled ? "Habilitar" : "Deshabilitar"}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${client.disabled ? "bg-[#e5f3e8] text-[#1d8a45] hover:bg-[#d8ecde]" : "bg-[#f8e7e7] text-[#b64545] hover:bg-[#f3dcdc]"}`}
                  >
                    {client.disabled ? <FiCheck className="h-4 w-4" /> : <FiTrash2 className="h-4 w-4" />}
                    {client.disabled ? "Habilitar" : "Deshabilitar"}
                  </button> */}
                </div>
              </div>
            );
          })
        ) : (
          <div className="border-t border-[#edf1f5] px-4 py-4 text-sm text-[#6b7280]">Aún no hay clientes creados.</div>
        )}
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
      <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#3b3b3b]">{title}</p>
            <p className="text-xs text-[#7c7c7c]">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#4b5563]">Total: {list.length}</span>
            <button
              type="button"
              onClick={fetchWarehouses}
              disabled={warehousesLoading || warehouseSaving}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] bg-white text-[#6b7280] transition hover:bg-[#f8fafc] disabled:opacity-60"
            >
              <FiRefreshCw className={`h-4 w-4 ${warehousesLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateWarehouseStatus(statusKey);
                setShowCreateWarehouseModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#24a46d] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f8f60]"
            >
              <FiPlus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[2fr_1.5fr_1.7fr_2fr] border-y border-[#edf1f5] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c8087]">
          <span>Nombre</span>
          <span>Capacidad</span>
          <span>Bodega asignada</span>
          <span>Acciones</span>
        </div>
        {warehousesLoading && !list.length ? (
          <div className="grid gap-0">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-12 animate-pulse border-t border-[#edf1f5] bg-white" />
            ))}
          </div>
        ) : list.length ? (
          list.map((warehouse) => {
            const shortId = warehouse.id.length > 12 ? `${warehouse.id.slice(0, 6)}...${warehouse.id.slice(-3)}` : warehouse.id;
            const capacityLabel =
              typeof warehouse.capacity === "number" && Number.isFinite(warehouse.capacity)
                ? warehouse.capacity
                : "-";
            const effectiveStatus = warehouse.status === "externa" ? "externa" : "interna";
            const normalizedCode = ensureFiveClientCode(warehouse.codeCuenta ?? "");
            const assignedLabel = normalizedCode ? clientNameByCode.get(normalizedCode) : undefined;
            const assignedDisplay = assignedLabel ?? (normalizedCode || "Sin asignar");
            return (
              <div
                key={warehouse.id}
                className="grid grid-cols-[2fr_1.5fr_1.7fr_2fr] items-center gap-3 border-t border-[#edf1f5] bg-white px-4 py-3 text-sm text-[#3f3f3f]"
              >
                <div className="flex flex-col">
                  <span className={`font-semibold ${warehouse.disabled ? "text-[#9ca3af]" : "text-[#2d2d2d]"}`}>
                    {warehouse.name || "Sin nombre"}
                  </span>
                  <span className="font-mono text-[11px] text-[#6b7280]">{shortId}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                    {effectiveStatus === "externa" ? "Externa" : "Interna"}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#3f3f3f]">{capacityLabel}</span>
                <div className="flex flex-col text-sm text-[#3f3f3f]">
                  <span>{assignedDisplay}</span>
                  <span className="font-mono text-[11px] text-[#6b7280]">{normalizedCode || "Sin código"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                    className="inline-flex items-center gap-2 rounded-full bg-[#e8f1ff] px-3 py-1.5 text-xs font-semibold text-[#2b4ea3] transition hover:bg-[#dce7ff]"
                  >
                    <FiEdit2 className="h-4 w-4" />
                    Editar
                  </button>
                  {/* Botón de habilitar/deshabilitar temporalmente oculto */}
                  {/* <button
                    type="button"
                    onClick={() => toggleWarehouseDisabled(warehouse.id, !warehouse.disabled)}
                    title={warehouse.disabled ? "Habilitar" : "Deshabilitar"}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${warehouse.disabled ? "bg-[#e5f3e8] text-[#1d8a45] hover:bg-[#d8ecde]" : "bg-[#f8e7e7] text-[#b64545] hover:bg-[#f3dcdc]"}`}
                  >
                    {warehouse.disabled ? <FiCheck className="h-4 w-4" /> : <FiTrash2 className="h-4 w-4" />}
                    {warehouse.disabled ? "Habilitar" : "Deshabilitar"}
                  </button> */}
                </div>
              </div>
            );
          })
        ) : (
          <div className="border-t border-[#edf1f5] px-4 py-4 text-sm text-[#6b7280]">Aún no hay bodegas.</div>
        )}
      </div>
    </>
  );

      const renderUsuarios = () => (
        <>
          <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#3b3b3b]">Usuarios</p>
                <p className="text-xs text-[#7c7c7c]">ID, rol, nombre, cliente y acciones.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#4b5563]">Total: {users.length}</span>
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={usersLoading || userSaving}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d5db] bg-white text-[#6b7280] transition hover:bg-[#f8fafc] disabled:opacity-60"
                >
                  <FiRefreshCw className={`h-4 w-4 ${usersLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#24a46d] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f8f60]"
                >
                  <FiPlus className="h-4 w-4" />
                  Agregar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[1.5fr_1.4fr_1.9fr_1.7fr_1.2fr_2fr] border-y border-[#edf1f5] bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7c8087]">
              <span>Código</span>
              <span>Rol</span>
              <span>Nombre</span>
              <span>Cuenta</span>
              <span>Credenciales</span>
              <span>Acciones</span>
            </div>
            {usersLoading && !users.length ? (
              <div className="grid gap-0">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-12 animate-pulse border-t border-[#edf1f5] bg-white" />
                ))}
              </div>
            ) : users.length ? (
              users.map((user) => {
                const hasCredentials = Boolean(user.email?.trim());
                const shortId = user.id.length > 12 ? `${user.id.slice(0, 6)}...${user.id.slice(-3)}` : user.id;
                const code = ensureFiveClientCode(user.code ?? shortId);
                return (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1.5fr_1.4fr_1.9fr_1.7fr_1.2fr_2fr] items-center gap-3 border-t border-[#edf1f5] bg-white px-4 py-3 text-sm text-[#3f3f3f]"
                  >
                    <span className="font-mono text-xs text-[#6b7280]">{code}</span>
                    <span className="text-sm font-semibold text-[#3f3f3f]">{roleLabels[user.role] ?? user.role}</span>
                    <span className={`font-semibold ${user.disabled ? "text-[#9ca3af]" : "text-[#2d2d2d]"}`}>
                      {user.name}
                    </span>
                    <span className="text-sm text-[#4b5563]">
                      {user.clientId ? clientNameById.get(user.clientId) ?? user.clientId : "-"}
                    </span>
                    <span className={`text-sm font-semibold ${hasCredentials ? "text-[#15803d]" : "text-[#9ca3af]"}`}>
                      {hasCredentials ? "Sí" : "No"}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditUser(user);
                          setEditUserName(user.name);
                          setEditUserRole(user.role);
                          setEditUserClientId(user.clientId ?? "");
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-[#e8f1ff] px-3 py-1.5 text-xs font-semibold text-[#2b4ea3] transition hover:bg-[#dce7ff]"
                      >
                        <FiEdit2 className="h-4 w-4" />
                        Editar
                      </button>
                      {/* Botón de habilitar/deshabilitar temporalmente oculto */}
                      {/* <button
                        type="button"
                        onClick={() => toggleUserDisabled(user.id, !user.disabled)}
                        title={user.disabled ? "Habilitar" : "Deshabilitar"}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${user.disabled ? "bg-[#e5f3e8] text-[#1d8a45] hover:bg-[#d8ecde]" : "bg-[#f8e7e7] text-[#b64545] hover:bg-[#f3dcdc]"}`}
                      >
                        {user.disabled ? <FiCheck className="h-4 w-4" /> : <FiTrash2 className="h-4 w-4" />}
                        {user.disabled ? "Habilitar" : "Deshabilitar"}
                      </button> */}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="border-t border-[#edf1f5] px-4 py-4 text-sm text-[#6b7280]">Aún no hay usuarios.</div>
            )}
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
            <h2 className="text-lg font-semibold text-slate-900">Asignación</h2>
          ) : view === "tareasPendiente" ? (
            <h2 className="text-lg font-semibold text-slate-900">Tareas pendiente</h2>
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
                label: "Asignación",
                bg: "#FEF6CD",
                shadowClass:
                  "shadow-[0_14px_40px_-10px_rgba(133,91,17,0.28)] hover:shadow-[0_20px_48px_-12px_rgba(133,91,17,0.3)]",
                icon: <FiUserCheck size={38} className="text-[#855B11]" aria-hidden />,
              },
              {
                key: "tareasPendiente" as const,
                label: "Tareas pendiente",
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
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
          <FiClipboard className="mb-4 h-12 w-12 text-slate-400" aria-hidden />
          <p className="text-lg font-semibold text-slate-800">Próximamente</p>
          <p className="mt-2 text-sm text-slate-500">Esta sección estará disponible en una próxima versión.</p>
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
                  {["custodio", "administrador", "operario", "jefe", "cliente", "configurador"].map((role) => (
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
                  {["custodio", "administrador", "operario", "jefe", "cliente", "configurador"].map((role) => (
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
