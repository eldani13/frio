export interface Provider {
    id?: string;        // ID de documento en Firebase
    numericId: number;  // Autonumérico
    code: string;       // Base 36
    name: string;
    nombre?: string;
    telefono?: string;
    email?: string;
    codeCuenta: string;
    createdAt: number;
  }