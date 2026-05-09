import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient!: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Nos conectamos usando las variables que ya tienes en tu .env
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
    });

    this.redisClient.on('connect', () =>
      console.log('🚀 Redis Service: Conectado con éxito'),
    );
    this.redisClient.on('error', (err) =>
      console.error('❌ Redis Service Error:', err),
    );
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  /**
   * Guarda un estado de alerta activa para un usuario.
   * Usamos 'EX' para que la clave muera sola en 24h si nadie la cierra,
   * evitando llenar la memoria de Redis con basura.
   */
  async setActiveAlert(userId: string, alertId: string): Promise<void> {
    const key = `user:${userId}:active_alert`;
    await this.redisClient.set(key, alertId, 'EX', 86400);
  }

  /**
   * Recupera el ID de la alerta si el usuario tiene una activa.
   */
  async getActiveAlert(userId: string): Promise<string | null> {
    return this.redisClient.get(`user:${userId}:active_alert`);
  }

  /**
   * Elimina el rastro de la alerta cuando se marca como resuelta.
   */
  async removeActiveAlert(userId: string): Promise<void> {
    await this.redisClient.del(`user:${userId}:active_alert`);
  }
}
