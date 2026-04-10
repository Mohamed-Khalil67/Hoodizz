import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderStore } from '../../stores/order.store';

@Component({
  selector: 'app-checkout-failure',
  imports: [RouterLink],
  templateUrl: './checkout-failure.html',
  styleUrl: './checkout-failure.scss',
})
export class CheckoutFailure implements OnInit {
  orderStore = inject(OrderStore);
  route = inject(ActivatedRoute);

  ngOnInit() {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (!orderId) {
      this.orderStore.setError('No order ID found');
      return;
    }
    this.orderStore.removeUnpaidOrder(orderId);
  }
}
