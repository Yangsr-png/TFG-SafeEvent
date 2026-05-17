import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Lo hacemos Global para no tener que importarlo en cada módulo del TFG
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
