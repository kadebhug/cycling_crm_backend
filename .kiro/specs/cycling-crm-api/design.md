# Design Document

## Overview

The Cycling Maintenance CRM API is designed as a RESTful service using Node.js, Express, and TypeScript with Sequelize ORM for database operations. The architecture follows a layered approach with clear separation of concerns: controllers handle HTTP requests, services contain business logic, repositories manage data access, and models define data structures. The system implements JWT-based authentication with role-based access control and supports multi-tenant data isolation at the store level.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Load Balancer │    │      PM2        │
│  (Web/Mobile)   │◄──►│    (Optional)   │◄──►│   Process Mgr   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 ▼                                 │
                       │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
                       │  │   Middleware    │    │   Controllers   │    │    Services     │ │
                       │  │ (Auth, CORS,    │◄──►│  (HTTP Layer)   │◄──►│ (Business Logic)│ │
                       │  │  Validation)    │    │                 │    │                 │ │
                       │  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
                       │                                 │                         │         │
                       │                                 ▼                         ▼         │
                       │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
                       │  │   Repositories  │    │   Sequelize     │    │   File Storage  │ │
                       │  │ (Data Access)   │◄──►│    Models       │    │   (Media Files) │ │
                       │  │                 │    │                 │    │                 │ │
                       │  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
                       │                                 │                                   │
                       └─────────────────────────────────┼───────────────────────────────────┘
                                                         ▼
                                               ┌─────────────────┐
                                               │   PostgreSQL    │
                                               │    Database     │
                                               └─────────────────┘
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **ORM**: Sequelize 6.x
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (jsonwebtoken)
- **Process Manager**: PM2
- **Validation**: Joi or Zod
- **File Upload**: Multer
- **Environment**: dotenv
- **Testing**: Jest + Supertest

## Components and Interfaces

### Directory Structure

```
src/
├── config/
│   ├── database.ts          # Sequelize configuration
│   ├── auth.ts              # JWT configuration
│   └── storage.ts           # File storage configuration
├── controllers/
│   ├── auth.controller.ts
│   ├── admin.controller.ts
│   ├── store.controller.ts
│   ├── customer.controller.ts
│   └── shared.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── store.service.ts
│   ├── service-request.service.ts
│   ├── quotation.service.ts
│   ├── invoice.service.ts
│   └── media.service.ts
├── repositories/
│   ├── user.repository.ts
│   ├── store.repository.ts
│   ├── service.repository.ts
│   └── base.repository.ts
├── models/
│   ├── User.ts
│   ├── Store.ts
│   ├── Bike.ts
│   ├── Service.ts
│   ├── ServiceRequest.ts
│   ├── ServiceRecord.ts
│   ├── Quotation.ts
│   ├── Invoice.ts
│   ├── ServiceUpdate.ts
│   ├── Media.ts
│   └── index.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── permission.middleware.ts
│   ├── validation.middleware.ts
│   └── error.middleware.ts
├── routes/
│   ├── auth.routes.ts
│   ├── admin.routes.ts
│   ├── store.routes.ts
│   ├── customer.routes.ts
│   └── index.ts
├── types/
│   ├── auth.types.ts
│   ├── api.types.ts
│   └── database.types.ts
├── utils/
│   ├── logger.ts
│   ├── encryption.ts
│   └── validation.ts
└── app.ts
```

### Core Interfaces

#### Authentication Interface
```typescript
interface AuthService {
  login(email: string, password: string): Promise<AuthResult>;
  register(userData: RegisterData): Promise<User>;
  verifyToken(token: string): Promise<TokenPayload>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
}

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### Repository Pattern Interface
```typescript
interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
```

#### Service Layer Interface
```typescript
interface ServiceRequestService {
  createRequest(customerId: string, requestData: ServiceRequestData): Promise<ServiceRequest>;
  getRequestsByStore(storeId: string, filters?: RequestFilters): Promise<ServiceRequest[]>;
  updateRequestStatus(requestId: string, status: RequestStatus): Promise<ServiceRequest>;
  addServiceUpdate(recordId: string, updateData: ServiceUpdateData): Promise<ServiceUpdate>;
}
```

## Data Models

### Sequelize Model Definitions

#### User Model
```typescript
class User extends Model {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: UserRole;
  public firstName?: string;
  public lastName?: string;
  public phone?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public stores?: Store[];
  public bikes?: Bike[];
  public serviceRequests?: ServiceRequest[];
}
```

#### Store Model
```typescript
class Store extends Model {
  public id!: string;
  public ownerId!: string;
  public name!: string;
  public description?: string;
  public address?: string;
  public businessHours?: BusinessHours;
  public isActive!: boolean;

