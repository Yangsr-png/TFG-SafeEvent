import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeAlert: string | null; 
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  activeAlert: null,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  useEffect(() => {
    // 1. Instanciamos el socket solo cuando el Provider se monta
const socketInstance = io('http://localhost:3000', {
          transports: ['websocket', 'polling'],
      query: { userId: 'user_tfg_2026_x' }, // Simulación temporal hasta el Issue 5
    });

    // 2. Escuchamos eventos básicos
    socketInstance.on('connect', () => setIsConnected(true));
    socketInstance.on('disconnect', () => setIsConnected(false));

    // 3. ¡Magia del Caos! Escuchamos si Redis nos restaura
    socketInstance.on('alert_restored', (data) => {
      console.warn(' ¡Estado restaurado desde Redis!', data);
      setActiveAlert(data.alertId);
    });

    setSocket(socketInstance);

    // 4. Cleanup function: Si el usuario cierra la app, matamos la conexión limpiamente
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, activeAlert }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom Hook para consumirlo fácilmente
export const useSocket = () => useContext(SocketContext);