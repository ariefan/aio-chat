import type { Config } from 'drizzle-kit'

// Auto-detect database type from DATABASE_URL
const isPostgres = process.env.DATABASE_URL?.includes('postgresql')

export default {
  schema: isPostgres ? './src/db/schema.ts' : './src/db/schema-sqlite.ts',
  out: './drizzle',
  dialect: isPostgres ? 'postgresql' : 'sqlite',
  dbCredentials: isPostgres
    ? {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aio-chat',
      }
    : {
        url: process.env.DATABASE_URL?.replace('file:', '') || './aio-chat.db',
      },
  verbose: true,
  strict: true,
} satisfies Config