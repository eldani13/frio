export type Slot = {
	position: number;
	autoId: string;
	name: string;
	temperature: number | null;
};

export type Role = "custodio" | "administrador" | "operario";

export type Box = {
	position: number;
	autoId: string;
	name: string;
	temperature: number;
};

export type OrderType = "a_bodega" | "a_salida";

export type OrderSource = "ingresos" | "bodega";

export type BodegaOrder = {
	id: string;
	type: OrderType;
	sourcePosition: number;
	sourceZone: OrderSource;
	targetPosition?: number;
	createdAt: string;
	createdBy: Role;
};
