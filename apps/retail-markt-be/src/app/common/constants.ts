export const PAGINATION_DEFAULTS = {
  TAKE: 20,
  MAX_TAKE: 100,
  SKIP: 0,
} as const;

export const RATE_LIMIT = {
  DEFAULT_TTL_MS: 60_000,
  DEFAULT_LIMIT: 60,
  CHECKOUT_TTL_MS: 60_000,
  CHECKOUT_LIMIT: 10,
  SEARCH_TTL_MS: 60_000,
  SEARCH_LIMIT: 30,
} as const;

export const AUTH = {
  BEARER_PREFIX: 'Bearer ',
} as const;
