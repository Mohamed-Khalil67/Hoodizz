import { Injectable, Logger } from '@nestjs/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { OrdersService } from '../orders/orders.service';
import { StripeService } from '../stripe/stripe.service';
import { loadEnv } from '../common/env.config';
import { CheckoutFailedException } from '../common/exceptions';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly stripe: StripeService,
  ) {}

  async create(dto: CreateCheckoutDto, userId: string | undefined) {
    const order = await this.ordersService.createWithStockReservation({
      items: dto.items,
      totalAmount: dto.totalAmount,
      userId,
    });

    const env = loadEnv();

    try {
      const session = await this.stripe.client.checkout.sessions.create({
        line_items: dto.items.map((item) => ({
          price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        mode: 'payment',
        success_url: `${env.FRONTEND_URL}/checkout/success?orderId=${order.id}`,
        cancel_url: `${env.FRONTEND_URL}/checkout/cancel?orderId=${order.id}`,
        metadata: { orderId: order.id, userId: userId ?? '' },
      });

      if (!session.url) {
        throw new CheckoutFailedException('Stripe returned no checkout URL');
      }

      await this.ordersService.attachStripeSession(order.id, session.id);

      return { url: session.url, sessionId: session.id, orderId: order.id };
    } catch (error) {
      this.logger.error(
        `Stripe session creation failed for order ${order.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.ordersService
        .removeUnpaid(order.id)
        .catch((cleanupErr) =>
          this.logger.warn(
            `Failed to clean up orphaned order ${order.id}: ${
              cleanupErr instanceof Error ? cleanupErr.message : 'unknown'
            }`,
          ),
        );
      throw new CheckoutFailedException(
        error instanceof Error ? error.message : 'Stripe error',
      );
    }
  }
}
