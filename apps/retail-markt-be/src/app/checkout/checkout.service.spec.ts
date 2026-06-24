import { Test, TestingModule } from '@nestjs/testing';

import { CheckoutService } from './checkout.service';
import { OrdersService } from '../orders/orders.service';
import { StripeService } from '../stripe/stripe.service';
import { CheckoutFailedException } from '../common/exceptions';

process.env['STRIPE_SECRET'] = 'sk_test_dummy';
process.env['DATABASE_URL'] = 'postgresql://test';
process.env['FRONTEND_URL'] = 'http://localhost:4200';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let orders: {
    createWithStockReservation: jest.Mock;
    attachStripeSession: jest.Mock;
    removeUnpaid: jest.Mock;
  };
  let stripe: { client: { checkout: { sessions: { create: jest.Mock } } } };

  beforeEach(async () => {
    orders = {
      createWithStockReservation: jest.fn(),
      attachStripeSession: jest.fn(),
      removeUnpaid: jest.fn(),
    };
    stripe = {
      client: { checkout: { sessions: { create: jest.fn() } } },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: OrdersService, useValue: orders },
        { provide: StripeService, useValue: stripe },
      ],
    }).compile();

    service = module.get(CheckoutService);
  });

  const validDto = {
    items: [
      {
        productId: 'p1',
        name: 'Tee',
        price: 10,
        quantity: 2,
        size: 'M',
        color: 'red',
      },
    ],
    totalAmount: 20,
  };

  it('creates order, Stripe session, and links them', async () => {
    orders.createWithStockReservation.mockResolvedValue({ id: 'o1' });
    stripe.client.checkout.sessions.create.mockResolvedValue({
      id: 'sess_1',
      url: 'https://stripe.example/sess_1',
    });

    const result = await service.create(validDto, 'u1');

    expect(orders.createWithStockReservation).toHaveBeenCalledWith({
      items: validDto.items,
      totalAmount: validDto.totalAmount,
      userId: 'u1',
    });
    expect(orders.attachStripeSession).toHaveBeenCalledWith('o1', 'sess_1');
    expect(result).toEqual({
      url: 'https://stripe.example/sess_1',
      sessionId: 'sess_1',
      orderId: 'o1',
    });
  });

  it('cleans up order when Stripe fails', async () => {
    orders.createWithStockReservation.mockResolvedValue({ id: 'o1' });
    stripe.client.checkout.sessions.create.mockRejectedValue(
      new Error('Stripe down'),
    );

    await expect(service.create(validDto, 'u1')).rejects.toBeInstanceOf(
      CheckoutFailedException,
    );

    expect(orders.removeUnpaid).toHaveBeenCalledWith('o1');
  });

  it('throws when Stripe returns no URL', async () => {
    orders.createWithStockReservation.mockResolvedValue({ id: 'o1' });
    stripe.client.checkout.sessions.create.mockResolvedValue({
      id: 'sess_1',
      url: null,
    });

    await expect(service.create(validDto, undefined)).rejects.toBeInstanceOf(
      CheckoutFailedException,
    );
    expect(orders.removeUnpaid).toHaveBeenCalledWith('o1');
  });

  it('propagates upstream errors from order creation (e.g., out of stock)', async () => {
    const err = new Error('out of stock');
    orders.createWithStockReservation.mockRejectedValue(err);

    await expect(service.create(validDto, 'u1')).rejects.toBe(err);
    expect(stripe.client.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
