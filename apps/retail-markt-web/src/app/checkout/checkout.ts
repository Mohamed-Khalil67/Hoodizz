import { Component, inject } from '@angular/core';
import { CartStore } from '../stores/cart.store';
import { CommonModule, DecimalPipe } from '@angular/common';
import { StripeService } from '../services/stripe';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  cartStore = inject(CartStore);
  stripeService = inject(StripeService);

  checkout() {
    // console.log(this.cartStore.items());
    this.stripeService.createCheckoutSession().subscribe(({ url }) => {
      location.href = url;
    });
  }
}
