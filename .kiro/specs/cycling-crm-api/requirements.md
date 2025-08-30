# Requirements Document

## Introduction

The Cycling Maintenance CRM API is a comprehensive backend system designed to manage bicycle maintenance services across multiple bike shops. The system supports role-based access control with four user types (Admin, Store Owner, Staff, Customer) and provides complete service lifecycle management from initial customer requests through completion and invoicing. The API will be built using Node.js, Express, TypeScript, Sequelize ORM, and managed by PM2 for production deployment.

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to manage user authentication and authorization, so that different user roles have appropriate access to system features.

#### Acceptance Criteria

1. WHEN a user attempts to log in THEN the system SHALL validate credentials and return a JWT token
2. WHEN a JWT token is provided THEN the system SHALL verify token validity and extract user role
3. WHEN an authenticated request is made THEN the system SHALL enforce role-based permissions
4. WHEN a user logs out THEN the system SHALL invalidate the current session
5. WHEN a customer registers THEN the system SHALL require email verification before account activation

### Requirement 2

**User Story:** As an admin, I want to manage store owners and their stores, so that I can control which businesses use the system.

#### Acceptance Criteria

1. WHEN an admin creates a store owner THEN the system SHALL create both user and store records
2. WHEN an admin views store owners THEN the system SHALL display all store owners with their store information
3. WHEN an admin updates a store owner THEN the system SHALL modify user and store details
4. WHEN an admin deactivates a store owner THEN the system SHALL set is_active to false for user and store

### Requirement 3

**User Story:** As a store owner, I want to manage my staff and their permissions, so that I can control who can access what features in my store.

#### Acceptance Criteria

1. WHEN a store owner invites staff THEN the system SHALL create a staff user with store-specific permissions
2. WHEN a store owner views staff THEN the system SHALL display only staff assigned to their store
3. WHEN a store owner updates staff permissions THEN the system SHALL modify the staff_store_permissions record
4. WHEN a store owner removes staff THEN the system SHALL deactivate the staff's access to that store
5. IF a staff member belongs to multiple stores THEN the system SHALL maintain separate permissions per store

### Requirement 4

**User Story:** As a store owner, I want to manage my service catalog, so that customers can see what services I offer and staff can create accurate quotations.

#### Acceptance Criteria

1. WHEN a store owner creates a service THEN the system SHALL store service details with store association
2. WHEN a store owner updates a service THEN the system SHALL modify the service record
3. WHEN a store owner deactivates a service THEN the system SHALL set is_active to false
4. WHEN services are requested THEN the system SHALL return only active services for the specified store

### Requirement 5

**User Story:** As a customer, I want to register my bikes and request services, so that I can get maintenance for my bicycles.

#### Acceptance Criteria

1. WHEN a customer registers a bike THEN the system SHALL store bike details linked to the customer
2. WHEN a customer submits a service request THEN the system SHALL create a service_request with 'pending' status
3. WHEN a customer views their service requests THEN the system SHALL display all requests with current status
4. WHEN a customer views service history THEN the system SHALL display completed service records for their bikes
5. IF a service request is submitted THEN the system SHALL require valid bike_id and store_id

### Requirement 6

**User Story:** As store staff, I want to manage service requests and create quotations, so that customers know the cost and timeline for their service.

#### Acceptance Criteria

1. WHEN staff views service requests THEN the system SHALL display requests for their store based on permissions
2. WHEN staff creates a quotation THEN the system SHALL update service request status to 'quoted'
3. WHEN a quotation is created THEN the system SHALL calculate subtotal, tax, and total amounts
4. WHEN a quotation expires THEN the system SHALL automatically update status to 'expired'
5. IF staff lacks quotation permissions THEN the system SHALL deny access to quotation endpoints

### Requirement 7

**User Story:** As store staff, I want to track service progress and communicate updates to customers, so that customers stay informed about their bike's service status.

#### Acceptance Criteria

1. WHEN staff starts work on a service THEN the system SHALL update service_record status to 'in_progress'
2. WHEN staff adds a progress update THEN the system SHALL create a service_update record
3. WHEN a service update is created THEN the system SHALL allow optional customer visibility setting
4. WHEN staff completes a service THEN the system SHALL update service_record status to 'completed'
5. IF a service is delayed THEN the system SHALL allow staff to create delay notifications

### Requirement 8

**User Story:** As store staff, I want to upload and manage photos during service, so that I can document the bike's condition and work performed.

#### Acceptance Criteria

1. WHEN staff uploads a photo THEN the system SHALL validate file type and size restrictions
2. WHEN a photo is uploaded THEN the system SHALL store file metadata and associate with service record
3. WHEN photos are requested THEN the system SHALL return media records for the specified entity
4. WHEN a service update includes photos THEN the system SHALL link media to the update record
5. IF file upload fails THEN the system SHALL return appropriate error messages

### Requirement 9

**User Story:** As a store owner, I want to generate invoices for completed services, so that I can bill customers for work performed.

#### Acceptance Criteria

1. WHEN an invoice is created THEN the system SHALL generate a unique invoice number
2. WHEN an invoice is created THEN the system SHALL calculate line items, subtotal, tax, and total
3. WHEN payment is recorded THEN the system SHALL update paid_amount and payment_status
4. WHEN an invoice becomes overdue THEN the system SHALL update payment_status accordingly
5. IF an invoice references a quotation THEN the system SHALL link the quotation_id

### Requirement 10

**User Story:** As any user, I want the system to maintain data integrity and security, so that sensitive information is protected and operations are reliable.

#### Acceptance Criteria

1. WHEN any database operation occurs THEN the system SHALL enforce foreign key constraints
2. WHEN sensitive data is stored THEN the system SHALL encrypt personally identifiable information
3. WHEN API requests are made THEN the system SHALL validate input data against defined schemas
4. WHEN errors occur THEN the system SHALL log errors without exposing sensitive information
5. WHEN users access data THEN the system SHALL enforce store-level data isolation
6. IF a user attempts unauthorized access THEN the system SHALL return 403 Forbidden status

### Requirement 11

**User Story:** As a system operator, I want the API to be scalable and maintainable, so that it can handle growth and be easily updated.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL be managed by PM2 for process management
2. WHEN database queries are executed THEN the system SHALL use proper indexing for performance
3. WHEN large datasets are requested THEN the system SHALL implement pagination
4. WHEN the system is deployed THEN the system SHALL support environment-based configuration
5. IF the system experiences high load THEN the system SHALL maintain response times under acceptable thresholds