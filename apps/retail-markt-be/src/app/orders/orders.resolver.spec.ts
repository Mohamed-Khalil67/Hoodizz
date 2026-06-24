import { Test, TestingModule } from '@nestjs/testing';
import { OrdersResolver } from './orders.resolver';
import { OrdersService } from './orders.service';

describe('OrdersResolver', () => {
  let resolver: OrdersResolver;
  let ordersService: {
    findUserOrders: jest.Mock;
    findOneForUser: jest.Mock;
    removeUnpaid: jest.Mock;
  };

  beforeEach(async () => {
    ordersService = {
      findUserOrders: jest.fn(),
      findOneForUser: jest.fn(),
      removeUnpaid: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersResolver,
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    resolver = module.get<OrdersResolver>(OrdersResolver);
  });

  it('is defined', () => {
    expect(resolver).toBeDefined();
  });

  it('userOrders forwards userId + pagination to the service', () => {
    resolver.findUserOrders('user-1', { take: 5, skip: 10 });
    expect(ordersService.findUserOrders).toHaveBeenCalledWith('user-1', {
      take: 5,
      skip: 10,
    });
  });

  it('order forwards userId for ownership enforcement', () => {
    resolver.findOne('order-1', 'user-1');
    expect(ordersService.findOneForUser).toHaveBeenCalledWith(
      'order-1',
      'user-1',
    );
  });

  it('removeUnpaidOrder forwards userId option', () => {
    resolver.removeUnpaidOrder('order-1', 'user-1');
    expect(ordersService.removeUnpaid).toHaveBeenCalledWith('order-1', {
      userId: 'user-1',
    });
  });
});
