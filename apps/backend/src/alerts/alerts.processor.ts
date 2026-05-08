import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('panic-alerts')
export class AlertsProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`⚙️ Procesando trabajo ${job.id} de tipo ${job.name}...`);
    // Aquí es donde en el futuro guardaremos en DB y notificaremos
    console.log('📦 Datos procesados:', job.data);

    return {};
  }
}
