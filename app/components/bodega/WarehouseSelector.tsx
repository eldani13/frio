import type { WarehouseSelectorProps } from "../../interfaces/bodega/WarehouseSelector";

const ROLE_LABELS: Record<string, string> = {
	custodio: "Custodio",
	administrador: "Administrador",
	jefe: "Jefe",
	operario: "Operario",
};

const ROLE_HELP: Record<string, string> = {
	custodio: "Registra ingresos y crea salidas para el operario.",
	administrador: "Visualiza toda la bodega en modo solo lectura.",
	jefe: "Da la orden de trabajo para mover ingresos a bodega.",
	operario: "Ejecuta las solicitudes pendientes.",
};

export default function WarehouseSelector({
	role,
	onChange,
	warehouseId,
	warehouseName,
	onWarehouseNameChange,
}: WarehouseSelectorProps) {
	const isReadOnly = role === "administrador";

	return (
		<div>
			
{/* 			
			
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
						readOnly={isReadOnly}
						onChange={(event) =>
							isReadOnly ? undefined : onWarehouseNameChange(event.target.value)
						}
						className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${
							isReadOnly ? "bg-slate-100" : ""
						}`}
						placeholder="Ej: Bodega Norte"
					/>
				</div>
			</div> */}
		</div>
	);
}
