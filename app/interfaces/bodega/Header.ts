export type HeaderProps = {
  occupiedCount: number;
  totalSlots: number;
  dateLabel: string;
  warehouseId?: string;
  warehouseName?: string;
  showIntro?: boolean;
  showMeta?: boolean;
  canSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
};
