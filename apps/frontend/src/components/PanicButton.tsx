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
  const [statusMsg, setStatusMsg] = useState('Mantén pulsado 3 segundos en caso de emergencia');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  const { socket, isConnected, activeAlert } = useSocket();

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);

  // Restauración de sesión
  useEffect(() => {
    if (activeAlert && !isEmergencyActive) {
      setIsEmergencyActive(true);
      setStatusMsg('Sesión restaurada: La alerta sigue activa.');
    }
  }, [activeAlert]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      clearTimers();
      stopTracking();
    };
  }, []);

  // Feedback de Red
  useEffect(() => {
    if (isEmergencyActive) {
      if (!isConnected) {
        setStatusMsg('Buscando red para transmitir coordenadas...');
      } else {
        setStatusMsg('Transmitiendo coordenadas en tiempo real');
      }
    }
  }, [isConnected, isEmergencyActive]);

  // Sistema de Vibración Háptica (Latido)
  useEffect(() => {
    let heartbeatInterval: number;
    
    if (isEmergencyActive) {
      if (navigator.vibrate) navigator.vibrate([400, 100, 400]);
      heartbeatInterval = window.setInterval(() => {
        if (navigator.vibrate) navigator.vibrate([150, 50, 150]);
      }, 10000);
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isEmergencyActive]);

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
      if (nav.getBattery) return (await nav.getBattery()).level;
      return 1.0;
    } catch (e) {
      return 1.0;
    }
  };

  const startEmergencyTracking = () => {
    setIsEmergencyActive(true);
    setStatusMsg(isConnected ? 'Obteniendo coordenadas exactas...' : 'Esperando red para transmitir...');
    
    if (!navigator.geolocation) {
      setStatusMsg('Error Crítico: Tu navegador no soporta geolocalización.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastBroadcastTimeRef.current < 5000) return; 

        lastBroadcastTimeRef.current = now;

        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        const payload: PanicAlertPayload = {
          userId,
          location: coords,
          batteryLevel: await getBatteryLevel(),
          timestamp: now,
        };

        if (socket && isConnected) {
          socket.emit('send_panic_alert', payload);
          setStatusMsg(`Posición actualizada (Margen de error: ±${Math.round(coords.accuracy)}m)`);
        }
      },
      () => setStatusMsg('Buscando señal GPS... muévete a una zona descubierta.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const cancelEmergency = () => {
    stopTracking();
    setIsEmergencyActive(false);
    setProgress(0);
    lastBroadcastTimeRef.current = 0;
    setStatusMsg('Mantén pulsado 3 segundos en caso de emergencia');
    if (navigator.vibrate) navigator.vibrate(0); 
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
      setStatusMsg('Mantén pulsado 3 segundos en caso de emergencia');
    }
  };

  // ------------------------------------------------------------------
  // VISTA 1: EMERGENCIA ACTIVA (UI Profesional Oscura)
  // ------------------------------------------------------------------
  if (isEmergencyActive) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-900 font-sans selection:bg-red-500/30">
        
        {/* Cabecera de Telemetría Top */}
        <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-50">
           <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="text-sm font-semibold tracking-wide text-slate-200">
                {isConnected ? 'Conexión Estable' : 'Sin Cobertura Temporal'}
              </span>
           </div>
           <div className="text-xs font-mono text-slate-500">ID: {userId.substring(0, 6)}</div>
        </header>

        <main className="flex-1 flex flex-col items-center p-6 w-full max-w-md mx-auto">
           
           {/* Animación de Radar Central */}
           <div className="relative flex items-center justify-center w-40 h-40 mt-6 mb-8">
              {/* Anillos expansivos */}
              <div className={`absolute inset-0 rounded-full border border-red-500/30 ${isConnected ? 'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]' : 'opacity-0'}`}></div>
              <div className={`absolute inset-4 rounded-full border border-red-500/20 ${isConnected ? 'animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]' : 'opacity-0'}`}></div>
              
              {/* Núcleo del radar */}
              <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500 ${isConnected ? 'bg-red-600 shadow-red-600/40' : 'bg-amber-600 shadow-amber-600/40'}`}>
                 <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                 </svg>
              </div>
           </div>

           {/* Textos de Estado */}
           <div className="text-center w-full mb-10">
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Ayuda en Camino</h1>
              <p className="text-slate-400 text-sm px-4 font-medium">{statusMsg}</p>
           </div>

           {/* Tarjetas de Protocolo Médico Universal (Basado en PAS) */}
           <div className="w-full space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3 pl-1">Protocolo de Intervención</h2>
              
              {/* PASO 1: PROTEGER */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
                 <div className="bg-blue-500/20 p-2.5 rounded-xl text-blue-400 shrink-0">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                 </div>
                 <div>
                   <h3 className="font-semibold text-slate-200">1. Asegurar la Zona</h3>
                   <p className="text-sm text-slate-400 mt-1 leading-relaxed">Crea un perímetro seguro. Identifica y aleja posibles peligros para evitar nuevas víctimas.</p>
                 </div>
              </div>

              {/* PASO 2: INMOVILIZAR */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
                 <div className="bg-amber-500/20 p-2.5 rounded-xl text-amber-400 shrink-0">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                   <h3 className="font-semibold text-slate-200">2. No Mover al Afectado</h3>
                   <p className="text-sm text-slate-400 mt-1 leading-relaxed">Salvo riesgo vital inminente (ej. fuego, derrumbe), mantén a la persona en su posición original.</p>
                 </div>
              </div>

              {/* PASO 3: SOCORRER PASIVAMENTE */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
                 <div className="bg-emerald-500/20 p-2.5 rounded-xl text-emerald-400 shrink-0">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </div>
                 <div>
                   <h3 className="font-semibold text-slate-200">3. Mantener Posición</h3>
                   <p className="text-sm text-slate-400 mt-1 leading-relaxed">Los equipos de intervención están en ruta. Mantén la calma, acompáñalo y facilita el acceso.</p>
                 </div>
              </div>
           </div>

           {/* Botón de Cancelación Secundaria */}
           <div className="mt-auto pt-8 w-full">
              <button 
                onClick={cancelEmergency} 
                className="w-full py-4 rounded-xl font-semibold text-slate-300 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
              >
                Falsa Alarma / Cancelar
              </button>
           </div>
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // VISTA 2: ESTADO NORMAL (Botón de Pánico Limpio)
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6 relative overflow-hidden font-sans selection:bg-red-500/30">
      
      {/* Fondo decorativo premium: Malla tecnológica y Halo radial */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Grid sutil para dar aspecto de telemetría/panel de control */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff07_1px,transparent_1px),linear-gradient(to_bottom,#ffffff07_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Halo de luz rojo apagado detrás del botón para generar profundidad */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-600/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Cabecera Superior: Branding y Telemetría */}
      <header className="w-full max-w-md flex items-center justify-between relative z-10 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-slate-700/50">
            <span className="text-white font-black text-sm tracking-tighter">SE</span>
          </div>
          <span className="font-bold text-white tracking-wide text-lg drop-shadow-md">SafeEvent</span>
        </div>

        <div className={`px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg border flex items-center gap-2.5 backdrop-blur-md transition-all duration-300 ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
          </span>
          {isConnected ? 'Sistema en línea' : 'Desconectado'}
        </div>
      </header>

      {/* Área Central: El Botón Físico */}
      <main className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
        
        <div 
          className="relative flex items-center justify-center w-[320px] h-[320px] select-none touch-none"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
        >
          {/* Anillo de progreso SVG (Ahora en tonos oscuros) */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none drop-shadow-2xl">
            <circle cx="160" cy="160" r="145" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800/80" />
            <circle cx="160" cy="160" r="145" stroke="currentColor" strokeWidth="8" fill="transparent"
              strokeDasharray={2 * Math.PI * 145}
              strokeDashoffset={2 * Math.PI * 145 * (1 - progress / 100)}
              strokeLinecap="round"
              className="text-red-500 transition-all duration-75 ease-linear" />
          </svg>

          {/* El Botón (Aspecto Táctil de Alta Gama) */}
          <button 
            className={`absolute w-[260px] h-[260px] rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-out focus:outline-none
              ${isPressing 
                ? 'scale-95 bg-gradient-to-b from-red-700 to-red-900 shadow-[inset_0_20px_40px_rgba(0,0,0,0.6)] border-red-950' 
                : 'bg-gradient-to-b from-red-500 to-red-700 shadow-[0_20px_50px_-10px_rgba(220,38,38,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] hover:scale-[1.02] border-red-400/50'} 
              border border-solid`}
          >
            <span className={`text-white font-black tracking-widest transition-all duration-300 ${isPressing ? 'scale-95 text-5xl drop-shadow-none text-red-100' : 'text-6xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]'}`}>
              SOS
            </span>
            <span className={`text-red-100 font-bold tracking-widest uppercase transition-all duration-300 ${isPressing ? 'mt-3 opacity-100 text-xl text-white' : 'mt-4 opacity-80 text-xs'}`}>
              {isPressing ? `${Math.round(progress)}%` : 'Emergencia'}
            </span>
          </button>
        </div>
      </main>

      {/* Footer: Tarjeta Flotante Glassmorphism */}
      <footer className="w-full max-w-md relative z-10 pb-6 text-center">
        <div className={`bg-slate-900/60 backdrop-blur-xl border transition-colors duration-300 rounded-3xl p-6 shadow-2xl ${isPressing ? 'border-red-500/40 bg-red-950/30' : 'border-slate-800'}`}>
          <h3 className="text-white font-bold text-lg mb-1.5 tracking-tight">Solicitar Asistencia</h3>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            {statusMsg}
          </p>
        </div>
      </footer>

    </div>
  );
}