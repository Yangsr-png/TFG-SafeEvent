// packages/shared-types/index.ts

/**
 * Estados posibles de una emergencia
 * (Refactorizado de enum a Const Object para compatibilidad estricta con empaquetadores)
 */
export const AlertStatus = {
  PENDING: 'PENDING',
  ATTENDING: 'ATTENDING',
  RESOLVED: 'RESOLVED',
  FALSE_ALARM: 'FALSE_ALARM'
} as const;

// 2. Extraemos el tipo dinámicamente (Esto SÍ desaparece al compilar, Vite será feliz)
export type AlertStatusType = typeof AlertStatus[keyof typeof AlertStatus];

// 3. Tu diccionario de etiquetas sigue funcionando igual
export const AlertStatusLabels: Record<AlertStatusType, string> = {
  [AlertStatus.PENDING]: 'Pendiente',
  [AlertStatus.ATTENDING]: 'En camino',
  [AlertStatus.RESOLVED]: 'Resuelta',
  [AlertStatus.FALSE_ALARM]: 'Falsa Alarma'
};

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
  status: AlertStatusType; // CORREGIDO: Usando el Type, no el Const
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
  status: AlertStatusType; // CORREGIDO: Usando el Type, no el Const
  assignedMedicId?: string; // Solo si ya hay alguien en camino
  createdAt: number;
}