# Service Request API Documentation

This document provides an overview of the Service Request API endpoints that have been implemented for the Cycling CRM system.

## Overview

The Service Request API allows customers to create and manage service requests for their bikes, while enabling store staff to process and track these requests through their lifecycle.

## Customer Endpoints

### Base URL: `/api/customers/service-requests`

#### Create Service Request
- **POST** `/api/customers/service-requests`
- **Description**: Create a new service request for a bike
- **Authentication**: Required (Customer role)
- **Body**:
```json
{
  "bikeId": "uuid",
  "storeId": "uuid", 
  "requestedServices": ["Brake adjustment", "Chain lubrication"],
  "priority": "medium",
  "preferredDate": "2024-12-25T10:00:00Z",
  "customerNotes": "Brakes are squeaking"
}
```

#### Get Service Requests
- **GET** `/api/customers/service-requests`
- **Description**: Get all service requests for the authenticated customer
- **Authentication**: Required (Customer role)
- **Query Parameters**:
  - `page` (optional): Page number for pagination
  - `limit` (optional): Items per page
  - `status` (optional): Filter by status
  - `priority` (optional): Filter by priority
  - `storeId` (optional): Filter by store
  - `bikeId` (optional): Filter by bike

#### Get Service Request by ID
- **GET** `/api/customers/service-requests/{id}`
- **Description**: Get a specific service request by ID
- **Authentication**: Required (Customer role)

#### Update Service Request
- **PUT** `/api/customers/service-requests/{id}`
- **Description**: Update a pending service request
- **Authentication**: Required (Customer role)
- **Note**: Only pending requests can be updated by customers

#### Cancel Service Request
- **POST** `/api/customers/service-requests/{id}/cancel`
- **Description**: Cancel a service request
- **Authentication**: Required (Customer role)

#### Get Statistics
- **GET** `/api/customers/service-requests/stats`
- **Description**: Get service request statistics for the customer
- **Authentication**: Required (Customer role)

## Store Management Endpoints

### Base URL: `/api/stores/{storeId}/service-requests`

#### Get Store Service Requests
- **GET** `/api/stores/{storeId}/service-requests`
- **Description**: Get all service requests for a store
- **Authentication**: Required (Store Owner or Staff with VIEW_SERVICE_REQUESTS permission)
- **Query Parameters**: Same as customer endpoint plus `customerId` filter

#### Get Service Request by ID
- **GET** `/api/stores/{storeId}/service-requests/{requestId}`
- **Description**: Get a specific service request
- **Authentication**: Required (Store Owner or Staff with VIEW_SERVICE_REQUESTS permission)

#### Update Service Request Status
- **PUT** `/api/stores/{storeId}/service-requests/{requestId}/status`
- **Description**: Update the status of a service request
- **Authentication**: Required (Store Owner or Staff with UPDATE_SERVICE_REQUESTS permission)
- **Body**:
```json
{
  "status": "quoted"
}
```

#### Cancel Service Request
- **POST** `/api/stores/{storeId}/service-requests/{requestId}/cancel`
- **Description**: Cancel a service request from store side
- **Authentication**: Required (Store Owner or Staff with UPDATE_SERVICE_REQUESTS permission)

#### Get Statistics
- **GET** `/api/stores/{storeId}/service-requests/stats`
- **Description**: Get service request statistics for the store
- **Authentication**: Required (Store Owner or Staff with VIEW_SERVICE_REQUESTS permission)

#### Get Overdue Requests
- **GET** `/api/stores/{storeId}/service-requests/overdue`
- **Description**: Get all overdue service requests
- **Authentication**: Required (Store Owner or Staff with VIEW_SERVICE_REQUESTS permission)

#### Get High Priority Requests
- **GET** `/api/stores/{storeId}/service-requests/high-priority`
- **Description**: Get all high priority service requests
- **Authentication**: Required (Store Owner or Staff with VIEW_SERVICE_REQUESTS permission)

## Service Request Status Flow

The service request follows this status flow:

1. **pending** - Initial state when customer creates request
2. **quoted** - Store has provided a quotation
3. **approved** - Customer has approved the quotation
4. **in_progress** - Work has started on the bike
5. **completed** - Work is finished
6. **cancelled** - Request was cancelled (by customer or store)
7. **expired** - Request expired (typically from quoted state)

## Priority Levels

- **low** - Non-urgent maintenance
- **medium** - Standard service request (default)
- **high** - Important but not emergency
- **urgent** - Emergency repair needed

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/endpoint"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `FORBIDDEN` - Access denied
- `CONFLICT` - Business rule violation
- `UNAUTHORIZED` - Authentication required

## Postman Collection

The updated Postman collection includes all service request endpoints with:
- Pre-configured request bodies
- Environment variables for IDs
- Automatic token extraction from login responses
- Example requests for all status transitions

Import the `postman-collection.json` file to get started with testing the API.

## Swagger Documentation

The API is fully documented with Swagger/OpenAPI 3.0 specifications. Access the interactive documentation at `/api/docs` when running the server.

All service request schemas, request/response models, and endpoint documentation are included in the Swagger UI.