  // Associations
  public owner?: User;
  public staff?: User[];
  public services?: Service[];
  public serviceRequests?: ServiceRequest[];
}
```

#### Service Request Model
```typescript
class ServiceRequest extends Model {
  public id!: string;
  public customerId!: string;
  public bikeId!: string;
  public storeId!: string;
  public requestedServices!: string[];
  public priority!: Priority;
  public preferredDate?: Date;
  public customerNotes?: string;
  public status!: RequestStatus;

  // Associations
  public customer?: User;
  public bike?: Bike;
  public store?: Store;
  public serviceRecord?: ServiceRecord;
  public quotations?: Quotation[];
}
```

### Model Associations

```typescript
// User associations
User.hasMany(Store, { foreignKey: 'ownerId', as: 'ownedStores' });
User.hasMany(Bike, { foreignKey: 'customerId', as: 'bikes' });
User.belongsToMany(Store, { through: StaffStorePermission, as: 'workStores' });

// Store associations
Store.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Store.hasMany(Service, { foreignKey: 'storeId', as: 'services' });
Store.hasMany(ServiceRequest, { foreignKey: 'storeId', as: 'serviceRequests' });

// Service Request associations
ServiceRequest.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
ServiceRequest.belongsTo(Bike, { foreignKey: 'bikeId', as: 'bike' });
ServiceRequest.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
ServiceRequest.hasOne(ServiceRecord, { foreignKey: 'serviceRequestId', as: 'serviceRecord' });
```

## Error Handling

### Error Response Structure
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
  };
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
}
```

### Error Categories
- **ValidationError**: Input validation failures (400)
- **AuthenticationError**: Invalid credentials or tokens (401)
- **AuthorizationError**: Insufficient permissions (403)
- **NotFoundError**: Resource not found (404)
- **ConflictError**: Resource conflicts (409)
- **DatabaseError**: Database operation failures (500)
- **FileUploadError**: Media upload failures (400/500)

### Global Error Handler
```typescript
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  
  if (err instanceof ValidationError) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', err.message));
  }
  
  if (err instanceof SequelizeError) {
    return res.status(500).json(createErrorResponse('DATABASE_ERROR', 'Database operation failed'));
  }
  
  return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Internal server error'));
};
```

## Testing Strategy

### Testing Pyramid

#### Unit Tests (70%)
- **Models**: Validation, associations, instance methods
- **Services**: Business logic, data transformations
- **Utilities**: Helper functions, encryption, validation
- **Middleware**: Authentication, authorization, validation

#### Integration Tests (20%)
- **API Endpoints**: Full request/response cycles
- **Database Operations**: Repository methods with real DB
- **Authentication Flow**: Login, token validation, permissions
- **File Upload**: Media handling and storage

#### End-to-End Tests (10%)
- **User Workflows**: Complete service request lifecycle
- **Role-based Access**: Different user types accessing appropriate resources
- **Data Consistency**: Cross-entity operations and constraints

### Test Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Test Database Setup
- Use separate test database with same schema
- Implement database seeding for consistent test data
- Clean database between test suites
- Use transactions for test isolation

## Security Implementation

### Authentication & Authorization

#### JWT Token Structure
```typescript
interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  storeId?: string; // For store-specific staff
  permissions?: string[];
  iat: number;
  exp: number;
}
```

#### Permission Middleware
```typescript
const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userPermissions = await getUserPermissions(req.user.id, req.params.storeId);
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json(createErrorResponse('INSUFFICIENT_PERMISSIONS'));
    }
    
    next();
  };
};
```

### Data Protection
- **Password Hashing**: bcrypt with salt rounds 12
- **PII Encryption**: AES-256-GCM for sensitive data
- **Input Sanitization**: Joi/Zod validation schemas
- **SQL Injection Prevention**: Sequelize parameterized queries
- **File Upload Security**: MIME type validation, size limits, virus scanning

### Store-Level Data Isolation
```typescript
const enforceStoreAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { storeId } = req.params;
  const userStores = await getUserAccessibleStores(req.user.id);
  
  if (!userStores.includes(storeId)) {
    return res.status(403).json(createErrorResponse('STORE_ACCESS_DENIED'));
  }
  
  next();
};
```

## Performance Optimization

### Database Optimization
- **Indexing Strategy**: Primary keys, foreign keys, frequently queried fields
- **Query Optimization**: Eager loading for associations, select specific fields
- **Connection Pooling**: Sequelize connection pool configuration
- **Pagination**: Limit/offset for large datasets

### Caching Strategy
- **In-Memory Cache**: Redis for session data, frequently accessed lookups
- **Query Result Cache**: Cache expensive queries with TTL
- **Static Asset Cache**: CDN for media files

### API Performance
- **Request Compression**: gzip middleware
- **Rate Limiting**: Express rate limiter by IP/user
- **Response Optimization**: Minimize payload size, use appropriate HTTP status codes

## Deployment Configuration

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cycling-crm-api',
    script: 'dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Environment Configuration
```typescript
// config/environment.ts
export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cycling_crm',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
};
```