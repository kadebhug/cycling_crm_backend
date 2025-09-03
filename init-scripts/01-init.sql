-- Initialize the cycling_crm database
-- This script runs automatically when the container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- You can add any initial database setup here
-- Tables will be created by your application's migrations