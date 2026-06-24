import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import {
  StripeCheckoutSession,
  StripeEvent,
  StripeService,
} from './stripe.service';
import { OrdersService } from '../orders/orders.service';
import { loadEnv } from '../common/env.config';
import { OrderStatus } from '@prisma/client';

type RawBodyRequest = Request & { body: Buffer };

@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly orders: OrdersService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 600 } })
  async handle(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    const secret = loadEnv().STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error(
        'STRIPE_WEBHOOK_SECRET missing — refusing to process webhook',
      );
      throw new BadRequestException('Webhook not configured');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    if (!Buffer.isBuffer(req.body)) {
      throw new BadRequestException('Raw body required for webhook');
    }

    let event: StripeEvent;
    try {
      event = this.stripe.constructEvent(req.body, signature, secret);
    } catch (err) {
      this.logger.warn(
        `Signature verification failed: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.dispatch(event);
    return { received: true };
  }

  private async dispatch(event: StripeEvent) {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as StripeCheckoutSession;
        const orderId = session.metadata?.['orderId'];
        if (!orderId) {
          this.logger.warn(`Session ${session.id} has no orderId metadata`);
          return;
        }
        await this.orders.update(orderId, {
          id: orderId,
          status: OrderStatus.PENDING,
        });
        this.logger.log(`Order ${orderId} marked PENDING via ${event.type}`);
        return;
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as StripeCheckoutSession;
        const orderId = session.metadata?.['orderId'];
        if (orderId) {
          this.logger.log(
            `Order ${orderId} payment failed/expired (${event.type})`,
          );
        }
        return;
      }

      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }
}
