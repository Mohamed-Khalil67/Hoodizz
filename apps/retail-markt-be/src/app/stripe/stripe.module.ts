import { Module, Global } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_CLIENT, StripeService } from './stripe.service';
import { loadEnv } from '../common/env.config';

@Global()
@Module({
  providers: [
    {
      provide: STRIPE_CLIENT,
      useFactory: () => Stripe(loadEnv().STRIPE_SECRET),
    },
    StripeService,
  ],
  exports: [StripeService, STRIPE_CLIENT],
})
export class StripeModule {}
