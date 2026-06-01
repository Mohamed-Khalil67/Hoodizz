# 🎤 Hoodizz – Junior Frontend Interview Prep Guide

> All questions below are grounded in the actual code you wrote in this project.
> When answering, always try to connect the concept back to something specific you built.

---

## 1. Angular Fundamentals

---

**Q: What are standalone components and why did you use them?**

A: Standalone components are Angular components that manage their own dependencies directly through the `imports` array, instead of belonging to an `NgModule`. In this project, every component is standalone — for example, `Products`, `Cart`, `Home`, and `ProductCard` all declare their dependencies (like `FormsModule`, or another component) inside the `@Component` decorator itself.

The benefit is simpler code — you don't need a separate module file for every feature. Angular 17+ encourages this approach, and Angular 21 (which this project uses) is fully built around it.

---

**Q: What is lazy loading and how does your project use it?**

A: Lazy loading means a component or module is only downloaded and parsed by the browser when the user actually navigates to that route — not upfront. This makes the initial page load faster.

In this project, every route in `app.routes.ts` uses `loadComponent()` with a dynamic `import()`:

```ts
{
  path: 'products',
  loadComponent: () => import('./products/products').then((m) => m.Products),
}
```

So the `Products` component code is only fetched when the user visits `/products`.

---

**Q: What is the difference between `ngOnInit` and `constructor` in Angular?**

A: The `constructor` runs first and is used for dependency injection (getting services). `ngOnInit` runs after the component is fully initialized and its inputs are set — this is where you should put logic that depends on the component being ready.

In this project, `Products` loads products in the `constructor`:
```ts
constructor() {
  this.productStore.loadProducts();
  afterNextRender(() => { /* set up search debounce */ });
}
```

This is valid for services injected via `inject()`, but typically data fetching goes in `ngOnInit`. Knowing the difference shows you understand Angular's component lifecycle.

---

**Q: What is `afterNextRender` and why is it used in the Products component?**

A: `afterNextRender` is an Angular lifecycle hook that runs a callback after the next time the component renders in the browser. It's used specifically to safely access browser-only APIs (like `localStorage` or `window`) that don't exist during Server-Side Rendering (SSR).

In `Products`, the search debounce subscription is set up inside `afterNextRender` because the `Subject` piping relies on browser-side behavior and the component needs to be fully rendered first.

---

**Q: What is SSR (Server-Side Rendering) and does your project use it?**

A: SSR means the Angular app renders the HTML on the server (Node.js) before sending it to the browser. This improves first-page load time and SEO because the browser receives pre-rendered HTML immediately.

This project configures SSR via `app.config.server.ts` and uses `app.routes.server.ts` to define which routes render server-side. Products are rendered server-side; other pages are rendered on the client.

---

**Q: What is `provideZonelessChangeDetection()` and why is it in this project?**

A: By default, Angular uses Zone.js to track asynchronous events (like HTTP calls, user clicks) and automatically trigger change detection. Zoneless change detection removes this dependency — Angular instead relies on signals and explicit triggers to know when to re-render.

This project opts in to the zoneless approach in `app.config.ts`:
```ts
provideZonelessChangeDetection(),
```
This is more performant and is the direction Angular is heading.

---

## 2. State Management with NgRx Signals

---

**Q: What state management approach does this project use and why?**

A: The project uses **NgRx Signals** (`@ngrx/signals`) — a modern, signal-based state management library. There are three stores: `ProductStore`, `CartStore`, and `OrderStore`.

NgRx Signals was chosen over the classic NgRx (actions/reducers/effects) because it's simpler and works naturally with Angular's signal system — no need to define actions, effects, and reducers separately. For a project at this scale, it's the right fit.

---

**Q: What is a signal in Angular and how does it differ from an Observable?**

A: A **signal** is a reactive value that Angular tracks. When a signal changes, anything that reads it updates automatically. You read a signal by calling it like a function: `store.items()`.

An **Observable** is a stream of values over time (from RxJS). You must subscribe to it to get values, and unsubscribe to avoid memory leaks.

Signals are simpler and synchronous. Observables are more powerful for async streams. In this project, both are used — signals for UI state (via NgRx Signals stores) and Observables for GraphQL queries and the search debounce logic.

---

**Q: What is `patchState` and how do you use it?**

A: `patchState` is the NgRx Signals function for updating store state. It merges your partial update into the current state — you only provide the properties you want to change.

Example from `CartStore`:
```ts
patchState(store, { items: updatedItems });
```
This updates only `items` and leaves the rest of the state untouched.

---

