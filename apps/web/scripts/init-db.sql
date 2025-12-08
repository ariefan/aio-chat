-- =============================================================================
-- AIO-CHAT POC - PostgreSQL Database Initialization
-- =============================================================================
-- This script runs when the PostgreSQL container starts for the first time
-- =============================================================================

-- Create extensions needed for the application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE platform_type AS ENUM ('whatsapp', 'telegram');
    CREATE TYPE message_type AS ENUM ('text', 'image', 'document', 'audio', 'video');
    CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
    CREATE TYPE user_status AS ENUM ('pending', 'verified', 'active', 'inactive');
    CREATE TYPE conversation_status AS ENUM ('active', 'closed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
-- Note: These will be created after the tables exist
-- We'll let Drizzle handle the main schema creation

-- Create a simple health check table for monitoring
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'healthy'
);

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('healthy') ON CONFLICT DO NOTHING;

-- Grant permissions to the postgres user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Set up row level security (RLS) for future use
ALTER DATABASE postgres SET "app.timezone" = 'UTC';

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log database initialization
INSERT INTO health_check (status) VALUES ('initialized') ON CONFLICT DO NOTHING;