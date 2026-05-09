import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext'; 

interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface PanicAlertPayload {
  userId: string;
  location: Coordinates;
  batteryLevel: number;
  timestamp: number;
}

interface PanicButtonProps {
  userId: string;
}

export default function PanicButton({ userId }: PanicButtonProps){
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Mantén pulsado 3 segundos para emergencias');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  // --- NUEVA INTEGRACIÓN SOCKET.IO ---
  const { socket, isConnected, activeAlert } = useSocket();
  // -----------------------------------

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);

  // Si Redis nos avisa al cargar la página de que ya estábamos en emergencia, restauramos el estado visual
  useEffect(() => {
    if (activeAlert && !isEmergencyActive) {
      setIsEmergencyActive(true);
      setStatusMsg('⚠️ Sesión restaurada: La alerta sigue activa.');
      // Opcional: Podrías llamar a startEmergencyTracking() aquí si quieres que siga enviando GPS tras recargar
    }
  }, [activeAlert]);

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
    
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);

    if (!navigator.geolocation) {
      setStatusMsg('Error Crítico: Tu navegador no soporta geolocalización.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        const THROTTLE_MS = 5000;

        if (now - lastBroadcastTimeRef.current < THROTTLE_MS) {
          return; 
        }

        lastBroadcastTimeRef.current = now;

        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        const battery = await getBatteryLevel();

        const payload: PanicAlertPayload = {
          userId: userId, // Usamos la prop que recibe el componente
          location: coords,
          batteryLevel: battery,
          timestamp: now,
        };

        setStatusMsg(`🚨 Emergencia Activa. Posición actualizada (Precisión: ${Math.round(coords.accuracy)}m)`);
        
        // --- LA MAGIA SUCEDE AQUÍ ---
        if (socket && isConnected) {
          socket.emit('send_panic_alert', payload);
          console.log('📡 Payload real enviado al backend de NestJS:', payload);
        } else {
          console.warn('⚠️ No hay conexión al servidor. Intentando re-conectar...');
          setStatusMsg('⚠️ Sin conexión al servidor. Reintentando...');
        }
        // -----------------------------
      },
      (error) => {
        console.error('Error GPS:', error);
        setStatusMsg('⚠️ Buscando señal GPS... muévete a una zona abierta si puedes.');
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000 
      }
    );
  };

  const cancelEmergency = () => {
    stopTracking();
    setIsEmergencyActive(false);
    setProgress(0);
    lastBroadcastTimeRef.current = 0;
    setStatusMsg('Emergencia cancelada. Mantén pulsado 3 segundos para emergencias');
    
    // Opcional: Avisar al backend de que se canceló la alerta para borrarla de Redis
    // if (socket) socket.emit('resolve_panic_alert', { userId });
  };

  const handlePressStart = () => {
    if (isEmergencyActive) return;

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
      {/* Indicador de conexión de red */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold text-white ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
        {isConnected ? '🟢 Server Online' : '🔴 Server Offline'}
      </div>

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