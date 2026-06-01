import { Component, inject } from '@angular/core';
import { ProductCard } from '../components/product-card/product-card';
import { RouterLink } from '@angular/router';
import { ProductStore } from '../stores/product.store';

@Component({
  selector: 'app-home',
  imports: [ProductCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  productStore = inject(ProductStore);

  constructor() {
    this.productStore.getFeaturedProducts(true);
  }
}
