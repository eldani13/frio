import type { WarehouseSelectorProps } from "../../interfaces/bodega/WarehouseSelector";

const ROLE_LABELS: Record<string, string> = {
	custodio: "Custodio",
	administrador: "Administrador",
	operario: "Operario",
};

const ROLE_HELP: Record<string, string> = {
	custodio: "Registra ingresos y crea salidas para el operario.",
	administrador: "Asigna tareas de ingreso a bodega.",
	operario: "Ejecuta las solicitudes pendientes.",
};

export default function WarehouseSelector({
	role,
	onChange,
	warehouseId,
	warehouseName,
	onWarehouseNameChange,
}: WarehouseSelectorProps) {
	return (
		<div className="rounded-2xl bg-white p-6 shadow-sm">
			
			
			
			<div className="mt-4 grid gap-3">
				<p className="text-sm text-slate-600">{ROLE_HELP[role]}</p>
				<div className="mt-2 grid gap-2">
					<label className="text-sm font-medium text-slate-600">
						Id unico de bodega
					</label>
					<input
						value={warehouseId}
						readOnly
						className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm"
					/>
					<label className="text-sm font-medium text-slate-600">
						Nombre de bodega
					</label>
					<input
						value={warehouseName}
						onChange={(event) => onWarehouseNameChange(event.target.value)}
						className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
						placeholder="Ej: Bodega Norte"
					/>
				</div>
			</div>
		</div>
	);
}
