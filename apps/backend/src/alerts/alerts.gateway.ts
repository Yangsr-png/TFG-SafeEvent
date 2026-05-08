import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket, // <-- Asegúrate de importar esto
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { PanicAlertPayload } from '@safe-event/shared-types';
import { Socket } from 'socket.io';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@WebSocketGateway({
  cors: {
    origin: '*', // Permite cualquier origen
  },
  transports: ['websocket', 'polling'], // Acepta ambos métodos
})
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection(client: Socket) {
    console.log(` Cliente conectado: ${client.id}`);
  }
  constructor(@InjectQueue('panic-alerts') private panicQueue: Queue) {}

  handleDisconnect(client: Socket) {
    console.log(` Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('send_panic_alert')
  async handlePanicAlert(
    @MessageBody() payload: PanicAlertPayload,
    @ConnectedSocket() client: Socket, // <-- Inyectamos el cliente para poder responderle
  ) {
    await this.panicQueue.add('process-alert', payload, {
      attempts: 3,
      backoff: 1000,
    });

    console.log('📥 Alerta enviada a la cola BullMQ');

    // Respondemos con el evento exacto que espera tu HTML
    client.emit('alert_acknowledgment', {
      status: 'QUEUED',
      message: 'La alerta está procesándose en segundo plano.',
    });
  }
}
