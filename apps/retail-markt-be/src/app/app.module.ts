import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import type { Request, Response } from 'express';
import { join } from 'node:path';

import { AppController } from './app.controller';
import { ProductsModule } from './products/products.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { StripeModule } from './stripe/stripe.module';
import { StripeWebhookModule } from './stripe/stripe-webhook.module';
import { isProduction, loadEnv } from './common/env.config';
import { RATE_LIMIT } from './common/constants';
import { GraphQLExceptionFilter } from './common/filters/graphql-exception.filter';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: () => loadEnv(),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT.DEFAULT_TTL_MS,
        limit: RATE_LIMIT.DEFAULT_LIMIT,
      },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Vercel functions run in a read-only filesystem; keep the schema in
      // memory there. Local dev still writes to dist/ for tooling.
      autoSchemaFile: process.env['VERCEL']
        ? true
        : join(process.cwd(), 'apps/retail-markt-be/dist/schema.gql'),
      playground: !isProduction(),
      introspection: !isProduction(),
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
      }),
      formatError: (error) => {
        if (isProduction()) {
          return {
            message: error.message,
            code: error.extensions?.['code'] ?? 'INTERNAL_SERVER_ERROR',
          };
        }
        return error;
      },
    }),
    StripeModule,
    ProductsModule,
    CheckoutModule,
    OrdersModule,
    StripeWebhookModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_FILTER, useClass: GraphQLExceptionFilter },
  ],
})
export class AppModule {}
