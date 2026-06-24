import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Order, OrderItem, Product } from '@prisma/client';
import { Apollo, gql } from 'apollo-angular';
import { catchError, EMPTY, map, pipe, switchMap, tap } from 'rxjs';

const ORDER_ITEM_FIELDS = `
  id
  quantity
  price
  size
  color
  product {
    id
    name
    images
  }
`;

const ORDER_FIELDS = `
  id
  totalAmount
  status
  items { ${ORDER_ITEM_FIELDS} }
  createdAt
`;

const GET_ORDER = gql`
  query GetOrder($id: String!) {
    order(id: $id) { ${ORDER_FIELDS} }
  }
`;

const DELETE_UNPAID_ORDER = gql`
  mutation RemoveOrder($id: String!) {
    removeUnpaidOrder(id: $id) {
      orderId
      success
      error
    }
  }
`;

const GET_USER_ORDERS = gql`
  query GetUserOrders($take: Int, $skip: Int) {
    userOrders(take: $take, skip: $skip) { ${ORDER_FIELDS} }
  }
`;

export type OrderItemWithProduct = OrderItem & {
  product: Product;
};

export type OrderWithItems = Order & {
  items: OrderItemWithProduct[];
};

type OrderState = {
  loading: boolean;
  orders: OrderWithItems[];
  orderDetail: OrderWithItems | null;
  error: string | null;
};

const initialState: OrderState = {
  loading: false,
  orders: [],
  orderDetail: null,
  error: null,
};

export const OrderStore = signalStore(
  { providedIn: 'root' },
  withState(() => initialState),
  withMethods((store, apollo = inject(Apollo)) => ({
    getOrder(id: string) {
      patchState(store, { error: null });
      return apollo
        .query<{ order: OrderWithItems }>({
          query: GET_ORDER,
          variables: { id },
          fetchPolicy: 'network-only',
        })
        .pipe(
          tap({
            next: ({ data }) =>
              patchState(store, { orderDetail: data?.order ?? null }),
            error: (error) => patchState(store, { error: error.message }),
          }),
          map(({ data }) => data?.order as OrderWithItems),
        );
    },

    getUserOrders(args: { take?: number; skip?: number } = {}) {
      patchState(store, { loading: true, error: null });
      return apollo
        .query<{ userOrders: OrderWithItems[] }>({
          query: GET_USER_ORDERS,
          variables: { take: args.take ?? 20, skip: args.skip ?? 0 },
          fetchPolicy: 'network-only',
        })
        .pipe(
          tap((result) => {
            patchState(store, {
              orders: result.data?.userOrders ?? [],
              loading: false,
              error: null,
            });
          }),
          catchError((err) => {
            patchState(store, { error: err.message, loading: false });
            return EMPTY;
          }),
        );
    },

    removeUnpaidOrder: rxMethod<string>(
      pipe(
        switchMap((id) =>
          apollo.mutate<{
            removeUnpaidOrder: {
              success: boolean;
              orderId: string;
              error?: string;
            };
          }>({
            mutation: DELETE_UNPAID_ORDER,
            variables: { id },
          }),
        ),
        tap({
          next: () => patchState(store, { error: null }),
          error: (error) => patchState(store, { error: error.message }),
        }),
      ),
    ),

    setError(error: string) {
      patchState(store, { error });
    },
  })),
);
