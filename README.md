# Cycling Maintenance CRM API

A comprehensive backend system for managing bicycle maintenance services across multiple bike shops with role-based access control.

## Features

- **Multi-tenant Architecture**: Support for multiple bike shops with store-level data isolation
- **Role-based Access Control**: Admin, Store Owner, Staff, and Customer roles
- **Service Lifecycle Management**: From customer requests to completion and invoicing
- **JWT Authentication**: Secure token-based authentication
- **File Upload Support**: Photo management for service documentation
- **RESTful API**: Clean, well-documented API endpoints
- **TypeScript**: Full type safety and modern JavaScript features
- **Production Ready**: PM2 process management and clustering support

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **ORM**: Sequelize 6.x
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (jsonwebtoken)
- **Process Manager**: PM2
- **Testing**: Jest + Supertest
- **Validation**: Joi
- **File Upload**: Multer

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cycling-crm-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
# Create database
createdb cycling_crm

# Run migrations (will be available after task 2)
npm run migrate
```

## Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript code
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run migrate` - Run database migrations
- `npm run seed` - Run database seeders

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
```

3. Monitor the application:
```bash
pm2 status
pm2 logs cycling-crm-api
pm2 monit
```

## API Documentation

Once the server is running, visit:
- Health check: `GET /health`
- API info: `GET /api`

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── repositories/    # Data access layer
├── models/          # Sequelize models
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── tests/           # Test files
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `DB_*` - Database connection settings
- `JWT_SECRET` - JWT signing secret
- `MAX_FILE_SIZE` - Maximum upload file size

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

ISC License