export const STORAGE_KEYS = {
  CART: 'retail-markt-cart',
} as const;

export const COOKIES = {
  SESSION: '__rm_session',
} as const;

export const API_PATHS = {
  CHECKOUT: '/api/checkout',
  GRAPHQL: '/graphql',
} as const;

export const ROUTES = {
  LOGIN: '/auth/login',
  HOME: '/',
  ORDERS: '/orders',
  CHECKOUT_SUCCESS: '/checkout/success',
  CHECKOUT_CANCEL: '/checkout/cancel',
} as const;

export const PAGINATION = {
  PRODUCTS_PER_PAGE: 24,
  ORDERS_PER_PAGE: 20,
} as const;