**Q: What is `withComputed` and why is it used in CartStore?**

A: `withComputed` lets you define derived values that are automatically recalculated whenever the underlying state changes. In `CartStore`:

```ts
withComputed((store) => ({
  totalItems: computed(() => store.items().reduce((total, item) => total + item.quantity, 0)),
  totalAmount: computed(() => store.items().reduce((total, item) => total + item.price * item.quantity, 0)),
}))
```

`totalItems` and `totalAmount` are never stored directly — they're always calculated from `items`. This prevents bugs where you'd forget to update them manually.

---

**Q: How does the cart persist between page refreshes?**

A: The `CartStore` reads from and writes to `localStorage` on every change. On initialization:
```ts
withState(() => {
  if ('localStorage' in globalThis) {
    return {
      items: JSON.parse(localStorage.getItem(CART_LOCALSTORAGE_KEY) ?? '[]'),
    };
  }
  return initialState;
})
```
The `'localStorage' in globalThis` check is important because during SSR, `localStorage` doesn't exist — this guard prevents a crash on the server.

---

**Q: What is `rxMethod` in NgRx Signals?**

A: `rxMethod` is a helper that lets you use RxJS operators (like `switchMap`, `pipe`, `tap`) inside an NgRx Signals store method. It bridges the signal world and the Observable world.

In `OrderStore`, `removeUnpaidOrder` is an `rxMethod`:
```ts
removeUnpaidOrder: rxMethod<string>(
  pipe(
    switchMap((id) => apollo.mutate({ mutation: DELETE_UNPAID_ORDER, variables: { id } })),
    tap({ next: ({ data }) => { ... } })
  )
)
```

You call it like a normal method, but internally it handles the RxJS subscription for you.

---

## 3. RxJS

---

**Q: Why does the search feature use `debounceTime` and `distinctUntilChanged`?**

A: Without these, every single keystroke would fire a GraphQL query to the backend — very wasteful.

- `debounceTime(500)` waits 500ms after the user stops typing before emitting. So if the user types "hoodie", only one query is sent after they pause — not 6.
- `distinctUntilChanged()` ensures the same search term doesn't trigger a new query if nothing changed (e.g., user types "a", then deletes and types "a" again).

From `products.ts`:
```ts
this.searchSubject
  .pipe(debounceTime(500), distinctUntilChanged(), this.destroyed())
  .subscribe((term) => this.productStore.searchProducts(term));
```

---

**Q: What is a `Subject` in RxJS?**

A: A `Subject` is both an Observable and an Observer — you can push values into it manually with `.next(value)`, and subscribers will receive those values.

In `Products`, the `searchSubject` is a `Subject<string>`. When the user types in the search input, `onSearch()` calls `searchSubject.next(term)` to push the new value into the stream.

---

**Q: What is `switchMap` and why is it used here?**

A: `switchMap` transforms each value from an Observable into a new Observable — and crucially, it **cancels** the previous inner Observable if a new value arrives before it completes.

This is used in the product and order stores when making GraphQL queries. If the user triggers two searches quickly, `switchMap` cancels the first request and only processes the latest one, preventing stale results from overwriting fresh ones.

---

**Q: What is the `untilDestroyed` utility and why does it exist?**

A: It's a custom RxJS operator in this project (`utils/untilDestroyed.ts`) that automatically unsubscribes from an Observable when the component is destroyed. It uses Angular's `DestroyRef` internally.

Without this, subscriptions would keep running even after the component is removed from the page, causing memory leaks. It's used in the Products search pipeline:
```ts
this.searchSubject.pipe(debounceTime(500), distinctUntilChanged(), this.destroyed()).subscribe(...)
```

---

## 4. GraphQL with Apollo Client

---

**Q: What is GraphQL and how is it different from REST?**

A: GraphQL is a query language for APIs. Unlike REST (where the server decides what data each endpoint returns), with GraphQL the **client specifies exactly what data it needs** in the query.

In this project, the `GET_PRODUCTS` query only asks for `id, name, description, price, image, stripePriceId` — it doesn't fetch fields like `isFeatured` or `createdAt` that it doesn't need. This avoids over-fetching.

---

**Q: How is Apollo Client configured in this project?**

A: In `app.config.ts`, Apollo is set up using `provideApollo()`:
```ts
provideApollo(() => {
  const httpLink = inject(HttpLink);
  return {
    link: httpLink.create({ uri: environment.apiUrl + '/graphql' }),
    cache: new InMemoryCache(),
  };
})
```
`HttpLink` connects Apollo to Angular's `HttpClient`. `InMemoryCache` caches query results so the same data isn't fetched twice unnecessarily.

