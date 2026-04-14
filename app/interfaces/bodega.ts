export type Slot = {
	position: number;
	autoId: string;
	name: string;
	temperature: number | null;
	client: string;
	/** Peso en kg asociado a la caja (opcional). */
	quantityKg?: number;
	/** Campos opcionales alineados con inventario externo / Fridem (si existen en Firestore). */
	rd?: string | number | null;
	renglon?: string | number | null;
	lote?: string | null;
	marca?: string | null;
	embalaje?: string | null;
	pesoUnitario?: number | string | null;
	piezas?: number | string | null;
	caducidad?: string | null;
	fechaIngreso?: string | null;
	llaveUnica?: string | null;
	/** Misma caja que en ingreso/salida: trazabilidad hasta despacho. */
	ordenCompraId?: string;
	ordenCompraClienteId?: string;
	/** Ubicación desde procesamiento: nombre del producto resultado (secundario). */
	procesamientoSecundarioTitulo?: string;
	/** Ubicación desde procesamiento: cantidad estimada en unidades del secundario (p. ej. lonchas). */
	procesamientoUnidadesSecundario?: number;
	/** Id Firestore de la solicitud de procesamiento (para re-enlazar estimado si faltó en el slot). */
	procesamientoSolicitudId?: string;
};

export type Role =
	| "custodio"
	| "administrador"
	| "operario"
	| "procesador"
	| "jefe"
	| "cliente"
	| "configurador"
	| "operadorCuentas";

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
	/** Cantidad en kilogramos. */
	quantityKg?: number;
	/** Ingreso desde OC: al ubicar la última caja en bodega se cierra la orden. */
	ordenCompraId?: string;
	ordenCompraClienteId?: string;
};

export type OrderType = "a_bodega" | "a_salida" | "revisar";

export type OrderSource = "ingresos" | "bodega" | "salida" | "procesamiento";

/** Metadatos cuando el origen del traslado es una orden de procesamiento ya **Terminada** (devolución al mapa). */
export type ProcesamientoOrigenOrden = {
	cuentaClientId: string;
	solicitudId: string;
	numero: string;
	productoPrimarioTitulo: string;
	productoSecundarioTitulo: string;
	productoPrimarioId?: string;
	cantidadPrimario: number;
	unidadPrimarioVisualizacion?: "peso" | "cantidad";
	/** Estimación al crear la solicitud (regla de tres hacia el secundario). */
	estimadoUnidadesSecundario?: number | null;
};

export type BodegaOrder = {
	id: string;
	type: OrderType;
	sourcePosition: number;
	sourceZone: OrderSource;
	targetPosition?: number;
	createdAt: string;
	createdAtMs: number;
	/** Cuando la orden ya fue ejecutada por el operario (historial en reportes). */
	completadoAtMs?: number;
	createdBy: Role;
	client?: string;
	autoId?: string;
	boxName?: string;
	procesamientoOrigen?: ProcesamientoOrigenOrden;
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

/** Caja registrada en historial de ingresos (marca de tiempo al archivar). */
export type HistoryIngresoSnapshot = Box & { historialAtMs?: number };

/** Despacho definitivo (no se quita del historial aunque la caja salga del mapa). */
export type DispatchedHistoryEntry = {
	id: string;
	box: Box;
	atMs: number;
	fromSalidaPosition: number;
};

export type HistoryState = {
	ingresos: HistoryIngresoSnapshot[];
	salidas: BodegaOrder[];
	movimientosBodega: BodegaOrder[];
	alertas: AlertHistoryEntry[];
	despachadosHistorial: DispatchedHistoryEntry[];
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
