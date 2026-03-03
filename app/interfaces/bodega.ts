export type Slot = {
	position: number;
	autoId: string;
	name: string;
	temperature: number | null;
	client: string;
};

export type Role = "custodio" | "administrador" | "operario" | "jefe" | "cliente";

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
