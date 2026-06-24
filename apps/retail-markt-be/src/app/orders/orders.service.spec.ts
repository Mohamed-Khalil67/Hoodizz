import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';

import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvalidOrderStateException,
  OrderNotFoundException,
  OrderOwnershipException,
  OutOfStockException,
  ProductNotFoundException,
} from '../common/exceptions';

type MockPrisma = {
  order: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
  };
  product: {
    findMany: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

const makePrisma = (): MockPrisma => ({
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('persists the order with items', () => {
      prisma.order.create.mockResolvedValue({ id: 'o1', items: [] });

      service.create({
        items: [
          {
            productId: 'p1',
            quantity: 2,
            price: 10,
            size: 'M',
            color: 'red',
          },
        ],
        totalAmount: 20,
        userId: 'u1',
      });

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 20,
            userId: 'u1',
            items: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('createWithStockReservation', () => {
    const setupTx = () => {
      const tx = makePrisma();
      prisma.$transaction.mockImplementation((fn) => fn(tx));
      return tx;
    };

    it('throws ProductNotFoundException when a product is missing', async () => {
      const tx = setupTx();
      tx.product.findMany.mockResolvedValue([]);

      await expect(
        service.createWithStockReservation({
          items: [
            { productId: 'missing', quantity: 1, price: 5, size: 'S', color: 'blue' },
          ],
          totalAmount: 5,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundException);
    });

    it('throws OutOfStockException when quantity exceeds stock', async () => {
      const tx = setupTx();
      tx.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Tee', stock: 1 },
      ]);

      await expect(
        service.createWithStockReservation({
          items: [
            { productId: 'p1', quantity: 5, price: 10, size: 'M', color: 'red' },
          ],
          totalAmount: 50,
        }),
      ).rejects.toBeInstanceOf(OutOfStockException);
    });

    it('decrements stock and creates order on success', async () => {
      const tx = setupTx();
      tx.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Tee', stock: 10 },
      ]);
      tx.order.create.mockResolvedValue({ id: 'o1', items: [] });

      const result = await service.createWithStockReservation({
        items: [
          { productId: 'p1', quantity: 3, price: 10, size: 'M', color: 'red' },
        ],
        totalAmount: 30,
        userId: 'u1',
      });

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stock: { decrement: 3 } },
      });
      expect(tx.order.create).toHaveBeenCalled();
      expect(result.id).toBe('o1');
    });
  });

  describe('findOne', () => {
    it('throws OrderNotFoundException when missing', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        OrderNotFoundException,
      );
    });

    it('returns the order when found', async () => {
      const order = { id: 'o1', userId: 'u1' };
      prisma.order.findUnique.mockResolvedValue(order);

      await expect(service.findOne('o1')).resolves.toBe(order);
    });
  });

  describe('findOneForUser', () => {
    it('throws OrderOwnershipException for foreign orders', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', userId: 'u2' });

      await expect(service.findOneForUser('o1', 'u1')).rejects.toBeInstanceOf(
        OrderOwnershipException,
      );
    });

    it('returns the order when the user owns it', async () => {
      const order = { id: 'o1', userId: 'u1' };
      prisma.order.findUnique.mockResolvedValue(order);

      await expect(service.findOneForUser('o1', 'u1')).resolves.toBe(order);
    });

    it('returns the order when it has no owner (guest)', async () => {
      const order = { id: 'o1', userId: null };
      prisma.order.findUnique.mockResolvedValue(order);

      await expect(service.findOneForUser('o1', 'u1')).resolves.toBe(order);
    });
  });

  describe('removeUnpaid', () => {
    it('returns success when order does not exist (idempotent)', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      const result = await service.removeUnpaid('o1');

      expect(result).toEqual({ success: true, orderId: 'o1' });
      expect(prisma.order.delete).not.toHaveBeenCalled();
    });

    it('deletes a PAYMENT_REQUIRED order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        userId: 'u1',
        status: OrderStatus.PAYMENT_REQUIRED,
      });

      const result = await service.removeUnpaid('o1', { userId: 'u1' });

      expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
      expect(result).toEqual({ success: true, orderId: 'o1' });
    });

    it('throws InvalidOrderStateException for non-PAYMENT_REQUIRED orders', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        userId: 'u1',
        status: OrderStatus.PENDING,
      });

      await expect(
        service.removeUnpaid('o1', { userId: 'u1' }),
      ).rejects.toBeInstanceOf(InvalidOrderStateException);
    });

    it('throws OrderOwnershipException when user mismatch', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        userId: 'u2',
        status: OrderStatus.PAYMENT_REQUIRED,
      });

      await expect(
        service.removeUnpaid('o1', { userId: 'u1' }),
      ).rejects.toBeInstanceOf(OrderOwnershipException);
    });
  });

  describe('update', () => {
    it('updates an owned order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', userId: 'u1' });
      prisma.order.update.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });

      await service.update(
        'o1',
        { id: 'o1', status: OrderStatus.PENDING },
        { userId: 'u1' },
      );

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { status: OrderStatus.PENDING },
        include: { items: { include: { product: true } } },
      });
    });

    it('rejects updating a foreign order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', userId: 'u2' });

      await expect(
        service.update(
          'o1',
          { id: 'o1', status: OrderStatus.PENDING },
          { userId: 'u1' },
        ),
      ).rejects.toBeInstanceOf(OrderOwnershipException);
    });
  });
});
