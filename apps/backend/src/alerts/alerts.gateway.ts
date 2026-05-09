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
      const existingAlertId = await this.redisService.getActiveAlert(userId);
      if (existingAlertId) {
        client.emit('alert_restored', { alertId: existingAlertId });
      }
    }
  }

  @SubscribeMessage('send_panic_alert')
  async handlePanicAlert(@MessageBody() payload: any, @ConnectedSocket() client: Socket) {
    await this.redisService.setActiveAlert(payload.userId, 'PENDING');
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
}