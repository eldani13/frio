export type Slot = {
	position: number;
	autoId: string;
	name: string;
	temperature: number | null;
	client: string;
};

export type Role = "custodio" | "administrador" | "operario" | "jefe" | "cliente" | "configurador";

export type Client = {
	id: string;
	name: string;
	code: string;
	createdAt?: string;
	createdAtMs?: number;
	createdBy?: string | null;
	createdByRole?: Role | null;
	disabled?: boolean;
	disabledAt?: string;
};

export type ConfigUser = {
	id: string;
	name: string;
	role: Role;
	code?: string;
	clientId?: string;
	email?: string;
	password?: string;
	createdAt?: string;
	createdAtMs?: number;
	createdBy?: string | null;
	createdByRole?: Role | null;
	disabled?: boolean;
	disabledAt?: string;
};

export type Box = {
	position: number;
	autoId: string;
	name: string;
	temperature: number;
	client: string;
};

export type OrderType = "a_bodega" | "a_salida" | "revisar";

export type OrderSource = "ingresos" | "bodega" | "salida";

export type BodegaOrder = {
	id: string;
	type: OrderType;
	sourcePosition: number;
	sourceZone: OrderSource;
	targetPosition?: number;
	createdAt: string;
	createdAtMs: number;
	createdBy: Role;
	client?: string;
	autoId?: string;
	boxName?: string;
};

export type BodegaStats = {
	ingresos: number;
	salidas: number;
	movimientosBodega: number;
};

export type AlertReason = "no_tuve_tiempo" | "no_quise" | "no_pude";

export type AlertItem = {
	id: string;
	title: string;
	description: string;
	reason?: AlertReason;
	sourceOrderId?: string;
	meta?: string;
	createdAt?: string;
};

export type AlertAssignment = {
	alertId: string;
	kind: "temperatura" | "reporte" | "otro";
	assignedAt: string;
	assignedBy: string;
	sourceOrderId?: string;
	position?: number;
};

export type AlertHistoryEntry = {
	id: string;
	title: string;
	description: string;
	createdAt: string;
	createdAtMs: number;
	meta?: string;
};

export type HistoryState = {
	ingresos: Box[];
	salidas: BodegaOrder[];
	movimientosBodega: BodegaOrder[];
	alertas: AlertHistoryEntry[];
};

export type WarehouseMeta = {
	id: string;
	name?: string;
	status?: string;
	capacity?: number;
	disabled?: boolean;
	createdAt?: string;
	disabledAt?: string;
	codeCuenta?: string;
};
