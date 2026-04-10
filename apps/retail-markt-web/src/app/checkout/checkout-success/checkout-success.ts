import { afterNextRender, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderStore } from '../../stores/order.store';
import { OrderDetail } from '../../orders/order-detail/order-detail';
import { CartStore } from '../../stores/cart.store';
import { map, pipe, switchMap } from 'rxjs';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { OrderStatus } from '@prisma/client';


@Component({
  selector: 'app-checkout-success',
  imports: [RouterLink, OrderDetail],
  templateUrl: './checkout-success.html',
  styleUrl: './checkout-success.scss',
})
export class CheckoutSuccess implements OnInit {
  orderStore = inject(OrderStore);
  route = inject(ActivatedRoute);
  cartStore = inject(CartStore);
  getAndUpdateOrder = rxMethod<string>(
    pipe(
      switchMap((orderId) => {
        return this.orderStore.getOrder(orderId)
      }),
      map((order) => {
        if(order.status === OrderStatus.PAYMENT_REQUIRED) {
          return this.orderStore.updateOrder({
            id: order.id,
            status: OrderStatus.PENDING,
          });
        }
        return null;
    })
    )
  )

  constructor() {
    afterNextRender(() => {
      this.cartStore.clearCart();
    })}

  ngOnInit() {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (!orderId) {
      this.orderStore.setError('Order ID is missing');
      return;
    }
    this.getAndUpdateOrder(orderId);
  }
}
