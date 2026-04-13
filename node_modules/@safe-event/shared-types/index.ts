// packages/shared-types/index.ts

/**
 * Estados posibles de una emergencia
 */
export enum AlertStatus {
  PENDING = 'PENDING',     // Alerta recibida, buscando médico
  ASSIGNED = 'ASSIGNED',   // Médico en camino
  RESOLVED = 'RESOLVED',   // Falsa alarma o emergencia atendida
}

/**
 * Coordenadas geográficas estándar
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number; // Vital: El GPS del móvil nos dirá su margen de error en metros
}

/**
 * EVENTO 1: PWA -> Servidor (Lo que envía el móvil al pulsar 3 segundos)
 */
export interface PanicAlertPayload {
  userId: string;       // El ID del asistente (del QR)
  location: Coordinates;
  batteryLevel: number; // 0.0 a 1.0 (Para saber si el móvil está a punto de morir)
  timestamp: number;    // Date.now() del dispositivo
}

/**
 * EVENTO 2: Servidor -> PWA (Confirmación para que el móvil vibre y muestre la info)
 */
export interface AlertAcknowledgment {
  alertId: string;      // ID único generado por la Base de Datos/Redis
  status: AlertStatus;
  message: string;      // ej: "Ayuda en camino. Mantén la calma."
  serverTimestamp: number;
}

/**
 * EVENTO 3: Servidor -> Panel Admin (Lo que ve el médico en su pantalla)
 */
export interface DashboardAlertEvent {
  alertId: string;
  userId: string;
  location: Coordinates;
  status: AlertStatus;
  assignedMedicId?: string; // Solo si ya hay alguien en camino
  createdAt: number;
}