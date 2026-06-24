# CLAUDE.md — Retail Markt (Hoodizz) Architecture Reference

> Purpose: ground rules + the exact wire shapes & type sources used in this repo,
> so neither a human nor an LLM agent ever has to fall back to `any` / `unknown`.
> **If a type can be derived from a real definition in this project, derive it.**

## 1. Stack at a glance

| Layer | Tool | Version | Where |
|---|---|---|---|
| Monorepo | Nx | 22.5.4 | root |
| Frontend | Angular SSR | 21.1 | `apps/retail-markt-web/` |
| State | NgRx Signals | 21.0 | `apps/retail-markt-web/src/app/stores/` |
| GraphQL client | Apollo Angular | 13.0 | `app.config.ts` |
| Auth client | `@angular/fire` | 20.0 | `auth/auth.service.ts` |
| HTTP | `@angular/common/http` | 21.1 | `services/stripe.ts` |
| Backend | NestJS | 11 | `apps/retail-markt-be/` |
| GraphQL server | `@nestjs/graphql` + Apollo | 13.2 / 5.4 | `app.module.ts` |
| ORM | Prisma | 7.5 | `apps/retail-markt-be/prisma/` |
| Database | PostgreSQL | — | local: `retailmarkt` |
| Payments | Stripe Node SDK | 22.0 | `app/stripe/` |
| Auth verify | `firebase-admin` | 13.8 | `app/firebase/` |
| Validation | `class-validator` + `class-transformer` | 0.14 / 0.5 | DTOs |
| Security middleware | `helmet`, `@nestjs/throttler` | latest / latest | `main.ts`, `app.module.ts` |

## 2. Monorepo layout

```
retail-markt/
├── apps/
│   ├── retail-markt-be/                NestJS API
│   │   ├── prisma/                     schema + migrations + seed
│   │   ├── service-account.json        FIREBASE ADMIN CREDS (gitignored)
│   │   ├── .env                        DATABASE_URL, STRIPE_SECRET, …
│   │   └── src/
│   │       ├── main.ts                 bootstrap, helmet, ValidationPipe, raw body for /api/stripe/webhook
│   │       └── app/
│   │           ├── app.module.ts       GraphQL, Throttler, Config, Stripe, Firebase, modules
│   │           ├── common/
│   │           │   ├── env.config.ts        loadEnv() — validated AppEnv
│   │           │   ├── constants.ts         PAGINATION_DEFAULTS, RATE_LIMIT, AUTH
│   │           │   ├── exceptions.ts        OrderNotFoundException, OutOfStockException, …
│   │           │   └── filters/             GraphQLExceptionFilter
│   │           ├── firebase/
│   │           │   ├── firebase.service.ts          verifyToken / verifyTokenOrThrow
│   │           │   ├── firebase-auth.guard.ts       GraphQL+HTTP-aware guard, sets req.userId
│   │           │   └── current-user.decorator.ts    @CurrentUserId() → string
│   │           ├── prisma/                  PrismaService (PrismaPg adapter)
│   │           ├── orders/                  resolver/service/dto, ownership-enforcing
│   │           ├── products/                resolver/service/dto, paginated
│   │           ├── checkout/                REST POST /api/checkout (Stripe session create)
│   │           └── stripe/
│   │               ├── stripe.module.ts             global, DI token STRIPE_CLIENT
│   │               ├── stripe.service.ts            wraps client + exports types (see §6)
│   │               └── stripe-webhook.controller.ts POST /api/stripe/webhook (raw body)
│   │
│   └── retail-markt-web/                Angular SSR client
│       ├── .env                        NG_APP_FIREBASE_* (gitignored)
│       └── src/app/
│           ├── app.config.ts            providers (Apollo + auth link, Firebase, Router)
│           ├── app.constants.ts         STORAGE_KEYS, COOKIES, API_PATHS, ROUTES
│           ├── app.routes.ts            lazy routes
│           ├── auth/
│           │   ├── auth.service.ts      Firebase login, idToken cookie, SSR cookie parsing
│           │   └── auth-guard.ts        CanActivateFn for /orders
│           ├── components/
│           │   ├── header/
│           │   ├── order-detail/
│           │   ├── product-card/
│           │   └── variant-selector/
│           │       ├── variant-selector.ts          standalone size/color picker
│           │       └── use-variant-selection.ts     shared state composable
│           ├── services/stripe.ts       POST /api/checkout w/ Bearer token
│           └── stores/
│               ├── cart.store.ts        signalStore, localStorage-persisted
│               ├── order.store.ts       signalStore, Apollo queries/mutations
│               └── product.store.ts     signalStore, Apollo queries
└── .env                                NG_APP_FIREBASE_* (gitignored)
```

