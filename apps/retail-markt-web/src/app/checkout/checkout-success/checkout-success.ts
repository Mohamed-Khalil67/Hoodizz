import { afterNextRender, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap } from 'rxjs';

import { OrderStore } from '../../stores/order.store';
import { CartStore } from '../../stores/cart.store';
import { OrderDetail } from '../../components/order-detail/order-detail';

@Component({
  selector: 'app-checkout-success',
  imports: [RouterLink, OrderDetail],
  templateUrl: './checkout-success.html',
  styleUrl: './checkout-success.scss',
})
export class CheckoutSuccess implements OnInit {
  readonly orderStore = inject(OrderStore);
  private readonly route = inject(ActivatedRoute);
  private readonly cartStore = inject(CartStore);

  readonly fetchOrder = rxMethod<string>(
    pipe(switchMap((orderId) => this.orderStore.getOrder(orderId))),
  );

  constructor() {
    afterNextRender(() => this.cartStore.clearCart());
  }

  ngOnInit() {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (!orderId) {
      this.orderStore.setError('Order ID is missing');
      return;
    }
    this.fetchOrder(orderId);
  }
}
