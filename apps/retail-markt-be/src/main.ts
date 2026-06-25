import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, raw, Express } from 'express';
import serverless from 'serverless-http';

import { AppModule } from './app/app.module';
import { isProduction, loadEnv } from './app/common/env.config';

const GLOBAL_PREFIX = 'api';

export async function createApp(): Promise<Express> {
  const tEnv = Date.now();
  loadEnv();
  console.log(`[INIT] loadEnv ok (+${Date.now() - tEnv}ms)`);

  const tNest = Date.now();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  console.log(`[INIT] NestFactory.create ok (+${Date.now() - tNest}ms)`);

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

  const tInit = Date.now();
  await app.init();
  console.log(`[INIT] app.init ok (+${Date.now() - tInit}ms)`);

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
// imports vercelHandler() from this bundle instead.
if (!process.env['VERCEL']) {
  bootstrap().catch((err) => {
    Logger.error(
      'Fatal bootstrap error',
      err instanceof Error ? err.stack : err,
    );
    process.exit(1);
  });
}

// Cached serverless handler — built lazily on first invocation and
// reused across warm Lambda invocations.
let cachedVercel: ReturnType<typeof serverless> | null = null;

export async function vercelHandler(req: unknown, res: unknown) {
  if (!cachedVercel) {
    const expressApp = await createApp();
    cachedVercel = serverless(expressApp);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (cachedVercel as any)(req, res);
}
