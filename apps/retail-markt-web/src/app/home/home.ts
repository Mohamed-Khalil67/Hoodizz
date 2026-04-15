import { Component, inject } from "@angular/core";
import { ProductCard } from "../components/product-card/product-card";
import { RouterLink } from "@angular/router";
import { Product } from "@prisma/client";
import { ProductStore } from "../stores/product.store";
import { CartStore } from "../stores/cart.store";

@Component({
  selector: "app-home",
  imports: [ProductCard, RouterLink],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  productStore = inject(ProductStore);
  cartStore = inject(CartStore);

  constructor() {
    this.productStore.getFeaturedProducts(true);
  }

  onAddToCart(product: Product) {
    this.cartStore.addToCartStore(product);
  }
}