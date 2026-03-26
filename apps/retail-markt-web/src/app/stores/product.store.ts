import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Product } from '@prisma/client';
import { Apollo, gql } from 'apollo-angular';
import { tap } from 'rxjs';

const GET_PRODUCTS = gql`
  query GetProduct {
    products {
      id
      name
      description
      price
      image
      stripePriceId
    }
  }
`;

export interface ProductState {
  products: Product[];
  featureProducts: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  products: [],
  featureProducts: [],
  loading: false,
  error: null,
};

export const ProductStore = signalStore(
  {
    providedIn: 'root',
  },
  withState(initialState),
  withMethods((store, apollo = inject(Apollo)) => ({
    loadProducts() {
      patchState(store, { loading: true });
      apollo
        .watchQuery<{ products: Product[] }>({
          query: GET_PRODUCTS,
        })
        .valueChanges.pipe(
          tap({
            next: ({ data }) =>
              patchState(store, {
                products: (data?.products ?? []) as Product[],
                loading: false,
              }),
            error: (error) =>
              patchState(store, { error: error.message, loading: false }),
          }),
        )
        .subscribe();
    },
  })),
);
