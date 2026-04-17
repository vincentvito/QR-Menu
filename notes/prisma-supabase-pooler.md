# Prisma + Supabase pooler — migration freeze fix

## Symptom

`npx prisma migrate dev` hangs forever after printing:

```
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "postgres", schema "..." at
"aws-X-XX-XX-X.pooler.supabase.com:6543"
```

No error, no timeout — just a permanent freeze.

## Cause

Supabase's `:6543` URL is **PgBouncer in transaction-pooling mode**. Prisma
migrations need a plain, long-lived Postgres connection (session mode) to run
DDL and hold advisory locks. PgBouncer transaction mode doesn't support either,
so the migration engine waits on a lock it will never get.

The **runtime** `PrismaClient` is fine on `:6543` — short queries, one
transaction per request, exactly what PgBouncer is built for. It's only the
migration/introspect CLI that needs a direct connection.

## Fix

Two separate connection strings:

- `DATABASE_URL` → pooler, port **6543** (used by the app at runtime)
- `DIRECT_URL`   → direct connection, port **5432** (used by the Prisma CLI)

### `.env`

```env
DATABASE_URL="postgresql://USER:PASS@aws-X-XX-XX-X.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=YOUR_SCHEMA"
DIRECT_URL="postgresql://USER:PASS@aws-X-XX-XX-X.pooler.supabase.com:5432/postgres?schema=YOUR_SCHEMA"
```

Both values come from the Supabase dashboard → Project Settings → Database →
Connection string. Use the "Transaction pooler" URL for `DATABASE_URL` and the
"Session pooler" (or direct) URL for `DIRECT_URL`. Same credentials, different
ports.

### `prisma.config.ts`

In Prisma 7, `prisma.config.ts` decides what URL the CLI uses. Point it at
`DIRECT_URL` (fall back to `DATABASE_URL` for local setups with no pooler):

```ts
// Prisma 7's CLI datasource.url is ONLY used for migrate/introspect.
// The runtime PrismaClient uses the adapter in lib/prisma.ts (DATABASE_URL).
// Migrations cannot run through PgBouncer, so point this at the direct URL.
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_URL ? env('DIRECT_URL') : env('DATABASE_URL'),
  },
})
```

### Runtime adapter (for reference)

`lib/prisma.ts` uses `@prisma/adapter-pg` with `DATABASE_URL` so serverless
requests go through the pooler as intended.

## Verify

```bash
npx prisma migrate dev --name init
```

Should finish in a few seconds and create the migration file under
`prisma/migrations/`.

## Template checklist

When porting this to a fresh starter:

1. Keep `@prisma/adapter-pg` in `lib/prisma.ts` pointing at `DATABASE_URL`.
2. Ship `prisma.config.ts` with the `DIRECT_URL`-preferred datasource block above.
3. Include both `DATABASE_URL` and `DIRECT_URL` in `.env.example` with the
   `6543` / `5432` hint in a comment.
