# Database Setup Guide

This guide explains how to set up and configure the PostgreSQL database for the Cycling CRM API.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ installed
- npm or yarn package manager

## Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the database configuration in `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=cycling_crm
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

3. For testing, ensure `.env.test` has the correct test database configuration:
   ```env
   DB_NAME=cycling_crm_test
   DB_USER=postgres
   DB_PASSWORD=test_password
   ```

## Database Setup

### 1. Create Databases

Create the development and test databases:

```bash
# Create development database
npm run db:create

# For test database, temporarily set NODE_ENV=test
NODE_ENV=test npm run db:create
```

Or manually using PostgreSQL:

```sql
CREATE DATABASE cycling_crm;
CREATE DATABASE cycling_crm_test;
```

### 2. Initialize Database Connection

Run the database setup script to test connectivity:

```bash
npm run db:setup
```

### 3. Run Migrations

Execute database migrations to create tables:

```bash
npm run migrate
```

Check migration status:

```bash
npm run migrate:status
```

### 4. Seed Database (Optional)

Populate the database with initial data:

```bash
npm run seed
```

## Database Management Commands

### Migrations

- `npm run migrate` - Run all pending migrations
- `npm run migrate:undo` - Undo the last migration
- `npm run migrate:status` - Check migration status
- `npm run migrate:create <name>` - Create a new migration

### Seeds

- `npm run seed` - Run all seeders
- `npm run seed:undo` - Undo all seeders

### Database Operations

- `npm run db:create` - Create database
- `npm run db:drop` - Drop database
- `npm run db:setup` - Test database connection

## Connection Configuration

The database connection is configured with the following features:

- **Connection Pooling**: Optimized for concurrent connections
- **SSL Support**: Enabled for production environments
- **Logging**: Database queries logged in development mode
- **Health Checks**: Built-in connection health monitoring

### Connection Pool Settings

```typescript
pool: {
  max: 10,      // Maximum number of connections
  min: 0,       // Minimum number of connections
  acquire: 30000, // Maximum time to get connection (ms)
  idle: 10000   // Maximum idle time before releasing (ms)
}
```

## Testing

The database configuration includes test-specific settings:

- Separate test database to avoid data conflicts
- Disabled logging for cleaner test output
- Automatic setup and teardown in test environment

Run database tests:

```bash
npm test -- database.test.ts
```

## Troubleshooting

### Connection Issues

1. **Database not found**: Ensure the database exists and the name is correct
2. **Authentication failed**: Check username and password
3. **Connection refused**: Verify PostgreSQL is running and accessible
4. **SSL errors**: Check SSL configuration for your environment

### Migration Issues

1. **Migration failed**: Check the migration file syntax and database permissions
2. **Table already exists**: Use `npm run migrate:status` to check current state
3. **Foreign key constraints**: Ensure referenced tables exist before creating relationships

### Performance Issues

1. **Slow queries**: Enable query logging to identify bottlenecks
2. **Connection timeouts**: Adjust pool settings based on your application load
3. **Memory usage**: Monitor connection pool usage and adjust limits

## Production Considerations

- Use environment variables for all sensitive configuration
- Enable SSL connections for security
- Configure appropriate connection pool limits
- Set up database monitoring and alerting
- Regular backup and recovery procedures
- Consider read replicas for high-traffic applications

## Next Steps

After completing the database setup:

1. Implement Sequelize models (Task 3)
2. Create model associations and validations
3. Set up authentication and authorization
4. Build API endpoints and business logic

For more information, refer to the main project documentation.