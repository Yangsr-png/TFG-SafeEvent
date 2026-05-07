import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // EL DETECTOR DE MENTIRAS:
  console.log(`--- DEBUG --- Apuntando a: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`--- DEBUG --- Usuario: '${process.env.DB_USER}' | Pass: '${process.env.DB_PASS}'`);

  await app.listen(3000);
}
bootstrap();
