import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderStore } from '../../stores/order.store';
import { isPlatformServer } from '@angular/common';

@Component({
  selector: 'app-checkout-failure',
  imports: [RouterLink],
  templateUrl: './checkout-failure.html',
  styleUrl: './checkout-failure.scss',
})
export class CheckoutFailure implements OnInit {
  orderStore = inject(OrderStore);
  route = inject(ActivatedRoute);
  platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if(isPlatformServer(this.platformId)) {
      return;    
    }
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (!orderId) {
      this.orderStore.setError('No order ID found');
      return;
    }
    this.orderStore.removeUnpaidOrder(orderId);
  }
}
