import { afterNextRender, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductStore } from '../stores/product.store';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  productStore = inject(ProductStore);

  constructor() {
    afterNextRender(() => {
      this.productStore.loadProducts();
    });
  }

  onAddToCart() {
    // this.cartStore.addToCart(product);
  }
}
