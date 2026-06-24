import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrderServiceDto,
  OrderItemInput,
} from './dto/create-order.input';
import { UpdateOrderInput } from './dto/update-order.input';
import { DeleteOrderResp } from './dto/delete-order-resp';
import {
  InvalidOrderStateException,
  OrderNotFoundException,
  OrderOwnershipException,
  OutOfStockException,
  ProductNotFoundException,
} from '../common/exceptions';
import { PAGINATION_DEFAULTS } from '../common/constants';

const ORDER_INCLUDE = {
  items: { include: { product: true } },
} as const satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  create(input: CreateOrderServiceDto) {
    return this.prisma.order.create({
      data: {
        totalAmount: input.totalAmount,
        userId: input.userId,
        items: { create: input.items.map(this.toItemCreate) },
      },
      include: ORDER_INCLUDE,
    });
  }

  /**
   * Transactionally validates stock, decrements it, and creates the order.
   * Throws OutOfStockException if any item exceeds available stock.
   */
  async createWithStockReservation(input: CreateOrderServiceDto) {
    return this.prisma.$transaction(async (tx) => {
      const productIds = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const byId = new Map(products.map((p) => [p.id, p]));

      for (const item of input.items) {
        const product = byId.get(item.productId);
        if (!product) {
          throw new ProductNotFoundException(item.productId);
        }
        if (product.stock < item.quantity) {
          throw new OutOfStockException(
            product.name,
            product.stock,
            item.quantity,
          );
        }
      }

      for (const item of input.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.order.create({
        data: {
          totalAmount: input.totalAmount,
          userId: input.userId,
          items: { create: input.items.map(this.toItemCreate) },
        },
        include: ORDER_INCLUDE,
      });
    });
  }

  findAll(args?: { take?: number; skip?: number }) {
    return this.prisma.order.findMany({
      take: args?.take ?? PAGINATION_DEFAULTS.TAKE,
      skip: args?.skip ?? PAGINATION_DEFAULTS.SKIP,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findUserOrders(userId: string, args?: { take?: number; skip?: number }) {
    return this.prisma.order.findMany({
      where: { userId, status: { not: OrderStatus.PAYMENT_REQUIRED } },
      take: args?.take ?? PAGINATION_DEFAULTS.TAKE,
      skip: args?.skip ?? PAGINATION_DEFAULTS.SKIP,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new OrderNotFoundException(id);
    return order;
  }

  async findOneForUser(id: string, userId: string) {
    const order = await this.findOne(id);
    if (order.userId && order.userId !== userId) {
      throw new OrderOwnershipException();
    }
    return order;
  }

  async findByStripeSession(sessionId: string) {
    return this.prisma.order.findFirst({
      where: { paymentId: sessionId },
      include: ORDER_INCLUDE,
    });
  }

  async update(
    id: string,
    input: UpdateOrderInput,
    options?: { userId?: string },
  ) {
    const order = await this.findOne(id);
    if (options?.userId && order.userId && order.userId !== options.userId) {
      throw new OrderOwnershipException();
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: input.status },
      include: ORDER_INCLUDE,
    });
  }

  async updateByStripeSession(
    sessionId: string,
    data: Prisma.OrderUpdateInput,
  ) {
    return this.prisma.order.updateMany({
      where: { paymentId: sessionId },
      data,
    });
  }

  async attachStripeSession(orderId: string, sessionId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { paymentId: sessionId },
    });
  }

  async removeUnpaid(
    id: string,
    options?: { userId?: string },
  ): Promise<DeleteOrderResp> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      return { success: true, orderId: id };
    }

    if (options?.userId && order.userId && order.userId !== options.userId) {
      throw new OrderOwnershipException();
    }

    if (order.status !== OrderStatus.PAYMENT_REQUIRED) {
      throw new InvalidOrderStateException(order.status, 'delete');
    }

    await this.prisma.order.delete({ where: { id } });
    return { success: true, orderId: id };
  }

  private toItemCreate = (item: OrderItemInput) => ({
    quantity: item.quantity,
    price: item.price,
    size: item.size,
    color: item.color,
    product: { connect: { id: item.productId } },
  });
}
