import { useMemo, useState } from "react";
import { FiBox, FiPlusCircle } from "react-icons/fi";
import type { WarehouseSelectorProps } from "../../interfaces/bodega/WarehouseSelector";

const ROLE_HELP: Record<string, string> = {
	custodio: "Registra ingresos y crea salidas para el operario.",
	administrador: "Administra bodegas y permisos.",
	jefe: "Da órdenes de trabajo.",
	operario: "Ejecuta solicitudes pendientes.",
	configurador: "Configura catálogos y ajustes.",
};

export default function WarehouseSelector({
	role,
	warehouseId,
	warehouseName,
	warehouses,
	onSelectWarehouse,
	onCreateWarehouse,
	isLoading,
}: WarehouseSelectorProps) {
	const [newName, setNewName] = useState("");
	const canManage = role === "administrador";

	const options = useMemo(() => {
		if (!warehouses.length) return [];
		return warehouses.map((item) => ({
			value: item.id,
			label: item.name?.trim() ? `${item.name} (${item.id})` : item.id,
		}));
	}, [warehouses]);

	const handleCreate = () => {
		const value = newName.trim();
		if (!value) return;
		onCreateWarehouse(value);
		setNewName("");
	};

	return (
		<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-sm font-semibold text-slate-800">Bodegas</p>
					<p className="text-xs text-slate-500">{ROLE_HELP[role]}</p>
				</div>
				<div className="flex flex-wrap items-end gap-3 md:flex-nowrap">
					<div>
						<label className="text-xs font-semibold text-slate-600">Selecciona bodega</label>
						<select
							className="mt-1 w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
							value={warehouseId}
							onChange={(event) => onSelectWarehouse(event.target.value)}
							disabled={isLoading || !options.length}
						>
							{options.length ? (
								options.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))
							) : (
								<option value="">Sin bodegas disponibles</option>
							)}
						</select>
					</div>
					{canManage ? (
						<div className="flex flex-col gap-2 md:w-80">
							<label className="text-xs font-semibold text-slate-600">Crear nueva bodega</label>
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={newName}
									onChange={(event) => setNewName(event.target.value)}
									className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
									placeholder="Nombre amigable"
								/>
								<button
									type="button"
									onClick={handleCreate}
									disabled={isLoading || !newName.trim()}
									className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
								>
									<FiPlusCircle className="h-4 w-4" />
									Crear
								</button>
							</div>
						</div>
					) : null}
				</div>
			</div>
			<div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
				<FiBox className="h-4 w-4" />
				<span>Bodega actual:</span>
				<strong className="text-slate-900">{warehouseName || "Sin nombre"}</strong>
				<span className="text-slate-400">({warehouseId || "--"})</span>
			</div>
		</section>
	);
}