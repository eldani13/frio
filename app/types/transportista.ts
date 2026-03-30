export interface Trasnportista {
    id?: string;          // ID de documento en Firebase
    numericId: number;    // Autonumérico
    code: string;         // Base 36
    name: string;         // Razón social del proveedor
    plantName: string;    // Nombre físico de la planta/bodega
    location: string;     // Ciudad o Zona Logística
    maxPallets: number;   // Capacidad total de posiciones
    tempRange: string;    // Rango térmico (ej: "-20°C a 5°C")
    isOperational: boolean;
    createdAt: number;    // Timestamp
  }