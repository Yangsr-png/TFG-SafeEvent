import { useEffect, useState } from 'react';
import PanicButton from './components/PanicButton';
import AdminDashboard from './components/AdminDashboard';
import QRScanner from './components/QRScanner'; // Importamos tu nuevo componente

export default function App() {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('safeEventUserId'));
  const [isScanningMode, setIsScanningMode] = useState(false);

  useEffect(() => {
    // 1. INTENTO PRINCIPAL: Leer desde la URL nativa (Magic Link)
    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get('ticketId');

    if (ticketId) {
      handleSuccessfulLogin(ticketId);
    }
  }, []);

  const handleSuccessfulLogin = (id: string) => {
    localStorage.setItem('safeEventUserId', id);
    setUserId(id);
    setIsScanningMode(false);
    
    // Limpiamos la URL para evitar que el usuario comparta su enlace con su ID por WhatsApp a un amigo
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleLogout = () => {
    localStorage.removeItem('safeEventUserId');
    setUserId(null);
  };

  // RENDERIZADO CONDICIONAL DE SEGURIDAD
  if (view === 'user' && !userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
        <h1 className="text-3xl font-bold text-red-500 mb-6">SafeEvent</h1>
        
        {!isScanningMode ? (
          <div className="text-center">
            <p className="text-gray-300 mb-8">Para solicitar asistencia médica, debes vincular tu entrada.</p>
            <button 
              onClick={() => setIsScanningMode(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105"
            >
              📷 Escanear mi Pulsera / Entrada
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md">
            {/* 2. INTENTO DE RESPALDO: Escáner interno de la PWA */}
            <QRScanner onScanSuccess={handleSuccessfulLogin} />
            <button 
              onClick={() => setIsScanningMode(false)}
              className="mt-6 text-gray-400 hover:text-white underline w-full text-center"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Controles de depuración (Solo para desarrollo) */}
      <div className="fixed top-2 left-2 z-50 flex gap-2">
        <button onClick={() => setView(view === 'user' ? 'admin' : 'user')} className="px-3 py-1 bg-purple-600 text-white rounded shadow text-xs opacity-50 hover:opacity-100">
          Vista: {view.toUpperCase()}
        </button>
        {view === 'user' && userId && (
          <button onClick={handleLogout} className="px-3 py-1 bg-red-800 text-white rounded shadow text-xs opacity-50 hover:opacity-100">
            Cerrar Sesión
          </button>
        )}
      </div>

      {/* Renderizamos la vista correspondiente pasando el ID validado */}
      {view === 'user' ? <PanicButton userId={userId!} /> : <AdminDashboard />}
    </>
  );
}