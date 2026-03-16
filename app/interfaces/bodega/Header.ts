export type HeaderProps = {
  occupiedCount: number;
  totalSlots: number;
  dateLabel: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouses?: Array<{ id: string; name?: string }>;
  onSelectWarehouse?: (id: string) => void;
  showIntro?: boolean;
  showMeta?: boolean;
  canSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
};