## 3. Communication channels (read this before writing any wire code)

There are **three** channels between the Angular client and the Nest API.

### 3.1 GraphQL — primary data plane

- **Endpoint**: `POST {apiUrl}/graphql`
- **Client setup**: `app.config.ts` → `provideApollo()` builds an `ApolloLink.from([authLink, httpLink])`
  - `authLink` calls `AuthService.getToken()` and adds `Authorization: Bearer <token>` if present
- **Server setup**: `app.module.ts` → `GraphQLModule.forRoot({ ..., context: ({ req }) => ({ req }) })`
  - The Express `Request` flows into the context so guards/decorators can read headers
- **Schema source of truth**: code-first, output at `apps/retail-markt-be/dist/schema.gql`
- **Entities** (= GraphQL `@ObjectType`s): `app/orders/entities/order.entity.ts`,
  `app/orders/entities/order-item.entity.ts`, `app/products/entities/product.entity.ts`,
  `app/orders/dto/delete-order-resp.ts`
- **Operations** (current):

  | Op | Args | Returns | Auth |
  |---|---|---|---|
  | `products(take?, skip?, featured?, category?)` | `FindProductsArgs` | `[Product]` | public |
  | `product(id)` | `String` | `Product` | public |
  | `categories` | — | `[String]` | public |
  | `searchProducts(term, take?, skip?)` | `SearchProductsArgs` | `[Product]` | public, throttled |
  | `userOrders(take?, skip?)` | `PaginationArgs` | `[Order]` | **FirebaseAuthGuard** |
  | `order(id)` | `String` | `Order` | **FirebaseAuthGuard** + ownership |
  | `removeUnpaidOrder(id)` | `String` | `DeleteOrderResp` | **FirebaseAuthGuard** + ownership |

  **Intentionally NOT exposed via GraphQL:**
  - `createOrder` — orders are created only via `POST /api/checkout`
    (transactional with stock decrement + Stripe session)
  - `updateOrder` — status flips are owned by the Stripe webhook
    (`checkout.session.completed` → `PENDING`) and a future admin module
    (delivery status). Customers must not be able to mark their own orders
    `DELIVERED`.
  - `createProduct` / `updateProduct` / `removeProduct` — admin operations.
    Re-introduce behind a `@Roles('admin')` guard once that module exists.
    For now, use the seed script or direct DB writes.

### 3.2 REST — payments only

| Verb | Path | Body | Headers | Returns | Auth |
|---|---|---|---|---|---|
| POST | `/api/checkout` | `CreateCheckoutDto` | `Authorization: Bearer <fbToken>?` | `{ url, sessionId, orderId }` | optional token; userId attached if valid |
| POST | `/api/stripe/webhook` | **raw body** | `stripe-signature` | `{ received: true }` | signature verified via `STRIPE_WEBHOOK_SECRET` |
| GET | `/health` | — | — | `{ status, uptime }` | public (excluded from `/api` prefix) |

`main.ts` mounts `express.raw({ type: 'application/json' })` **only** on
`/api/stripe/webhook` so signature verification gets the raw bytes. JSON body
parser is mounted for everything else.

### 3.3 Firebase ID-token cookie

- Cookie name: `__rm_session` (constant: `COOKIES.SESSION`)
- Written client-side from `onIdTokenChanged` (`auth.service.ts`)
- Read server-side during SSR via `inject(REQUEST)` cookie header
- Used as the source for `AuthService.getToken()` — which then flows into
  the GraphQL `authLink` and the REST checkout Authorization header

## 4. Data shapes — the canonical type sources

When you need a type, **import from these locations**. Don't redeclare.

### Database/domain types (single source of truth)

```ts
// Prisma — generated entity types
import { Product, Order, OrderItem, OrderStatus, Prisma } from '@prisma/client';
```

The Angular client also imports `@prisma/client` for types because the Nx
workspace ships them. Store states and Apollo response types use these.

### Backend DTOs (request shapes)

