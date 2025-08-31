# Cycling CRM API - File Structure

This document describes the organized file structure of the Cycling CRM API project, following best practices for Node.js/TypeScript applications.

## Directory Structure

```
src/
├── api/                    # API layer components
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   └── routes/            # API route definitions
├── business/               # Business logic layer
│   └── services/          # Business logic services
├── config/                 # Configuration files
│   ├── auth.ts           # Authentication configuration
│   ├── database.ts       # Database configuration
│   ├── environment.ts    # Environment variables
│   ├── storage.ts        # Storage configuration
│   └── index.ts          # Configuration exports
├── constants/              # Application constants
│   ├── app.constants.ts   # App-wide constants
│   ├── api.constants.ts   # API-related constants
│   ├── auth.constants.ts  # Authentication constants
│   ├── database.constants.ts # Database constants
│   └── index.ts          # Constants exports
├── data/                   # Data access layer
│   └── repositories/      # Data repositories
├── database/               # Database-related files
│   ├── migrations/        # Database migrations
│   ├── models/            # Database models
│   └── seeders/           # Database seeders
├── helpers/                # Utility helper functions
│   ├── date.helpers.ts    # Date utilities
│   ├── file.helpers.ts    # File utilities
│   ├── string.helpers.ts  # String utilities
│   ├── validation.helpers.ts # Validation utilities
│   └── index.ts          # Helper exports
├── interfaces/             # TypeScript interfaces
│   ├── controller.interfaces.ts # Controller interfaces
│   ├── database.interfaces.ts   # Database interfaces
│   ├── repository.interfaces.ts # Repository interfaces
│   ├── service.interfaces.ts    # Service interfaces
│   └── index.ts          # Interface exports
├── types/                  # TypeScript type definitions
│   ├── api/               # API-related types
│   │   ├── request.types.ts    # Request types
│   │   ├── response.types.ts   # Response types
│   │   ├── route.types.ts      # Route types
│   │   └── index.ts            # API types exports
│   ├── auth/               # Authentication types
│   │   ├── user.types.ts       # User types
│   │   ├── token.types.ts      # Token types
│   │   ├── permission.types.ts # Permission types
│   │   └── index.ts            # Auth types exports
│   ├── common/              # Common types
│   │   ├── base.types.ts       # Base types
│   │   ├── response.types.ts   # Response types
│   │   ├── pagination.types.ts # Pagination types
│   │   └── index.ts            # Common types exports
│   ├── database/            # Database types
│   │   ├── model.types.ts      # Model types
│   │   ├── query.types.ts      # Query types
│   │   ├── migration.types.ts  # Migration types
│   │   └── index.ts            # Database types exports
│   └── index.ts             # Main types exports
├── utils/                   # Utility modules
│   ├── database.ts         # Database utilities
│   ├── encryption.ts       # Encryption utilities
│   ├── health-check.ts     # Health check utilities
│   ├── logger.ts           # Logging utilities
│   ├── validation.ts       # Validation utilities
│   └── index.ts            # Utils exports
├── validators/              # Validation schemas
│   ├── auth.validators.ts  # Authentication validators
│   ├── common.validators.ts # Common validators
│   ├── customer.validators.ts # Customer validators
│   ├── store.validators.ts # Store validators
│   ├── user.validators.ts  # User validators
│   └── index.ts            # Validator exports
├── scripts/                 # Utility scripts
│   └── setup-database.ts   # Database setup script
└── app.ts                   # Main application file
```

## Test Structure

```
tests/
├── unit/                    # Unit tests
├── integration/             # Integration tests
└── e2e/                     # End-to-end tests
```

## Key Principles

### 1. **Separation of Concerns**
- **API Layer**: Controllers, routes, and middleware
- **Business Layer**: Services containing business logic
- **Data Layer**: Repositories for data access
- **Database Layer**: Models, migrations, and seeders

### 2. **Type Safety**
- Comprehensive TypeScript interfaces and types
- Organized by domain (API, auth, database, etc.)
- Common types shared across the application

### 3. **Configuration Management**
- Environment-specific configurations
- Centralized constants
- Easy to maintain and update

### 4. **Validation**
- Joi schemas for request validation
- Organized by entity type
- Reusable validation patterns

### 5. **Utilities and Helpers**
- Domain-specific helper functions
- Common utilities for dates, strings, files
- Validation helper functions

### 6. **Testing Structure**
- Tests separated from source code
- Organized by test type (unit, integration, e2e)
- Easy to run specific test suites

## Benefits of This Structure

1. **Maintainability**: Clear separation makes code easier to maintain
2. **Scalability**: Easy to add new features without affecting existing code
3. **Testability**: Clear boundaries make testing easier
4. **Readability**: Developers can quickly understand where to find specific functionality
5. **Consistency**: Follows established Node.js/TypeScript best practices
6. **Modularity**: Components can be developed and tested independently

## File Naming Conventions

- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Repositories**: `*.repository.ts`
- **Routes**: `*.routes.ts`
- **Middleware**: `*.middleware.ts`
- **Validators**: `*.validators.ts`
- **Types**: `*.types.ts`
- **Interfaces**: `*.interfaces.ts`
- **Constants**: `*.constants.ts`
- **Helpers**: `*.helpers.ts`

## Import/Export Patterns

- Each directory has an `index.ts` file that exports all public members
- Use barrel exports for clean imports
- Avoid deep nesting in import paths
- Use relative imports within the same module
