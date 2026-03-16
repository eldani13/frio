import type { Role } from "../bodega";

export type WarehouseMeta = {
	id: string;
	name?: string;
	status?: string;
};

export type WarehouseSelectorProps = {
	role: Role;
	warehouseId: string;
	warehouseName?: string;
	warehouses: WarehouseMeta[];
	onSelectWarehouse: (id: string) => void;
	onCreateWarehouse: (name: string) => void;
	isLoading?: boolean;
};
