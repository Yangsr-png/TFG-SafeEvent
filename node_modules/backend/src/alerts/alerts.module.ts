import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsGateway } from './alerts.gateway';
import { AlertsProcessor } from './alerts.processor';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
    BullModule.registerQueue({
      name: 'panic-alerts',
    }),
  ],
  // Fíjate: ¡Aquí no hay ningún RedisModule! Solo los trabajadores de este módulo.
  providers: [AlertsGateway, AlertsProcessor],
})
export class AlertsModule {}
