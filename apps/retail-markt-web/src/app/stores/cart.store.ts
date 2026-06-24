import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Product } from '@prisma/client';
import { STORAGE_KEYS } from '../app.constants';

export type CartItem = Product & {
  quantity: number;
  selectedSize: string;
  selectedColor: string;
};

type CartState = {
  items: CartItem[];
};

const initialState: CartState = { items: [] };

const lineKey = (productId: string, size: string) => `${productId}__${size}`;

const isBrowser = () => typeof globalThis !== 'undefined' && 'localStorage' in globalThis;

const save = (items: CartItem[]) => {
  if (isBrowser()) {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
  }
};

const loadFromStorage = (): CartItem[] => {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

export const CartStore = signalStore(
  { providedIn: 'root' },

  withState((): CartState => ({ ...initialState, items: loadFromStorage() })),

  withComputed((store) => ({
    totalItems: computed(() =>
      store.items().reduce((t, i) => t + i.quantity, 0),
    ),
    totalAmount: computed(() =>
      store.items().reduce((t, i) => t + i.price * i.quantity, 0),
    ),
  })),

  withMethods((store) => ({
    addToCartStore(
      product: Product,
      quantity = 1,
      selectedSize: string,
      selectedColor: string,
    ) {
      const key = lineKey(product.id, selectedSize);
      const existing = store
        .items()
        .find((i) => lineKey(i.id, i.selectedSize) === key);

      const updatedItems: CartItem[] = existing
        ? store.items().map((i) =>
            lineKey(i.id, i.selectedSize) === key
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          )
        : [
            ...store.items(),
            { ...product, quantity, selectedSize, selectedColor },
          ];

      patchState(store, { items: updatedItems });
      save(updatedItems);
    },

    updateQuantity(productId: string, selectedSize: string, quantity: number) {
      if (quantity < 1) return;
      const updatedItems = store.items().map((i) =>
        i.id === productId && i.selectedSize === selectedSize
          ? { ...i, quantity }
          : i,
      );
      patchState(store, { items: updatedItems });
      save(updatedItems);
    },

    removeFromCart(productId: string, selectedSize: string) {
      const updatedItems = store
        .items()
        .filter((i) => !(i.id === productId && i.selectedSize === selectedSize));
      patchState(store, { items: updatedItems });
      save(updatedItems);
    },

    clearCart() {
      patchState(store, { items: [] });
      if (isBrowser()) {
        localStorage.removeItem(STORAGE_KEYS.CART);
      }
    },
  })),
);
