import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({ cors: true })
export class AlertsGateway implements OnGatewayConnection {
  
  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectQueue('panic-alerts') private readonly alertsQueue: Queue,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      // 1. FUNDAMENTAL: Metemos al socket en una sala privada con su ID nada más conectarse
      client.join(userId);

      const existingAlertId = await this.redisService.getActiveAlert(userId);
      if (existingAlertId) {
        client.emit('alert_restored', { alertId: existingAlertId });
      }
    }
  }

  @SubscribeMessage('send_panic_alert')
  async handlePanicAlert(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
    // Por seguridad, aseguramos que el cliente está en su sala
    client.join(payload.userId);

    await this.redisService.setActiveAlert(payload.userId, 'PENDING');
    
    // AVISO ARQUITECTÓNICO: Este Job debe estar configurado en tu Worker como un UPSERT (Update or Insert)
    // No hagas INSERT ciego o reventarás la base de datos con 1 registro cada 5 segundos.
    const job = await this.alertsQueue.add('process-alert', payload);

    console.log('📢 [GATEWAY] Emitiendo evento global al Admin Dashboard...');
    
    // ESTO ES LO QUE HACE QUE EL ADMIN LO VEA
    this.server.emit('new_panic_alert_broadcast', {
      alertId: job.id ? `JOB-${job.id}` : `TEMP-${Date.now()}`,
      userId: payload.userId,
      location: payload.location,
      status: 'PENDING',
      createdAt: payload.timestamp || Date.now(),
    });

    return { status: 'RECEIVED', jobId: job.id };
  }

  // 2. NUEVO: ESCUCHAR LA ORDEN DEL ADMIN Y APAGAR EL MÓVIL
  @SubscribeMessage('update_alert_status')
  async handleUpdateStatus(@MessageBody() payload: { alertId: string, userId: string, status: string }) {
    console.log(`✅ [GATEWAY] Admin resolvió la alerta de ${payload.userId}`);

    // A. Actualizamos la caché (o la borramos) para que el móvil no restaure una alerta muerta si recarga
    await this.redisService.setActiveAlert(payload.userId, payload.status); 

    // B. Mandamos la orden a la cola para que tu Worker actualice la base de datos a 'RESOLVED'
    await this.alertsQueue.add('resolve-alert', payload);

    // C. CRÍTICO: Disparamos el evento a la sala EXACTA de ese usuario. 
    // ESTO ES LO QUE APAGA EL TELÉFONO.
    this.server.to(payload.userId).emit('alert_resolved_by_admin');
  }
}