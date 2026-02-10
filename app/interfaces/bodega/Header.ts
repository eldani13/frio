export type HeaderProps = {
  occupiedCount: number;
  totalSlots: number;
  dateLabel: string;
  warehouseId?: string;
  warehouseName?: string;
  showMeta?: boolean;
  canSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
};
