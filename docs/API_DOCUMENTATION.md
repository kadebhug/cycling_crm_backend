# Cycling CRM API Documentation

## Overview

The Cycling CRM API provides a comprehensive backend system for managing bicycle maintenance services. This RESTful API supports user authentication, service management, quotations, and more.

## API Documentation

### Interactive Documentation

The API includes interactive Swagger documentation that allows you to:
- Browse all available endpoints
- View request/response schemas
- Test endpoints directly from the browser
- Download OpenAPI specification

**Access the documentation at:** `http://localhost:3000/api/docs`

### Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://api.cyclingcrm.com`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting Started

1. **Register a new account:** `POST /api/auth/register`
2. **Login:** `POST /api/auth/login`
3. **Use the returned access token** in subsequent requests

## Available Endpoints

### Health & Info
- `GET /health` - Health check
- `GET /api` - API information

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/password-reset/request` - Request password reset
- `POST /api/auth/password-reset/confirm` - Confirm password reset
- `POST /api/auth/verify-email` - Verify email address

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/endpoint"
  }
}
```

## User Roles

The system supports different user roles with varying permissions:

- **ADMIN** - Full system access
- **STORE_OWNER** - Manage their store and staff
- **STAFF** - Handle service requests and records
- **CUSTOMER** - Submit service requests and view their data

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Window:** 15 minutes
- **Max Requests:** 100 per window per IP

## Error Codes

Common error codes you might encounter:

- `VALIDATION_ERROR` - Invalid input data
- `AUTHENTICATION_ERROR` - Invalid credentials
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

## Development

### Running the API

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/cycling_crm
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:3001
```

## Future Endpoints

The following endpoints are planned for future releases:

### Stores
- `GET /api/stores` - List stores
- `POST /api/stores` - Create store
- `GET /api/stores/:id` - Get store details
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Services
- `GET /api/stores/:storeId/services` - List services
- `POST /api/stores/:storeId/services` - Create service
- `GET /api/services/:id` - Get service details
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Service Requests
- `GET /api/service-requests` - List service requests
- `POST /api/service-requests` - Create service request
- `GET /api/service-requests/:id` - Get service request details
- `PUT /api/service-requests/:id` - Update service request

### Quotations
- `GET /api/quotations` - List quotations
- `POST /api/quotations` - Create quotation
- `GET /api/quotations/:id` - Get quotation details
- `PUT /api/quotations/:id` - Update quotation

## Support

For API support or questions:
- Email: support@cyclingcrm.com
- Documentation: http://localhost:3000/api/docs
- GitHub Issues: [Project Repository]

## Changelog

### v1.0.0
- Initial API release
- User authentication system
- Swagger documentation
- Health check endpoints