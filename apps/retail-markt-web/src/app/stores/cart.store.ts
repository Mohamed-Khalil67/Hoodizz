import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Product } from '@prisma/client';

const CART_LOCALSTORAGE_KEY = 'retail-markt-cart';

export type CartItem = Product & {
  quantity:      number;
  selectedSize:  string;   // always required — never null
  selectedColor: string;   // always required — never null
};

type CartState = {
  items: CartItem[];
};

const initialState: CartState = { items: [] };

const save = (items: CartItem[]) =>
  localStorage.setItem(CART_LOCALSTORAGE_KEY, JSON.stringify(items));

// Unique key per cart line: same product + same size = one row
const lineKey = (productId: string, size: string) => `${productId}__${size}`;

export const CartStore = signalStore(
  { providedIn: 'root' },

  withState(() => {
    if ('localStorage' in globalThis) {
      return {
        ...initialState,
        items: JSON.parse(
          localStorage.getItem(CART_LOCALSTORAGE_KEY) ?? '[]',
        ) as CartItem[],
      };
    }
    return initialState;
  }),

  withComputed((store) => ({
    totalItems:  computed(() => store.items().reduce((t, i) => t + i.quantity, 0)),
    totalAmount: computed(() => store.items().reduce((t, i) => t + i.price * i.quantity, 0)),
  })),

  withMethods((store) => ({

    addToCartStore(product: Product, quantity = 1, selectedSize: string, selectedColor: string) {
      const key      = lineKey(product.id, selectedSize);
      const existing = store.items().find(
        (i) => lineKey(i.id, i.selectedSize) === key,
      );

      const updatedItems: CartItem[] = existing
        ? store.items().map((i) =>
            lineKey(i.id, i.selectedSize) === key
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          )
        : [...store.items(), { ...product, quantity, selectedSize, selectedColor }];

      patchState(store, { items: updatedItems });
      save(updatedItems);
    },

    updateQuantity(productId: string, selectedSize: string, quantity: number) {
      const updatedItems = store.items().map((i) =>
        i.id === productId && i.selectedSize === selectedSize
          ? { ...i, quantity }
          : i,
      );
      patchState(store, { items: updatedItems });
      save(updatedItems);
    },

    removeFromCart(productId: string, selectedSize: string) {
      const updatedItems = store.items().filter(
        (i) => !(i.id === productId && i.selectedSize === selectedSize),
      );
      patchState(store, { items: updatedItems });
      save(updatedItems);
    },

    clearCart() {
      patchState(store, { items: [] });
      localStorage.removeItem(CART_LOCALSTORAGE_KEY);
    },

  })),
);
