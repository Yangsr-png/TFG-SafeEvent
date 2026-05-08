import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { PanicAlertPayload } from '@safe-event/shared-types';
import { Socket } from 'socket.io';
// Importamos el contrato desde el paquete compartido

@WebSocketGateway({ cors: true })
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection(client: Socket) {
    console.log(`🟢 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔴 Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('send_panic_alert')
  handlePanicAlert(
    @MessageBody() payload: PanicAlertPayload,
    @ConnectedSocket() client: Socket,
  ) {
    console.log(` [ALERTA RECIBIDA] del socket: ${client.id}`);
    console.log('Datos de la emergencia:', payload);

    client.emit('alert_acknowledgment', {
      status: 'RECEIVED',
      message: 'Alerta recibida por el servidor. Mantén la calma.',
    });
  }
}
