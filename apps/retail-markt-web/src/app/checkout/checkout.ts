import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

import { CartStore } from '../stores/cart.store';
import { StripeService } from '../services/stripe';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  readonly cartStore = inject(CartStore);
  private readonly stripeService = inject(StripeService);

  checkout() {
    this.stripeService.createCheckoutSession().subscribe(({ url }) => {
      location.href = url;
    });
  }
}
