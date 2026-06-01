import { Component, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '@prisma/client';
import { CartStore } from '../../stores/cart.store';

export type CartAddEvent = {
  product:       Product;
  selectedSize:  string;
  selectedColor: string;
};

@Component({
  selector: 'app-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  product   = input.required<Product>();
  addToCart = output<CartAddEvent>();
  cartStore = inject(CartStore);

  selectedSize  = signal<string | null>(null);
  selectedColor = signal<string | null>(null);
  attempted     = signal(false);   // true after first failed add attempt

  selectSize(size: string) {
    this.selectedSize.set(this.selectedSize() === size ? null : size);
  }

  selectColor(color: string) {
    this.selectedColor.set(this.selectedColor() === color ? null : color);
  }

  get canAdd(): boolean {
    return !!this.selectedSize() && !!this.selectedColor();
  }

  onAddToCart() {
    if (!this.canAdd) {
      this.attempted.set(true);   // reveal hints only after clicking
      return;
    }
    const product      = this.product();
    const selectedSize  = this.selectedSize()!;
    const selectedColor = this.selectedColor()!;
    this.cartStore.addToCartStore(product, 1, selectedSize, selectedColor);
    this.addToCart.emit({ product, selectedSize, selectedColor });
    this.attempted.set(false);
  }
}