| DTO | File | Used by |
|---|---|---|
| `CreateProductInput` | `app/products/dto/create-product.input.ts` | GraphQL `createProduct` |
| `UpdateProductInput` | `app/products/dto/update-product.input.ts` | GraphQL `updateProduct` |
| `CreateOrderInput` / `OrderItemInput` | `app/orders/dto/create-order.input.ts` | GraphQL `createOrder` + internal `CreateOrderServiceDto` |
| `UpdateOrderInput` | `app/orders/dto/update-order.input.ts` | GraphQL `updateOrder` |
| `DeleteOrderResp` | `app/orders/dto/delete-order-resp.ts` | GraphQL `removeUnpaidOrder` |
| `PaginationArgs` | `app/orders/dto/paginated-orders.input.ts` | `@Args() pagination: PaginationArgs` |
| `CartItemDto` / `CreateCheckoutDto` | `app/checkout/dto/create-checkout.dto.ts` | REST `/api/checkout` |

All DTOs use `class-validator` decorators (`@IsUUID`, `@IsInt`, `@Min`, etc.).
The global `ValidationPipe` in `main.ts` runs with
`whitelist: true, forbidNonWhitelisted: true, transform: true`.

### Frontend store-state types

```ts
// stores/cart.store.ts
export type CartItem = Product & {
  quantity: number;
  selectedSize: string;
  selectedColor: string;
};

// stores/order.store.ts
export type OrderItemWithProduct = OrderItem & { product: Product };
export type OrderWithItems = Order & { items: OrderItemWithProduct[] };

// stores/product.store.ts — ProductState exported
```

### Frontend constants

`apps/retail-markt-web/src/app/app.constants.ts` — `STORAGE_KEYS`, `COOKIES`,
`API_PATHS`, `ROUTES`, `PAGINATION`. Use these. Never inline a literal that
exists here.

### Backend constants

`apps/retail-markt-be/src/app/common/constants.ts` — `PAGINATION_DEFAULTS`,
`RATE_LIMIT`, `AUTH`. Same rule.

## 5. Auth flow (end to end)

```
[Browser]                                           [Nest API]
─────────                                           ────────────
signInWithEmailAndPassword (Firebase)
        ↓
onIdTokenChanged → cookie __rm_session = JWT
        ↓
AuthService.getToken() → JWT
        ↓
Apollo authLink     →  GraphQL request
  Authorization: Bearer <JWT>     →  GqlExecutionContext → req.headers.authorization
                                  →  FirebaseAuthGuard
                                  →  firebase-admin.verifyIdToken(JWT)
                                  →  req.userId = decoded.uid
                                  →  @CurrentUserId() decorator → resolver
        OR
StripeService.createCheckoutSession() → POST /api/checkout
  Authorization: Bearer <JWT> (optional)
                                  →  CheckoutController extracts token manually
                                     (token is optional for guest checkout)
```

The Firebase guard works for BOTH GraphQL and REST contexts — it uses
`context.getType<'graphql'|'http'>()` to pull the correct request object.

## 6. Stripe v22 typing quirk — KNOWN, HANDLED

`stripe@22` has `export = StripeConstructor`. The default import is a callable
constructor. Its inner `Stripe` type alias is the **class instance type**, not
a namespace, so `Stripe.Event` / `Stripe.Checkout.Session` are NOT directly
reachable from `import Stripe from 'stripe'`.

**Solution (already implemented in `app/stripe/stripe.service.ts`)** — derive
the types from the instance method signatures:

```ts
import Stripe from 'stripe';
export type StripeNs = Stripe.Stripe;
export type StripeEvent = ReturnType<StripeNs['webhooks']['constructEvent']>;
export type StripeCheckoutSession = Awaited<
  ReturnType<StripeNs['checkout']['sessions']['create']>
>;
```

**Rule: do NOT use `unknown` / `any` to work around Stripe types.** If you
need another resource type, add it to `stripe.service.ts` using the same
pattern.

Examples for future additions:
```ts
export type StripeRefund = Awaited<ReturnType<StripeNs['refunds']['create']>>;
export type StripePaymentIntent =
  Awaited<ReturnType<StripeNs['paymentIntents']['create']>>;
```

## 7. Environment & secrets

