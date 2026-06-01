import { afterNextRender, Component, inject } from '@angular/core';
import { ProductStore } from '../stores/product.store';
import { ProductCard } from '../components/product-card/product-card';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import untilDestroyed from '../utils/untilDestroyed';
import { CartStore } from '../stores/cart.store';

@Component({
  selector: 'app-products',
  imports: [ProductCard, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products {
  productStore     = inject(ProductStore);
  cartStore        = inject(CartStore);
  searchTerm       = '';
  selectedCategory = 'all';
  searchSubject    = new Subject<string>();
  destroyed        = untilDestroyed();

  constructor() {
    // Load products and categories from backend on init
    this.productStore.loadProducts();
    this.productStore.loadCategories();

    afterNextRender(() => {
      this.searchSubject
        .pipe(debounceTime(500), distinctUntilChanged(), this.destroyed())
        .subscribe((term) => {
          if (term) {
            this.productStore.searchProducts(term);
          } else {
            // If search cleared, reload with current category
            const cat = this.selectedCategory === 'all' ? undefined : this.selectedCategory;
            this.productStore.loadProducts(cat);
          }
        });
    });
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.searchTerm = '';
    // Call backend with selected category (undefined = all)
    const cat = category === 'all' ? undefined : category;
    this.productStore.loadProducts(cat);
  }
}
