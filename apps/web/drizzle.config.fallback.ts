import type { Config } from 'drizzle-kit'

// Fallback to SQLite for development when PostgreSQL is not available
const isPostgresAvailable = process.env.DATABASE_URL?.includes('postgresql')

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: isPostgresAvailable ? 'postgresql' : 'sqlite',
  dbCredentials: isPostgresAvailable
    ? {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aio-chat',
      }
    : {
        url: './sqlite.db',
      },
  tablesFilter: ["aio-chat_*"],
  verbose: true,
  strict: true,
} satisfies Config