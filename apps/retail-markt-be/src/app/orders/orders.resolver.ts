import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { DeleteOrderResp } from './dto/delete-order-resp';
import { PaginationArgs } from './dto/paginated-orders.input';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { CurrentUserId } from '../firebase/current-user.decorator';

/**
 * Order creation is intentionally NOT exposed as a GraphQL mutation.
 * The only legitimate way to create an order is `POST /api/checkout`, which
 * routes through `OrdersService.createWithStockReservation` (transactional
 * stock decrement + Stripe session). Likewise, status mutation is handled by
 * the Stripe webhook controller — customers should never be able to flip
 * their own order to DELIVERED via GraphQL.
 */
@Resolver(() => Order)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(FirebaseAuthGuard)
  @Query(() => [Order], { name: 'userOrders' })
  findUserOrders(
    @CurrentUserId() userId: string,
    @Args() pagination: PaginationArgs,
  ) {
    return this.ordersService.findUserOrders(userId, pagination);
  }

  @UseGuards(FirebaseAuthGuard)
  @Query(() => Order, { name: 'order' })
  findOne(
    @Args('id', { type: () => String }) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.ordersService.findOneForUser(id, userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => DeleteOrderResp)
  removeUnpaidOrder(
    @Args('id', { type: () => String }) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.ordersService.removeUnpaid(id, { userId });
  }
}
