import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, raw, Express } from 'express';

import { AppModule } from './app/app.module';
import { isProduction, loadEnv } from './app/common/env.config';

const GLOBAL_PREFIX = 'api';

export async function createApp(): Promise<Express> {
  loadEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const env = loadEnv();

  app.use(
    `/${GLOBAL_PREFIX}/stripe/webhook`,
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

  app.setGlobalPrefix(GLOBAL_PREFIX, {
    exclude: ['health'],
  });

  await app.init();

  return app.getHttpAdapter().getInstance() as Express;
}

async function bootstrap() {
  const expressApp = await createApp();
  const env = loadEnv();

  expressApp.listen(env.PORT, () => {
    Logger.log(
      `🚀 Application running on http://localhost:${env.PORT}/${GLOBAL_PREFIX}`,
      'Bootstrap',
    );
    Logger.log(
      `   Env: ${env.NODE_ENV} | GraphQL playground: ${!isProduction()}`,
      'Bootstrap',
    );
  });
}

// Skip listen() when running on Vercel — the api/[...slug].js function
// imports createApp() and wraps it with serverless-http instead.
if (!process.env['VERCEL']) {
  bootstrap().catch((err) => {
    Logger.error(
      'Fatal bootstrap error',
      err instanceof Error ? err.stack : err,
    );
    process.exit(1);
  });
}
