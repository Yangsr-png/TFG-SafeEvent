import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    // 1. Siempre el ConfigModule primero
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Redis / BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host:
            configService.get<string>('DB_HOST') === '127.0.0.1'
              ? '127.0.0.1'
              : 'localhost',
          port: 6379,
        },
      }),
    }),

    // 3. Base de Datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // <--- ESTO ES VITAL
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true, // Solo para desarrollo
      }),
    }),

    // 4. Tu módulo de alertas
    AlertsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
