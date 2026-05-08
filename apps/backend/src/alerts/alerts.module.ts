import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertsGateway } from './alerts.gateway';
import { AlertsProcessor } from './alerts.processor'; // <-- 1. Importamos el procesador

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'panic-alerts',
    }),
  ],
  providers: [AlertsGateway, AlertsProcessor], // <-- 2. Lo añadimos como proveedor
})
export class AlertsModule {}
