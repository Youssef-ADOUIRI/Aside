-- PostgreSQL initialization script for Aside
-- This runs automatically on first container startup

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the todos table
CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_position ON todos(user_id, position);

-- Create a replication user for PowerSync (with limited permissions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'powersync_user') THEN
        CREATE ROLE powersync_user WITH LOGIN PASSWORD 'powersync_password' REPLICATION;
    END IF;
END
$$;

-- Grant read access to PowerSync user
GRANT SELECT ON todos TO powersync_user;

-- Create publication for PowerSync logical replication
-- This defines which tables are replicated
DROP PUBLICATION IF EXISTS powersync_aside_pub;
CREATE PUBLICATION powersync_aside_pub FOR TABLE todos;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on updates
DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own todos
CREATE POLICY todos_user_isolation ON todos
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::UUID)
    WITH CHECK (user_id = current_setting('app.current_user_id', true)::UUID);

-- Grant usage to the main app user
GRANT ALL ON todos TO aside_user;
