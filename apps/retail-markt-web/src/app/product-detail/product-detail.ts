import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Product } from '@prisma/client';

import { ProductStore } from '../stores/product.store';
import { CartStore } from '../stores/cart.store';
import { useVariantSelection } from '../components/variant-selector/use-variant-selection';

const ADDED_CONFIRMATION_MS = 1500;

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  readonly productStore = inject(ProductStore);
  private readonly cartStore = inject(CartStore);
  private readonly route = inject(ActivatedRoute);

  private readonly variants = useVariantSelection();

  readonly selectedSize = this.variants.selectedSize;
  readonly selectedColor = this.variants.selectedColor;
  readonly canAdd = this.variants.canAdd;
  readonly added = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.productStore.loadProductById(id);
  }

  selectSize = (size: string) => this.variants.toggleSize(size);
  selectColor = (color: string) => this.variants.toggleColor(color);

  addToCart(product: Product) {
    if (!this.canAdd()) return;
    this.cartStore.addToCartStore(
      product,
      1,
      this.selectedSize()!,
      this.selectedColor()!,
    );
    this.added.set(true);
    setTimeout(() => this.added.set(false), ADDED_CONFIRMATION_MS);
  }
}
