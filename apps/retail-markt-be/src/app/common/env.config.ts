import { Logger } from '@nestjs/common';

export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  STRIPE_SECRET: string;
  STRIPE_WEBHOOK_SECRET: string;
  FRONTEND_URL: string;
}

class MissingEnvError extends Error {
  constructor(keys: string[]) {
    super(`Missing required environment variables: ${keys.join(', ')}`);
    this.name = 'MissingEnvError';
  }
}

const REQUIRED: (keyof AppEnv)[] = [
  'DATABASE_URL',
  'STRIPE_SECRET',
  'FRONTEND_URL',
];

let cached: AppEnv | undefined;

export function loadEnv(): AppEnv {
  if (cached) return cached;

  const env = process.env;
  const missing = REQUIRED.filter((k) => !env[k]);

  if (env.NODE_ENV === 'production' && !env.STRIPE_WEBHOOK_SECRET) {
    missing.push('STRIPE_WEBHOOK_SECRET');
  }

  if (missing.length > 0) {
    throw new MissingEnvError(missing);
  }

  if (env.NODE_ENV === 'production' && !env.STRIPE_WEBHOOK_SECRET) {
    Logger.warn(
      'STRIPE_WEBHOOK_SECRET not set — payment confirmations cannot be verified',
      'EnvConfig',
    );
  }

  cached = {
    NODE_ENV: (env.NODE_ENV as AppEnv['NODE_ENV']) || 'development',
    PORT: Number(env.PORT) || 3000,
    DATABASE_URL: env.DATABASE_URL!,
    STRIPE_SECRET: env.STRIPE_SECRET!,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET || '',
    FRONTEND_URL: env.FRONTEND_URL!,
  };

  return cached;
}

export const isProduction = () => loadEnv().NODE_ENV === 'production';
