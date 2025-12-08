import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Database configuration - FORCE POSTGRES to eliminate TypeScript confusion
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aio-chat'
const isPostgres = DATABASE_URL.includes('postgresql')

// PostgreSQL connection
const pgClient = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

// ONLY use PostgreSQL database instance
export const db = drizzle(pgClient, {
  schema: await import('./schema'),
  logger: process.env.NODE_ENV === 'development',
})

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await pgClient`SELECT 1`
    console.log('✅ PostgreSQL connection successful')
    return true
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error)
    return false
  }
}

// Export ONLY PostgreSQL schema tables
export * from './schema'

// Export client for raw queries if needed
export { pgClient }