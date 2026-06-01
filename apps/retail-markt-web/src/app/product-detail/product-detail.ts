import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductStore } from '../stores/product.store';
import { CartStore } from '../stores/cart.store';
import { Product } from '@prisma/client';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  productStore = inject(ProductStore);
  cartStore    = inject(CartStore);
  route        = inject(ActivatedRoute);

  selectedSize  = signal<string | null>(null);
  selectedColor = signal<string | null>(null);
  added         = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.productStore.loadProductById(id);
  }

  selectSize(size: string) {
    this.selectedSize.set(this.selectedSize() === size ? null : size);
  }

  selectColor(color: string) {
    this.selectedColor.set(this.selectedColor() === color ? null : color);
  }

  // Both size AND color required
  get canAdd(): boolean {
    return !!this.selectedSize() && !!this.selectedColor();
  }

  addToCart(product: Product) {
    if (!this.canAdd) return;
    this.cartStore.addToCartStore(
      product,
      1,
      this.selectedSize()!,
      this.selectedColor()!,
    );
    this.added.set(true);
    setTimeout(() => this.added.set(false), 1500);
  }
}
