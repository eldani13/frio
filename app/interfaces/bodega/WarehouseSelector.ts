import type { Role } from "../bodega";

export type WarehouseSelectorProps = {
	role: Role;
	onChange: (role: Role) => void;
	warehouseId: string;
	warehouseName: string;
	onWarehouseNameChange: (name: string) => void;
};