| File | Tracked? | Contains |
|---|---|---|
| `.env` (root) | NO | `NG_APP_FIREBASE_*` — read by `@ngx-env/builder` at Angular build |
| `.env.example` (root) | YES | template |
| `apps/retail-markt-be/.env` | NO | `DATABASE_URL`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`, `NODE_ENV` |
| `apps/retail-markt-be/.env.example` | YES | template |
| `apps/retail-markt-be/service-account.json` | NO | Firebase admin private key |

Env is validated at startup via `loadEnv()` (in `common/env.config.ts`). Add
any new required keys to the `REQUIRED` list there.

## 8. Security baseline (already wired)

- `helmet()` global middleware (CSP off in dev)
- CORS locked to `FRONTEND_URL` with `credentials: true`
- `ValidationPipe` global: `whitelist + forbidNonWhitelisted + transform`
- `ThrottlerModule` global via **`GqlThrottlerGuard`** (in
  `common/guards/gql-throttler.guard.ts`) — the default `ThrottlerGuard`
  crashes on GraphQL requests because `context.switchToHttp()` returns empty
  stubs; our guard overrides `getRequestResponse` to pull `req`/`res` out of
  `GqlExecutionContext`. Limits: default 60 req/min/IP; checkout 10/min,
  search 30/min. To do this, the Apollo `context` builder MUST also pass
  `res` through: `({ req, res }) => ({ req, res })`
- GraphQL `playground` + `introspection` **OFF in production** (`isProduction()`)
- GraphQL `formatError` strips internals in production
- `GraphQLExceptionFilter` maps Prisma errors → GraphQL codes (`P2002→CONFLICT`,
  `P2025→NOT_FOUND`)
- Firebase token: header-only (`Authorization: Bearer …`); never a GraphQL arg

## 9. Conventions — do this, not that

- **Never use `unknown` or `any` to silence the compiler.** Derive the type
  (see §6 for Stripe pattern) or import from §4.
- **No magic strings.** Use `app.constants.ts` (FE) or `common/constants.ts` (BE).
- **No `console.log`.** Use the Nest `Logger` on the backend; on the frontend,
  prefer explicit error state in the signal store and surface it in the
  template. Commented-out logs (`// console.log(...)`) MUST be deleted.
- **No silent token-verification failures.** `verifyTokenOrThrow` exists for
  that. `verifyToken` returning `undefined` is only for guest-allowed paths.
- **Pagination is mandatory** on any `findMany` returning user-visible lists.
  `PAGINATION_DEFAULTS` is the default; never call `findMany` unbounded.
- **DB writes that touch multiple rows** go through `prisma.$transaction` —
  see `OrdersService.createWithStockReservation` for the pattern.
- **Ownership before mutation.** `findOneForUser`, `update({ userId })`,
  `removeUnpaid({ userId })` — never `findUnique → mutate` without checking
  the requesting user.
- **Custom exceptions** live in `common/exceptions.ts`. Throw those, not
  bare `BadRequestException('msg')`.
- **Never mix `@Args()` (bare) with `@Args('name', …)` on the same resolver
  method.** The bare `@Args()` binds the WHOLE GraphQL args object to a class
  and `ValidationPipe({ forbidNonWhitelisted: true })` will reject any field
  that isn't declared on that class — including the ones you added via the
  named `@Args('foo')` decorators. Instead, declare a single `@ArgsType()`
  class (optionally extending `PaginationArgs`) and use one bare `@Args()`.
  See `products/dto/find-products.args.ts` for the canonical example
  (`FindProductsArgs extends PaginationArgs` with `featured` + `category`,
  `SearchProductsArgs extends PaginationArgs` with `term`).
- **Component templates** stay in `.html`/`.scss` files. Inline templates are
  reserved for the small shared components (e.g. `variant-selector`).
- **Tests live next to the source** as `*.spec.ts`. Use `jest.Mock` typed
  manually (`makePrisma`) — DO NOT pull in a real DB.

## 10. Common tasks — where to plug things in

| I want to … | File |
|---|---|
| add a new GraphQL query/mutation | resolver in the matching module |
| add a DTO | new file under that module's `dto/`, decorate with `class-validator` |
| add a Stripe webhook event | extend `dispatch()` in `stripe-webhook.controller.ts` |
| add a new env var | `common/env.config.ts` (+ both `.env.example` files) |
| add a new shared client constant | `apps/retail-markt-web/src/app/app.constants.ts` |
| add a guarded mutation | `@UseGuards(FirebaseAuthGuard)` + `@CurrentUserId()` |
| throttle a specific endpoint | `@Throttle({ default: { ttl, limit } })` |
| add a new domain exception | `common/exceptions.ts` |
