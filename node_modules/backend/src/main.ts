import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Habilitamos CORS por si tu frontend lo necesita más adelante
  app.enableCors();
  await app.listen(3000);
  console.log(`🚀 SafeEvent Backend corriendo en: http://localhost:3000`);
}
bootstrap();
