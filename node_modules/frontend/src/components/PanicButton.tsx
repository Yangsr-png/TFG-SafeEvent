import { useState, useRef, useEffect } from 'react';
import type { PanicAlertPayload, Coordinates } from '@safe-event/shared-types'; // Usamos type para la compilación

export default function PanicButton() {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Mantén pulsado 3 segundos para emergencias');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  // Referencias para temporizadores y tracking
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  // Referencia CLAVE para el Throttling (evita re-renderizados)
  const lastBroadcastTimeRef = useRef<number>(0);

  // Limpieza total al desmontar el componente (vital para no dejar procesos zombis chupando batería)
  useEffect(() => {
    return () => {
      clearTimers();
      stopTracking();
    };
  }, []);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const getBatteryLevel = async (): Promise<number> => {
    try {
      const nav = navigator as any;
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        return battery.level;
      }
      return 1.0;
    } catch (e) {
      return 1.0;
    }
  };

  const startEmergencyTracking = () => {
    setIsEmergencyActive(true);
    setStatusMsg('🚨 Obteniendo coordenadas exactas...');
    
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]); // Patrón SOS

    if (!navigator.geolocation) {
      setStatusMsg('Error Crítico: Tu navegador no soporta geolocalización.');
      return;
    }

    // Arrancamos el seguimiento continuo
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        const THROTTLE_MS = 5000; // Límite: 1 envío cada 5 segundos

        // LÓGICA DE THROTTLE: Si no han pasado 5 segundos, ignoramos esta coordenada
        if (now - lastBroadcastTimeRef.current < THROTTLE_MS) {
          return; 
        }

        // Actualizamos el reloj para el próximo envío
        lastBroadcastTimeRef.current = now;

        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, // Margen de error en metros
        };

        const battery = await getBatteryLevel();

        const payload: PanicAlertPayload = {
          userId: "user-qr-12345",
          location: coords,
          batteryLevel: battery,
          timestamp: now,
        };

        setStatusMsg(`🚨 Emergencia Activa. Posición actualizada (Precisión: ${Math.round(coords.accuracy)}m)`);
        
        // Aquí conectaremos Socket.io más adelante
        console.log('📡 [THROTTLED WEBSOCKET SIMULATION] Enviando payload:', payload);
      },
      (error) => {
        console.error('Error GPS:', error);
        setStatusMsg('⚠️ Buscando señal GPS... muévete a una zona abierta si puedes.');
      },
      { 
        enableHighAccuracy: true, // Requisito innegociable para emergencias médicas
        maximumAge: 0,            // No queremos posiciones cacheadas antiguas
        timeout: 10000            // Si tarda más de 10s, lanza error para poder reintentar
      }
    );
  };

  const cancelEmergency = () => {
    stopTracking();
    setIsEmergencyActive(false);
    setProgress(0);
    lastBroadcastTimeRef.current = 0;
    setStatusMsg('Emergencia cancelada. Mantén pulsado 3 segundos para emergencias');
    console.log('🛑 Rastreo detenido y temporizadores limpios.');
  };

  const handlePressStart = () => {
    if (isEmergencyActive) return; // Si ya está activa, no hacemos nada

    setIsPressing(true);
    setStatusMsg('Manteniendo pulsado...');
    
    intervalRef.current = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
    }, 30);

    timerRef.current = setTimeout(() => {
      clearTimers();
      setIsPressing(false);
      startEmergencyTracking();
    }, 3000);
  };

  const handlePressEnd = () => {
    if (!isEmergencyActive && progress < 100) {
      clearTimers();
      setIsPressing(false);
      setProgress(0);
      setStatusMsg('Mantén pulsado 3 segundos para emergencias');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      
      {/* Botón Principal SOS */}
      <div 
        className={`relative flex items-center justify-center w-64 h-64 rounded-full shadow-xl select-none transition-colors duration-500 ${isEmergencyActive ? 'bg-red-200 animate-pulse' : 'bg-red-100'}`}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        {!isEmergencyActive && (
          <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-red-200" />
            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
              className="text-red-600 transition-all duration-75 ease-linear" />
          </svg>
        )}

        <button 
          className={`absolute w-48 h-48 rounded-full text-white font-bold text-2xl uppercase tracking-wider transition-transform duration-200 
            ${isEmergencyActive ? 'bg-red-700 scale-95 shadow-inner' : 'bg-red-600 hover:scale-105'} 
            ${isPressing && !isEmergencyActive ? 'scale-95' : ''}`}
        >
          {isEmergencyActive ? 'TRANSMITIENDO' : 'SOS'}
        </button>
      </div>

      <div className="mt-8 text-center min-h-[5rem]">
        <p className={`text-lg font-medium ${isEmergencyActive ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
          {statusMsg}
        </p>
        
        {/* Botón de control para pruebas (en producción solo el médico debería poder cancelar) */}
        {isEmergencyActive && (
          <button 
            onClick={cancelEmergency}
            className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-md font-semibold hover:bg-gray-900"
          >
            Simular: Cancelar Alerta (Falsa Alarma)
          </button>
        )}
      </div>
    </div>
  );
}