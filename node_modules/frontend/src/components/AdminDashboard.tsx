import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type DashboardAlertEvent, AlertStatus } from '@safe-event/shared-types';

// Coordenadas centrales ficticias (Ej: Un recinto de conciertos en Madrid)
const EVENT_CENTER = { lat: 40.4240, lng: -3.6735 };

// FIX: Uso de color hexadecimal nativo en el fill para evitar que 
// Tailwind elimine la clase de color durante la compilación.
const createCustomIcon = (status: AlertStatus) => {
  const isPending = status === AlertStatus.PENDING;
  // Mantenemos la clase de Tailwind solo para la animación, no para el color
  const animationClass = isPending ? 'animate-bounce' : '';
  
  // fill="#dc2626" inyecta el color rojo de emergencia de forma inquebrantable
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

  // Simulador de inyección de datos (Lo que hará el WebSocket en el futuro)
  const injectMockAlert = () => {
    const newAlert: DashboardAlertEvent = {
      alertId: `ALRT-${Math.floor(Math.random() * 10000)}`,
      userId: `USR-QR-${Math.floor(Math.random() * 1000)}`,
      location: {
        latitude: EVENT_CENTER.lat + (Math.random() - 0.5) * 0.005, // Dispersión aleatoria
        longitude: EVENT_CENTER.lng + (Math.random() - 0.5) * 0.005,
        accuracy: Math.floor(Math.random() * 15) + 5, // Entre 5 y 20 metros
      },
      status: AlertStatus.PENDING,
      createdAt: Date.now(),
    };

    setAlerts((prev) => [...prev, newAlert]);
  };

  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.alertId !== id));
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      
      {/* Panel Lateral: Lista de Alertas */}
      <div className="w-1/3 flex flex-col border-r border-gray-700">
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-red-500">Triage Médico</h1>
          <button 
            onClick={injectMockAlert}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold transition-colors"
          >
            + Simular Alerta
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">Sin emergencias activas.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.alertId} className="bg-gray-800 p-4 rounded-lg border-l-4 border-red-500 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{alert.alertId}</h3>
                    <p className="text-xs text-gray-400 mt-1">Usuario: {alert.userId}</p>
                    <p className="text-xs text-gray-400">Precisión GPS: ±{alert.location.accuracy}m</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => resolveAlert(alert.alertId)}
                    className="text-xs bg-green-600 hover:bg-green-500 px-2 py-1 rounded"
                  >
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
        <MapContainer 
          center={[EVENT_CENTER.lat, EVENT_CENTER.lng]} 
          zoom={16} 
          className="w-full h-full"
        >
          {/* Capa de mapa oscuro de CartoDB (ideal para dashboards) */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Renderizado de Pines */}
          {alerts.map((alert) => (
            <Marker 
              key={alert.alertId} 
              position={[alert.location.latitude, alert.location.longitude]}
              icon={createCustomIcon(alert.status)}
            >
              <Popup className="custom-popup">
                <div className="text-gray-800">
                  <strong className="block text-red-600 text-lg">{alert.alertId}</strong>
                  <span>Asistente: {alert.userId}</span><br/>
                  <span className="text-xs text-gray-500">
                    Lat: {alert.location.latitude.toFixed(5)} <br/>
                    Lng: {alert.location.longitude.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

    </div>
  );
}