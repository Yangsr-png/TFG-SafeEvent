import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AlertsModule } from './alerts/alerts.module'; // <-- REVISA ESTA IMPORTACIÓN

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Configuración de BullMQ (Redis)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || '127.0.0.1',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST') || 'localhost',
        port: config.get<number>('DB_PORT') || 5432,
        username: config.get<string>('DB_USER') || 'safeuser',
        password: config.get<string>('DB_PASS') || 'safepass',
        database: config.get<string>('DB_NAME') || 'safeevent_db',
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    AlertsModule, // <--- ESTO ES LO QUE FALTA EN TU LOG
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
