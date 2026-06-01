import { Component, inject } from '@angular/core';
import { CartStore } from '../stores/cart.store';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cart',
  imports: [DecimalPipe, RouterModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  cartStore = inject(CartStore);

  updateQuantity(productId: string, selectedSize: string, event: Event) {
    const input    = event.target as HTMLInputElement;
    const quantity = Number(input.value);
    if (quantity > 0) {
      this.cartStore.updateQuantity(productId, selectedSize, quantity);
    }
  }
}
