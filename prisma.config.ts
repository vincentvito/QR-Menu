// In Prisma 7, the CLI's datasource.url is ONLY used for migrate/introspect.
// The runtime PrismaClient gets its connection via the adapter in lib/prisma.ts
// (which reads DATABASE_URL — the Supabase PgBouncer pooler on port 6543).
//
// Migrations cannot run through PgBouncer, so point this at the direct URL
// (port 5432). Use DIRECT_URL when set; fall back to DATABASE_URL for local
// setups without a pooler.
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL ? env('DIRECT_URL') : env('DATABASE_URL'),
  },
})
