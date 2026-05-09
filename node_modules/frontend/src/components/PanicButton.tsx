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

  const { socket, isConnected, activeAlert } = useSocket();

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);

  // Restauración de sesión si Redis avisa
  useEffect(() => {
    if (activeAlert && !isEmergencyActive) {
      setIsEmergencyActive(true);
      setStatusMsg('⚠️ Sesión restaurada: La alerta sigue activa.');
    }
  }, [activeAlert]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      clearTimers();
      stopTracking();
    };
  }, []);

  // Control dinámico de estado de red durante la emergencia
  useEffect(() => {
    if (isEmergencyActive) {
      if (!isConnected) {
        setStatusMsg('⚠️ Buscando red para transmitir coordenadas...');
      } else {
        setStatusMsg('🚨 Transmitiendo coordenadas en vivo');
      }
    }
  }, [isConnected, isEmergencyActive]);

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
    setStatusMsg(isConnected ? '🚨 Obteniendo coordenadas exactas...' : '⚠️ Esperando red para transmitir...');
    
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
          userId: userId,
          location: coords,
          batteryLevel: battery,
          timestamp: now,
        };

        // LÓGICA DE TÚNEL: Solo transmitimos si hay socket online
        if (socket && isConnected) {
          socket.emit('send_panic_alert', payload);
          setStatusMsg(`🚨 Posición enviada (Precisión: ${Math.round(coords.accuracy)}m)`);
          console.log('📡 Payload enviado:', payload);
        } else {
          console.warn('⚠️ Sin cobertura temporal. Los datos se enviarán al recuperar la red.', payload);
        }
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
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 transition-colors duration-500 ${!isConnected && isEmergencyActive ? 'bg-orange-600' : 'bg-gray-100'}`}>
      
      {/* Banner de túnel / Pérdida de red */}
      {!isConnected && isEmergencyActive && (
        <div className="absolute top-0 w-full bg-red-800 text-white text-center py-4 px-2 shadow-lg z-50 flex flex-col items-center justify-center animate-pulse">
          <span className="text-xl font-bold">⚠️ SIN COBERTURA ⚠️</span>
          <span className="text-sm">Sigue buscando señal. Tus coordenadas se enviarán automáticamente en cuanto recuperes la red.</span>
        </div>
      )}

      {/* Indicador de conexión general */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold text-white shadow-md ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
        {isConnected ? '🟢 En línea' : '🔴 Offline'}
      </div>

      <div 
        className={`relative flex items-center justify-center w-64 h-64 rounded-full shadow-2xl select-none transition-all duration-500 
          ${isEmergencyActive ? (isConnected ? 'bg-red-200 animate-pulse scale-105' : 'bg-orange-800 opacity-80') : 'bg-red-100'}`}
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
            ${isEmergencyActive 
              ? (isConnected ? 'bg-red-700 shadow-inner' : 'bg-orange-500 shadow-inner') 
              : 'bg-red-600 hover:scale-105'} 
            ${isPressing && !isEmergencyActive ? 'scale-95' : ''}`}
        >
          {isEmergencyActive ? (isConnected ? 'TRANSMITIENDO' : 'ESPERANDO RED') : 'SOS'}
        </button>
      </div>

      <div className="mt-8 text-center min-h-[5rem]">
        <p className={`text-lg font-medium ${isEmergencyActive ? (isConnected ? 'text-red-600 font-bold' : 'text-white font-bold') : 'text-gray-700'}`}>
          {statusMsg}
        </p>
        
        {isEmergencyActive && (
          <button 
            onClick={cancelEmergency}
            className="mt-6 px-6 py-3 bg-gray-800 text-white rounded-md font-semibold hover:bg-gray-900 shadow-lg w-full max-w-xs"
          >
            Cancelar Alerta
          </button>
        )}
      </div>
    </div>
  );
}