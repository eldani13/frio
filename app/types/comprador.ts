export interface Comprador {
    id?: string;        // ID de documento en Firebase
    numericId: number;  // Autonumérico
    code: string;       // Base 36
    name: string;
    createdAt: number;
  }