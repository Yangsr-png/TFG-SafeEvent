import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type DashboardAlertEvent, AlertStatus } from '@safe-event/shared-types';
import { useSocket } from '../contexts/SocketContext'; // <-- Importamos la conexión real

const EVENT_CENTER = { lat: 40.4240, lng: -3.6735 };

const createCustomIcon = (status: AlertStatus) => {
  const isPending = status === AlertStatus.PENDING;
  const animationClass = isPending ? 'animate-bounce' : '';
  const svgPin = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#dc2626" class="w-10 h-10 drop-shadow-2xl ${animationClass}">
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
  const { socket, isConnected } = useSocket(); // <-- Usamos el socket

  // 1. ESCUCHAMOS EVENTOS REALES DEL SERVIDOR
  useEffect(() => {
    if (!socket) return;

    // Cuando el backend emita una nueva alerta
    socket.on('new_panic_alert_broadcast', (newAlert: DashboardAlertEvent) => {
      setAlerts((prev) => {
        // Evitamos duplicados si el evento llega dos veces
        if (prev.some(a => a.userId === newAlert.userId)) return prev;
        return [...prev, newAlert];
      });
      // Feedback auditivo/háptico para el administrador
      if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
    });

    return () => {
      socket.off('new_panic_alert_broadcast');
    };
  }, [socket]);

  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.alertId !== id));
    // TODO Futuro: Emitir al backend que esta alerta está resuelta
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Panel Lateral */}
      <div className="w-1/3 flex flex-col border-r border-gray-700 relative">
        {/* Indicador de conexión del Dashboard */}
        {!isConnected && (
          <div className="absolute top-0 w-full bg-red-600 text-white text-center py-1 text-xs font-bold z-50 animate-pulse">
            DESCONECTADO DEL SERVIDOR - RECONECTANDO...
          </div>
        )}

        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center mt-6">
          <h1 className="text-xl font-bold text-red-500">Triage Médico</h1>
          <span className="px-3 py-1 bg-gray-700 rounded text-sm text-gray-300">
            Total: {alerts.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">Sin emergencias activas.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.alertId} className="bg-gray-800 p-4 rounded-lg border-l-4 border-red-500 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-red-400">{alert.userId}</h3>
                    <p className="text-xs text-gray-400 mt-1">Status: {alert.status}</p>
                    <p className="text-xs text-gray-400">Precisión: ±{Math.round(alert.location.accuracy)}m</p>
                  </div>
                  <button onClick={() => resolveAlert(alert.alertId)} className="text-xs bg-green-600 hover:bg-green-500 px-2 py-1 rounded">
                    Resolver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área del Mapa */}
      <div className="w-2/3 relative z-0">
        <MapContainer center={[EVENT_CENTER.lat, EVENT_CENTER.lng]} zoom={16} className="w-full h-full">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OSM contributors'
          />
          {alerts.map((alert) => (
            <Marker key={alert.alertId} position={[alert.location.latitude, alert.location.longitude]} icon={createCustomIcon(alert.status)}>
              <Popup className="custom-popup">
                <div className="text-gray-800">
                  <strong className="block text-red-600 text-lg">SOS de {alert.userId}</strong>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}