import { useEffect, useState } from 'react';
import PanicButton from './components/PanicButton';
import AdminDashboard from './components/AdminDashboard';
import QRScanner from './components/QRScanner';

export default function App() {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('safeEventUserId'));
  const [isScanningMode, setIsScanningMode] = useState(false);

  useEffect(() => {
    // INTENTO PRINCIPAL: Leer desde la URL nativa (Magic Link)
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

  // ------------------------------------------------------------------
  // RENDERIZADO CONDICIONAL DE SEGURIDAD (PANTALLA DE LOGIN PREMIUM)
  // ------------------------------------------------------------------
  if (view === 'user' && !userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white p-6 selection:bg-red-500/30">
        
        {/* Fondo decorativo premium (Malla tecnológica y Halo radial) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff07_1px,transparent_1px),linear-gradient(to_bottom,#ffffff07_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-600/10 rounded-full blur-[80px]"></div>
        </div>

        {/* Cabecera / Logo */}
        <div className="relative z-10 flex items-center gap-3 mb-16">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-slate-700/50">
            <span className="text-white font-black text-lg tracking-tighter">SE</span>
          </div>
          <span className="font-bold text-white tracking-wide text-3xl drop-shadow-md">SafeEvent</span>
        </div>
        
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          
          <p className="text-slate-400 mb-10 text-center text-sm font-medium leading-relaxed px-4">
            Para garantizar tu seguridad y poder solicitar asistencia médica, necesitas vincular tu entrada.
          </p>

          {!isScanningMode ? (
            <div className="w-full">
              {/* Botón Principal */}
              <button 
                onClick={() => setIsScanningMode(true)}
                className="w-full flex items-center justify-center gap-3.5 px-6 py-4.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white font-semibold rounded-2xl shadow-[0_10px_30px_-5px_rgba(37,99,235,0.3)] border border-slate-700/50 hover:from-slate-700 hover:to-slate-800 hover:border-slate-600 active:scale-95 transition-all duration-300 shadow-md group"
              >
                <svg className="w-6 h-6 text-slate-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Escanear Entrada / Pulsera
              </button>
            </div>
          ) : (
            // CONTENEDOR CORREGIDO: Sin overflow-hidden que corte el botón 
            <div className="w-full flex flex-col items-center bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-[fadeIn_0.5s_ease-out]">
               
               {/* 2. INTENTO DE RESPALDO: Escáner interno y botón de galería */}
               <QRScanner onScanSuccess={handleSuccessfulLogin} />
               
               {/* Botón de Cancelar */}
               <div className="w-full p-4 bg-slate-950 border-t border-slate-800">
                 <button 
                   onClick={() => setIsScanningMode(false)}
                   className="py-3.5 px-6 text-slate-400 hover:text-white font-semibold w-full text-center rounded-xl hover:bg-slate-800 transition-colors active:scale-95"
                 >
                   Cancelar Escaneo
                 </button>
               </div>
               
            </div>
          )}
        </div>

        {/* Controles Flotantes Globales */}
        <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
          <button 
            onClick={() => setView(view === 'user' ? 'admin' : 'user')}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-full shadow-xl text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-600 transition-all duration-200 active:scale-95 group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs font-bold tracking-wider uppercase">
              Ir a Admin
            </span>
          </button>
        </div>
      </div>
    );
  }
  
  // ------------------------------------------------------------------
  // RENDERIZADO PRINCIPAL (APP CON ID VALIDADO)
  // ------------------------------------------------------------------
  return (
    <div className="relative min-h-screen bg-slate-950 font-sans">
      
      {/* Controles Flotantes Globales (Admin / Cerrar Sesión) */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
        
        <button 
          onClick={() => setView(view === 'user' ? 'admin' : 'user')}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-full shadow-xl text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-slate-600 transition-all duration-200 active:scale-95 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-xs font-bold tracking-wider uppercase">
            {view === 'user' ? 'Ir a Admin' : 'Ir a Usuario'}
          </span>
        </button>

        {view === 'user' && userId && (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-red-950/40 backdrop-blur-lg border border-red-900/30 rounded-full shadow-xl text-red-500 hover:text-red-300 hover:bg-red-900/60 hover:border-red-700/50 transition-all duration-200 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-bold tracking-wider uppercase">
              Cerrar Sesión
            </span>
          </button>
        )}

      </div>

      {view === 'user' ? (
        userId ? (
            <PanicButton userId={userId} />
        ) : (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-950">
                {/* Pantalla de Carga Sutil de Telemetría tras el escaneo exitoso */}
                <div className="relative flex h-10 w-10">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-800 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-10 w-10 bg-slate-900 border border-slate-700"></span>
                </div>
                <p className="mt-6 text-slate-500 text-xs font-semibold uppercase tracking-wider">Iniciando protocolo de telemetría...</p>
            </div>
        )
      ) : (
        <AdminDashboard />
      )}
      
    </div>
  );
}