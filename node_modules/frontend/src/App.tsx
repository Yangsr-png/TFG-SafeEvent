import { useState } from 'react';
import PanicButton from './components/PanicButton';
import AdminDashboard from './components/AdminDashboard';

function App() {
  // Estado temporal para cambiar entre la vista de Asistente y Médico
  const [view, setView] = useState<'user' | 'admin'>('admin');

  return (
    <>
      {/* Botón flotante para cambiar de vista (Solo para desarrollo) */}
      <div className="fixed top-2 left-2 z-50">
        <button 
          onClick={() => setView(view === 'user' ? 'admin' : 'user')}
          className="px-4 py-2 bg-purple-600 text-white rounded-md shadow-lg font-bold opacity-80 hover:opacity-100"
        >
          Cambiar a vista: {view === 'user' ? 'MÉDICO' : 'ASISTENTE'}
        </button>
      </div>

      {view === 'user' ? <PanicButton /> : <AdminDashboard />}
    </>
  );
}

export default App;