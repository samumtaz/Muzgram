import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableShutdownHooks();

  const logger = new Logger('Worker');
  logger.log('Muzgram worker started — processors: notifications, moderation, feed-cache');
}

bootstrap().catch((err) => {
  console.error('Worker failed to start', err);
  process.exit(1);
});
