import { useState, useRef, useEffect } from 'react';
import type { PanicAlertPayload, Coordinates } from '@safe-event/shared-types'; // Usamos "type" porque son solo interfaces para validar datos; Vite las eliminará al compilar el código para producción.

export default function PanicButton() {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Mantén pulsado 3 segundos para emergencias');
  
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Limpieza de temporizadores al desmontar el componente
  useEffect(() => {
    return () => clearTimers();
  }, []);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const getBatteryLevel = async (): Promise<number> => {
    try {
      // navigator.getBattery no está en los tipos estándar de TS por defecto
      const nav = navigator as any; 
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        return battery.level;
      }
      return 1.0; // Fallback si el navegador no lo soporta
    } catch (e) {
      return 1.0;
    }
  };

  const getCoordinates = (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy, // Vital para el margen de error del GPS
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const triggerAlert = async () => {
    setStatusMsg('Obteniendo ubicación y enviando alerta...');
    
    // Vibración de feedback táctil (Evento 2 local)
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    try {
      const [coords, battery] = await Promise.all([
        getCoordinates(),
        getBatteryLevel()
      ]);

      // Estructura exigida por el contrato de tipos
      const payload: PanicAlertPayload = {
        userId: "user-qr-12345", // Mock temporal, luego vendrá del estado/auth
        location: coords,
        batteryLevel: battery,
        timestamp: Date.now(),
      };

      console.log('🔴 [SIMULACIÓN] PAYLOAD ENVIADO AL SERVIDOR:', payload);
      setStatusMsg('¡Alerta enviada! Ayuda en camino.');
      
    } catch (error) {
      console.error('Error al obtener datos de telemetría:', error);
      setStatusMsg('Error: No se pudo obtener la ubicación. Comprueba los permisos.');
    } finally {
      setIsPressing(false);
      setProgress(0);
    }
  };

  const handlePressStart = () => {
    setIsPressing(true);
    setStatusMsg('Manteniendo pulsado...');
    
    // Actualiza la barra de progreso visual cada 30ms (100 pasos para 3000ms)
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 30);

    // Dispara la acción principal a los 3000ms exactos
    timerRef.current = setTimeout(() => {
      clearTimers();
      triggerAlert();
    }, 3000);
  };

  const handlePressEnd = () => {
    if (progress < 100) {
      clearTimers();
      setIsPressing(false);
      setProgress(0);
      setStatusMsg('Mantén pulsado 3 segundos para emergencias');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div 
        className="relative flex items-center justify-center w-64 h-64 rounded-full bg-red-100 shadow-xl select-none"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        {/* Anillo de progreso SVG */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
          <circle
            cx="128" cy="128" r="120"
            stroke="currentColor" strokeWidth="8" fill="transparent"
            className="text-red-200"
          />
          <circle
            cx="128" cy="128" r="120"
            stroke="currentColor" strokeWidth="8" fill="transparent"
            strokeDasharray={2 * Math.PI * 120}
            strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
            className="text-red-600 transition-all duration-75 ease-linear"
          />
        </svg>

        <button 
          className={`absolute w-48 h-48 rounded-full bg-red-600 text-white font-bold text-2xl uppercase tracking-wider transition-transform duration-200 ${isPressing ? 'scale-95 bg-red-700' : 'hover:scale-105'}`}
        >
          SOS
        </button>
      </div>

      <p className="mt-8 text-lg font-medium text-gray-700 text-center min-h-[3rem]">
        {statusMsg}
      </p>
    </div>
  );
}