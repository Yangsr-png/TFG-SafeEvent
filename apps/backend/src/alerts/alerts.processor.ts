/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity';

@Processor('panic-alerts')
export class AlertsProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`\n<  Worker despertado. Procesando Job [${job.name}] ID: ${job.id}...`);

    try {
      // 1. ENRUTAMIENTO DEL JOB SEGÚN SU NOMBRE
      if (job.name === 'process-alert') {
        return await this.handleProcessAlert(job.data);
      } else if (job.name === 'resolve-alert') {
        return await this.handleResolveAlert(job.data);
      } else {
        console.warn(`⚠️ Tipo de job ignorado: ${job.name}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error crítico en BD al procesar ${job.name}:`, error);
      throw error; // BullMQ lo reintentará
    }
  }

  // ----------------------------------------------------------------------
  // LÓGICA DE UPSERT: LATIDOS GPS (Cada 5 segundos)
  // ----------------------------------------------------------------------
  private async handleProcessAlert(data: any) {
    const { userId, eventId, location } = data;

    // 1. Buscamos si ya existe una emergencia ACTIVA para este usuario
    const existingAlert = await this.alertRepository.findOne({
      where: [
        { userId, status: 'PENDING' },
        { userId, status: 'RECEIVED' },
        { userId, status: 'ATTENDING' }
      ]
    });

    if (existingAlert) {
      // ✅ UPDATE: Ya hay una alerta. Solo actualizamos la telemetría.
      existingAlert.latitude = location.latitude;
      existingAlert.longitude = location.longitude;
      // TypeORM actualizará automáticamente el campo "updatedAt" si lo tienes configurado
      
      const updatedAlert = await this.alertRepository.save(existingAlert);
      console.log(`📡 [TELEMETRÍA] Coordenadas actualizadas. UUID: ${updatedAlert.id}`);
      return updatedAlert;
      
    } else {
      // ✅ INSERT: Primera vez que pulsa el botón en esta emergencia.
      const newAlert = this.alertRepository.create({
        userId,
        eventId,
        latitude: location.latitude,
        longitude: location.longitude,
        status: 'PENDING' // Alineado con la interfaz del Frontend
      });

      const savedAlert = await this.alertRepository.save(newAlert);
      console.log(`🚨 [NUEVO INSERT] Alerta crítica registrada. UUID: ${savedAlert.id}`);
      return savedAlert;
    }
  }

  // ----------------------------------------------------------------------
  // LÓGICA DE RESOLUCIÓN: EL ADMIN CIERRA LA ALERTA
  // ----------------------------------------------------------------------
  private async handleResolveAlert(data: any) {
    const { userId, status } = data; // status vendrá como 'RESOLVED' desde el Gateway

    // Buscamos cualquier alerta activa de este usuario para cerrarla
    const activeAlerts = await this.alertRepository.find({
      where: [
        { userId, status: 'PENDING' },
        { userId, status: 'RECEIVED' },
        { userId, status: 'ATTENDING' }
      ]
    });

    if (activeAlerts.length > 0) {
      for (const alert of activeAlerts) {
        alert.status = status; // Cambiamos a estado final (RESOLVED o FALSE_ALARM)
        await this.alertRepository.save(alert);
      }
      console.log(`✅ [RESOLUCIÓN] Alerta cerrada en PostgreSQL para: ${userId}\n`);
    } else {
      console.log(`ℹ️ [RESOLUCIÓN] No había alertas activas en BD para: ${userId}\n`);
    }

    return { resolved: true, userId };
  }
}