import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type DashboardAlertEvent, AlertStatus, type AlertStatusType } from '@safe-event/shared-types';
import { useSocket } from '../contexts/SocketContext'; 

const EVENT_CENTER = { lat: 40.4240, lng: -3.6735 };

// ICONO DEL MAPA (Mantenemos el pin rojo animado)
const createCustomIcon = (status: AlertStatusType) => {
  const isPending = status === AlertStatus.PENDING;
  const animationClass = isPending ? 'animate-bounce' : '';
  const svgPin = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" class="w-10 h-10 drop-shadow-2xl ${animationClass}">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
    </svg>
  `;
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: svgPin,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState<DashboardAlertEvent[]>([]);
  const { socket, isConnected } = useSocket(); 

  // ESCUCHA DE EVENTOS
  useEffect(() => {
    if (!socket) return;
    socket.on('new_panic_alert_broadcast', (newAlert: DashboardAlertEvent) => {
      setAlerts((prev) => {
        const existingAlertIndex = prev.findIndex(a => a.userId === newAlert.userId);
        if (existingAlertIndex >= 0) {
          const newState = [...prev];
          newState[existingAlertIndex] = newAlert;
          return newState;
        } else {
          if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
          return [newAlert, ...prev]; // Ponemos las nuevas arriba del todo
        }
      });
    });
    return () => {
      socket.off('new_panic_alert_broadcast');
    };
  }, [socket]);

  // RESOLVER ALERTA
  const resolveAlert = (alertId: string, targetUserId: string) => {
    if (socket && isConnected) {
      socket.emit('update_alert_status', { alertId, userId: targetUserId, status: AlertStatus.RESOLVED });
    }
    setAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
  };

  // NUEVO PARSER: Extrae Nombre y Teléfono del código QR sucio (vCard)
  const parseUserInfo = (rawId: string) => {
    let name = rawId;
    let phone = null;

    if (rawId.startsWith('BEGIN:VCARD')) {
      // CORRECCIÓN: Ignora parámetros como CHARSET=UTF-8
      const nameMatch = rawId.match(/FN(?:;[^:]*)?:([^\n\r]+)/);
      name = nameMatch ? nameMatch[1].trim() : 'Asistente Desconocido';

      const phoneMatch = rawId.match(/TEL(?:;[^:]*)?:([^\n\r]+)/);
      if (phoneMatch) {
        phone = phoneMatch[1].trim();
      }
    }
    return { name, phone };
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-red-500/30">
      
      {/* Panel Lateral Táctico */}
      <div className="w-[420px] flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-md relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        
        {/* Banner de Desconexión */}
        {!isConnected && (
          <div className="bg-red-600/90 backdrop-blur-sm text-white text-center py-2 text-xs font-bold tracking-widest uppercase animate-pulse shadow-lg">
            ⚠️ Enlace Satelital / Red Perdido ⚠️
          </div>
        )}

        {/* Cabecera del Panel */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 tracking-tight">
                Triage Médico
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-wider">Centro de Control Operativo</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm font-bold text-red-400 font-mono shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                [{alerts.length}] ACTIVAS
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Alertas (Scroll) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/20">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-10">
              <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-500 font-semibold tracking-wide">Despliegue Normal. Sin incidencias.</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const { name, phone } = parseUserInfo(alert.userId);
              const timeFormatted = new Date(alert.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute:'2-digit', second:'2-digit' });

              return (
                <div key={alert.alertId} className="relative group bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all hover:border-slate-600">
                  
                  {/* Línea de Acento Roja brillante (Efecto de emergencia) */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]"></div>

                  {/* Cabecera de la Tarjeta */}
                  <div className="flex justify-between items-center bg-slate-900 p-3 pl-5 border-b border-slate-800/50">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                      </span>
                      <span className="text-[11px] font-black text-red-400 uppercase tracking-widest">
                        {alert.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-[11px] font-mono">{timeFormatted}</span>
                    </div>
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-4 pl-5">
                    
                    {/* Paciente */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-100 truncate pr-2">{name}</h3>
                      {phone && (
                        <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          {phone}
                        </p>
                      )}
                    </div>

                    {/* Grid de Telemetría */}
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                      <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Precisión GPS</span>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span className="text-sm font-semibold text-slate-200">±{Math.round(alert.location.accuracy)}m</span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Coordenadas</span>
                        <span className="text-xs font-mono text-slate-300 truncate block">
                          {alert.location.latitude.toFixed(4)}<br/>
                          {alert.location.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {/* Botón de Acción */}
                    <button 
                      onClick={() => resolveAlert(alert.alertId, alert.userId)} 
                      className="w-full py-3 bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl font-bold tracking-wide transition-all active:scale-95 flex justify-center items-center gap-2 group"
                    >
                      <svg className="w-5 h-5 text-emerald-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Marcar como Resuelto
                    </button>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Área del Mapa Satelital */}
      <div className="flex-1 relative z-0 bg-slate-950">
        <MapContainer center={[EVENT_CENTER.lat, EVENT_CENTER.lng]} zoom={16} className="w-full h-full" zoomControl={false}>
          {/* Capa de mapa oscura premium (CartoDB Dark Matter) */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {alerts.map((alert) => {
            const { name } = parseUserInfo(alert.userId);
            return (
              <Marker key={alert.alertId} position={[alert.location.latitude, alert.location.longitude]} icon={createCustomIcon(alert.status)}>
                <Popup className="custom-popup" closeButton={false}>
                  <div className="bg-slate-900 border border-red-500/50 p-3 rounded-lg shadow-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      <strong className="text-red-400 text-sm font-bold uppercase tracking-wider">SOS Activo</strong>
                    </div>
                    <span className="block text-white text-base font-medium truncate max-w-[150px]">
                      {name}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Efecto viñeta interior sobre el mapa */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-[400]"></div>
      </div>

      {/* Estilos CSS extra para el scrollbar (Añadir a tu index.css si lo deseas) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 0.8); }
        .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-tip-container { display: none !important; }
      `}</style>
    </div>
  );
}