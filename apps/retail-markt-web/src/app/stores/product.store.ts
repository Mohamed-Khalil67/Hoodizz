import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Product } from '@prisma/client';
import { Apollo, gql } from 'apollo-angular';
import { catchError, EMPTY, map, pipe, switchMap, tap } from 'rxjs';

/* ---- GraphQL fragments ---- */

const PRODUCT_FIELDS = `
  id
  name
  description
  price
  images
  category
  sizes
  colors
  stock
  isFeatured
`;

const GET_PRODUCTS = gql`
  query GetProducts($category: String) {
    products(category: $category) {
      ${PRODUCT_FIELDS}
    }
  }
`;

const GET_FEATURED_PRODUCTS = gql`
  query GetFeaturedProducts($featured: Boolean) {
    products(featured: $featured) {
      ${PRODUCT_FIELDS}
    }
  }
`;

const SEARCH_PRODUCTS = gql`
  query SearchProducts($searchTerm: String!) {
    searchProducts(term: $searchTerm) {
      ${PRODUCT_FIELDS}
    }
  }
`;

const GET_PRODUCT_BY_ID = gql`
  query GetProductById($id: String!) {
    product(id: $id) {
      ${PRODUCT_FIELDS}
    }
  }
`;

const GET_CATEGORIES = gql`
  query GetCategories {
    categories
  }
`;

/* ---- State ---- */

export interface ProductState {
  products:        Product[];
  featureProducts: Product[];
  selectedProduct: Product | null;
  categories:      string[];
  loading:         boolean;
  error:           string | null;
}

const initialState: ProductState = {
  products:        [],
  featureProducts: [],
  selectedProduct: null,
  categories:      [],
  loading:         false,
  error:           null,
};

/* ---- Store ---- */

export const ProductStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, apollo = inject(Apollo)) => ({

    // Load all products, optionally filtered by category
    loadProducts(category?: string) {
      patchState(store, { loading: true });
      apollo
        .watchQuery<{ products: Product[] }>({
          query: GET_PRODUCTS,
          variables: { category: category ?? null },
        })
        .valueChanges.pipe(
          tap({
            next: ({ data }) =>
              patchState(store, {
                products: (data?.products ?? []) as Product[],
                loading: false,
                error: null,
              }),
            error: (error) =>
              patchState(store, { error: error.message, loading: false }),
          }),
        )
        .subscribe();
    },

    // Load categories from backend (reactive — reflects what's actually in DB)
    loadCategories() {
      apollo
        .watchQuery<{ categories: string[] }>({ query: GET_CATEGORIES })
        .valueChanges.pipe(
          tap({
            next: ({ data }) =>
              patchState(store, { categories: data?.categories ?? [] }),
            error: () => patchState(store, { categories: [] }),
          }),
        )
        .subscribe();
    },

    getFeaturedProducts: rxMethod<boolean>(
      pipe(
        switchMap((featured) =>
          apollo.query<{ products: Product[] }>({
            query: GET_FEATURED_PRODUCTS,
            variables: { featured },
          }),
        ),
        tap({
          next: ({ data }) =>
            patchState(store, {
              products: (data?.products ?? []) as Product[],
              loading: false,
              error: null,
            }),
          error: (error) =>
            patchState(store, { error: error.message, loading: false }),
        }),
      ),
    ),

    loadProductById(id: string) {
      patchState(store, { loading: true, selectedProduct: null });
      apollo
        .query<{ product: Product }>({
          query: GET_PRODUCT_BY_ID,
          variables: { id },
        })
        .pipe(
          map(({ data }) =>
            patchState(store, {
              selectedProduct: data?.product ?? null,
              loading: false,
              error: null,
            }),
          ),
          catchError((error) => {
            patchState(store, { error: error.message, loading: false });
            return EMPTY;
          }),
        )
        .subscribe();
    },

    searchProducts(searchTerm: string) {
      patchState(store, { loading: true });
      apollo
        .query<{ searchProducts: Product[] }>({
          query: SEARCH_PRODUCTS,
          variables: { searchTerm },
        })
        .pipe(
          map(({ data }) =>
            patchState(store, {
              products: (data?.searchProducts ?? []) as Product[],
              loading: false,
              error: null,
            }),
          ),
          catchError((error) => {
            patchState(store, { error: error.message, loading: false });
            return EMPTY;
          }),
        )
        .subscribe();
    },

  })),
);
