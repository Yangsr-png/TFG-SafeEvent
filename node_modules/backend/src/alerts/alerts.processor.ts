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
    console.log(`\n<  Worker despertado. Procesando Job ID: ${job.id}...`);

    // 1. Extraemos los datos exactos que vimos en tu consola antes
    const { userId, eventId, location } = job.data;

    // 2. Preparamos el objeto para la BD
    const newAlert = this.alertRepository.create({
      userId,
      eventId,
      latitude: location.latitude,
      longitude: location.longitude,
      // eslint-disable-next-line prettier/prettier
      status: 'RECEIVED'
    });

    try {
      // 3. Guardamos en PostgreSQL de forma asíncrona
      const savedAlert = await this.alertRepository.save(newAlert);
      console.log(
        `✅ ¡Éxito! Alerta guardada en PostgreSQL con UUID: ${savedAlert.id}\n`,
      );
      return savedAlert;
    } catch (error) {
      console.error(`❌ Error crítico guardando en BD:`, error);
      throw error; // Lanzamos el error para que BullMQ lo marque como "Failed" y lo reintente
    }
  }
}