---

**Q: What is the difference between a GraphQL query and a mutation?**

A: A **query** is for reading data (like `GET_PRODUCTS`). A **mutation** is for writing data — creating, updating, or deleting (like `UPDATE_ORDER` or `DELETE_UNPAID_ORDER`).

In this project, `ProductStore` uses queries (`.query()`, `.watchQuery()`), while `OrderStore` uses both queries and mutations (`.mutate()`).

---

**Q: What is `watchQuery` vs `query` in Apollo?**

A: `query` fetches data once and completes. `watchQuery` creates a live connection — it also returns updated data if the cache changes later (useful for data that might be updated by mutations). `watchQuery` is used in `loadProducts()` for this reason.

---

## 5. Project Architecture

---

**Q: Can you explain the overall architecture of this project?**

A: It's an Nx monorepo containing two apps:

- **`retail-markt-be`** — a NestJS backend exposing a GraphQL API and a REST checkout endpoint (`POST /api/checkout` for Stripe). It uses Prisma as the ORM to talk to a PostgreSQL database.
- **`retail-markt-web`** — an Angular 21 frontend with SSR. It queries the backend via GraphQL using Apollo Client, manages state with NgRx Signals, and uses TailwindCSS + DaisyUI for styling.

Nx manages the build system, shared caching, and task orchestration across both apps.

---

**Q: Why use an Nx monorepo instead of two separate repos?**

A: A monorepo keeps both frontend and backend in the same codebase, making it easier to share types (like Prisma-generated models), run coordinated builds, and keep dependencies in sync. Nx adds smart build caching — it only rebuilds what changed.

---

**Q: What is Prisma and why is it used in this project?**

A: Prisma is a TypeScript ORM (Object-Relational Mapper) that lets you interact with the database using TypeScript instead of raw SQL. You define your data models in `schema.prisma`, and Prisma generates a type-safe client.

One interesting thing in this project: the `CartStore` imports `Product` directly from `@prisma/client` — so the frontend and backend share the exact same type definition.

---

**Q: How does the checkout flow work end-to-end?**

A: 
1. User adds items to the cart (`CartStore` saves to `localStorage`)
2. On the Checkout page, user clicks "Pay with Stripe"
3. Angular calls `POST /api/checkout` with the cart items and total
4. The NestJS backend creates an `Order` in the database, then calls Stripe to create a checkout session
5. Stripe returns a URL, and the browser redirects the user to Stripe's payment page
6. After payment, Stripe redirects to `/checkout/success` or `/checkout/cancel`
7. On success: the order status is updated from `PAYMENT_REQUIRED` to `PENDING`, and the cart is cleared
8. On cancel: the unpaid order is deleted via the `removeUnpaidOrder` GraphQL mutation

---

## 6. Questions About Your Code Quality

---

**Q: If you could improve one thing about this project, what would it be?**

Suggested answer: *"The product CRUD operations — `create`, `update`, and `delete` — are currently stubbed out in the backend service. I'd implement them properly using Prisma so admins can manage the product catalog. I'd also move the hardcoded `localhost` URLs into environment variables so the app works in both development and production."*

---

**Q: What bugs or improvements did you spot in your own code?**

Suggested answer: *"A few things I noticed: there are `console.log` statements I'd remove before going to production, the GraphQL schema file path in the backend is hardcoded instead of using `__dirname`, and there's a potential race condition in the checkout success page where the cart is cleared before the order data is confirmed to have loaded."*

---

**Q: What is an auth guard and how does it work in your routes?**

A: An auth guard is a function that runs before a route is activated. If it returns `false`, the navigation is blocked. In `app.routes.ts`, the `orders` route uses `canActivate: [authGuard]` — meaning only authenticated users can access their order history.

---

## 7. General Tips for the Interview

- **When explaining code**: Say *"In my project, I used X because Y"* — interviewers love specifics.
- **On things that are incomplete**: Be honest. Say *"This is a work in progress — the current implementation is a stub, and the next step would be to…"*
- **On bugs you found**: Mention them proactively. It shows self-awareness and code review skills.
- **On the tutorial**: It's fine to say you followed a tutorial. Frame it as: *"I followed a pet store tutorial to learn the patterns, and I'm adapting it for a clothing brand called Hoodizz."*
- **If you don't know something**: Say *"I'm not sure, but I'd look at the documentation / check how it's used in the project."* Never bluff.

---

*Good luck, Solomoon! You built something real — that already puts you ahead.*
