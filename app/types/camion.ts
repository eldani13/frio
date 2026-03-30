export interface Camion {
  id?: string;            // ID de documento en Firebase
  numericId: number;      // Autonumérico (para control interno)
  code: string;           // Base 36 (ej: identificador corto)
  plate: string;          // Placa o Matrícula del vehículo
  brand: string;          // Marca (ej: Volvo, Scania, Kenworth)
  model: string;          // Modelo o año
  
  // Capacidades y Dimensiones
  maxWeightKg: number;    // Capacidad de carga máxima en Kilogramos
  maxVolumeM3: number;    // Capacidad en metros cúbicos
  palletCapacity: number; // Cuántos pallets caben (para cruzar con maxPallets de la Planta)
  
  // Estado y Categoría
  type: 'Refrigerado' | 'Seco' | 'Isotérmico'; // Tipo de furgón
  tempRange?: string;     // Rango térmico si aplica (ej: "-18°C a 0°C")
  isAvailable: boolean;   // Si está libre para asignar ruta
    
  createdAt: number;        // Timestamp de creación
  codeCuenta: string;       // Cuenta del usuario
}