import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, raw } from 'express';

import { AppModule } from './app/app.module';
import { isProduction, loadEnv } from './app/common/env.config';

async function bootstrap() {
  loadEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const env = loadEnv();
  const globalPrefix = 'api';

  app.use(
    `/${globalPrefix}/stripe/webhook`,
    raw({ type: 'application/json', limit: '1mb' }),
  );
  app.use(json({ limit: '1mb' }));

  app.use(
    helmet({
      contentSecurityPolicy: isProduction() ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.enableCors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  app.setGlobalPrefix(globalPrefix, {
    exclude: ['health'],
  });

  await app.listen(env.PORT);

  Logger.log(
    `🚀 Application running on http://localhost:${env.PORT}/${globalPrefix}`,
    'Bootstrap',
  );
  Logger.log(
    `   Env: ${env.NODE_ENV} | GraphQL playground: ${!isProduction()}`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  Logger.error('Fatal bootstrap error', err instanceof Error ? err.stack : err);
  process.exit(1);
});
