# Retail Markt

A full-stack clothing e-commerce platform built with Angular (SSR) and NestJS, using an Nx monorepo.

**Stack:** Angular 21 · NestJS 11 · GraphQL (Apollo) · Prisma 7 · PostgreSQL · Firebase Auth · Stripe

---

## Apps

| App                | Description               |
| ------------------ | ------------------------- |
| `retail-markt-web` | Angular frontend with SSR |
| `retail-markt-be`  | NestJS GraphQL API        |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop (for local PostgreSQL)
- Nx CLI: `npm install -g nx`

### Install dependencies

```sh
npm install
```

### Environment variables

Create `.env` in `apps/retail-markt-be/`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/retailmarkt
```

### Run locally

```sh
# Frontend (http://localhost:4200)
nx serve retail-markt-web

# Backend (http://localhost:3000/api)
nx serve retail-markt-be
```

---

## Database (Prisma)

```sh
# Navigate to backend app
cd apps/retail-markt-be

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client after schema changes
npx prisma generate

# Format schema
npx prisma format

# Seed the database
npx ts-node ./prisma/seed.ts
```

> Note: Using Prisma v7 — the adapter must be declared. See `prisma.config.ts`.

---

## Build

```sh
# Frontend
npx nx build retail-markt-web --configuration=production

# Backend
npx nx build retail-markt-be --configuration=production
```

---

## Nx Workspace

```sh
# Run any target
npx nx <target> <project-name>

# Visualize project graph
npx nx graph

# Sync TypeScript project references
npx nx sync
```

---

## Notes

- Creating a new Nx workspace: `npx create-nx-workspace` (create project name and skip everything else)

- Adding NestJS to the project: `nx add @nx/nest` (if nx is installed globally)

- Creating NestJS application: `nx g @nx/nest:app apps/retail-markt-be` (choose jest, linter)

- To activate the NestJS application: `nx serve retail-markt-be`

- Install Prisma: `npm install prisma --save-dev`

- Docker Desktop is required to run the database in a container locally

- Create a new database in Neon and copy the connection string to the `.env` file in the backend application

- To create the Prisma schema: `npx prisma init` (run in `apps/retail-markt-be`)

- After changing the Prisma schema, run: `npx prisma generate` (in `apps/retail-markt-be`). Use `npx prisma format` to format the schema file.

- Repair `seed.ts` and `productsList.ts`, then to create the seed data: `npx ts-node ./prisma/seed.ts` (in `apps/retail-markt-be` — also update `package.json` to add the seed command in the prisma section)

- In `apps/retail-markt-be`, run `npx prisma migrate dev --name init`. Pay attention that we are using Prisma v7 not v6 — the adapter needs to be declared.

- Setting up GraphQL: `npm i @nestjs/graphql @nestjs/apollo @apollo/server @as-integrations/express5 graphql`

- To generate the schema file for GraphQL, add `autoSchemaFile: join(process.cwd(), 'src/schema.gql')` in `app.module.ts` inside `GraphQLModule.forRoot()`. Also import `join` from `node:path`. Run the application and the schema file will be generated. Nx Daemon needs to be activated or restarted to see the changes.

- To add Angular: `nx add @nx/angular` — also change a variable in `tsconfig.base.json` to `false`

- Firebase E2E Authentication flow: `npm install --legacy-peer-deps firebase @angular/fire`

![Architecture diagram](image.png)
