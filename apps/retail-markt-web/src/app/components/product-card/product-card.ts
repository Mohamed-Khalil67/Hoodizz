import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '@prisma/client';

import { CartStore } from '../../stores/cart.store';
import { useVariantSelection } from '../variant-selector/use-variant-selection';

export interface CartAddEvent {
  product: Product;
  selectedSize: string;
  selectedColor: string;
}

@Component({
  selector: 'app-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly addToCart = output<CartAddEvent>();

  private readonly cartStore = inject(CartStore);
  private readonly variants = useVariantSelection();

  readonly selectedSize = this.variants.selectedSize;
  readonly selectedColor = this.variants.selectedColor;
  readonly attempted = this.variants.attempted;
  readonly canAdd = this.variants.canAdd;

  selectSize = (size: string) => this.variants.toggleSize(size);
  selectColor = (color: string) => this.variants.toggleColor(color);

  onAddToCart() {
    if (!this.canAdd()) {
      this.variants.markAttempted();
      return;
    }
    const product = this.product();
    const selectedSize = this.selectedSize()!;
    const selectedColor = this.selectedColor()!;
    this.cartStore.addToCartStore(product, 1, selectedSize, selectedColor);
    this.addToCart.emit({ product, selectedSize, selectedColor });
    this.variants.reset();
  }
}
