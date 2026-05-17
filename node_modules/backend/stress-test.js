// stress-test.js
import { io } from "socket.io-client";

// Configuración de la prueba
const TARGET_URL = "http://localhost:3000"; // <-- Cambia esto al puerto de tu Gateway NestJS
const TOTAL_USERS = 500; // Empezamos con 500 conexiones simultáneas
const EMIT_INTERVAL_MS = 5000; // Cada usuario emite un latido cada 5 segundos

let connectedCount = 0;
let emitCount = 0;

console.log(`\n🚀 INICIANDO PROTOCOLO DE ESTRÉS...`);
console.log(`Objetivo: Levantar ${TOTAL_USERS} WebSockets concurrentes.`);
console.log(`Cadencia: 1 latido por usuario cada ${EMIT_INTERVAL_MS / 1000}s.\n`);

// Bucle para crear los usuarios con una rampa de aceleración (1 nuevo cada 20ms)
for (let i = 1; i <= TOTAL_USERS; i++) {
  setTimeout(() => {
    const userId = `STRESS_TEST_${i}`;
    
    const socket = io(TARGET_URL, {
      query: { userId: userId },
      transports: ["websocket"] // Forzamos WebSockets puros, sin polling
    });

    socket.on("connect", () => {
      connectedCount++;
      
      // En cuanto se conecta, empieza a emitir su ubicación en bucle
      setInterval(() => {
        socket.emit("send_panic_alert", {
          userId: userId,
          location: {
            // Simulamos ligero movimiento sumando valores aleatorios
            latitude: 40.4240 + (Math.random() * 0.005),
            longitude: -3.6735 + (Math.random() * 0.005),
            accuracy: Math.floor(Math.random() * 20) + 5
          },
          batteryLevel: 0.8,
          timestamp: Date.now()
        });
        emitCount++;
      }, EMIT_INTERVAL_MS);
    });

    socket.on("disconnect", () => {
      connectedCount--;
    });

    socket.on("connect_error", (err) => {
      console.error(`❌ Error de conexión en ${userId}:`, err.message);
    });

  }, i * 20); // Rampa de subida
}

// Panel de monitorización en tiempo real (se actualiza cada segundo)
setInterval(() => {
  console.log(`📊 ESTADO ACTIVO | 🟢 Sockets Conectados: ${connectedCount}/${TOTAL_USERS} | ⚡ Latidos Procesados: ${emitCount}`);
}, 1000);