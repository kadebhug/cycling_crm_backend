# Media API Swagger Documentation

## Overview
Comprehensive Swagger/OpenAPI documentation has been added for all media upload and management endpoints in the Cycling CRM API.

## 📋 What Was Added

### 1. Media Schemas (`src/docs/swagger-schemas.ts`)
- **Media**: Complete media file object with metadata
- **MediaUploadRequest**: Single file upload request schema
- **MediaMultipleUploadRequest**: Multiple file upload request schema
- **MediaUpdateMetadataRequest**: Metadata update request schema
- **MediaStats**: Media statistics response schema
- **MediaSearchFilters**: Search filter parameters schema
- **MediaCleanupResult**: Admin cleanup operation result schema

### 2. API Endpoints Documentation (`src/routes/media.routes.ts`)

#### Upload Endpoints
- `POST /api/media/upload` - Upload single file
- `POST /api/media/upload/multiple` - Upload multiple files
- `POST /api/media/upload/service-record/{serviceRecordId}` - Upload to service record
- `POST /api/media/upload/service-update/{serviceUpdateId}` - Upload to service update
- `POST /api/media/upload/quotation/{quotationId}` - Upload to quotation
- `POST /api/media/upload/bike/{bikeId}` - Upload to bike

#### Retrieval Endpoints
- `GET /api/media/entity/{entityType}/{entityId}` - Get media by entity
- `GET /api/media/search` - Search media with filters
- `GET /api/media/my-uploads` - Get current user's uploads
- `GET /api/media/{id}` - Get media metadata by ID

#### File Access Endpoints
- `GET /api/media/{id}/download` - Download file
- `GET /api/media/{id}/view` - View file inline

#### Management Endpoints
- `GET /api/media/stats/{entityType}/{entityId}` - Get media statistics
- `PATCH /api/media/{id}/metadata` - Update metadata
- `DELETE /api/media/{id}` - Delete media file

#### Admin Endpoints
- `POST /api/media/admin/cleanup-orphaned` - Clean up orphaned files

### 3. Enhanced Swagger Configuration (`src/config/swagger.config.ts`)
- Added "Media" tag for grouping endpoints
- Added standard response schemas (Unauthorized, Forbidden, BadRequest, InternalServerError)
- Enhanced error response examples

### 4. Permission Middleware Export (`src/middleware/permission.middleware.ts`)
- Added missing `requirePermission` export for route usage

## 🔧 Key Features Documented

### File Upload Security
- File type validation (images, documents, videos)
- File size limits (10MB per file, max 10 files)
- MIME type validation and spoofing protection
- Dangerous file extension detection
- Path traversal protection

### Authentication & Authorization
- JWT Bearer token authentication required
- Role-based permissions (Admin, Store Owner, Staff, Customer)
- File ownership verification for sensitive operations
- Store-level access control

### Error Handling
- Comprehensive error responses with codes
- Detailed validation error messages
- Security-focused error examples
- HTTP status code documentation

### File Management
- Entity association (service records, bikes, quotations, etc.)
- Metadata management (original names, file types, sizes)
- File statistics and analytics
- Bulk operations support

## 📊 Response Examples

### Successful Upload Response
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "entityType": "service_record",
    "entityId": "456e7890-e89b-12d3-a456-426614174000",
    "fileName": "1704067200000_abc123_bike_photo.jpg",
    "originalName": "bike_photo.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 2048576,
    "mediaType": "image",
    "downloadUrl": "/api/media/123e4567-e89b-12d3-a456-426614174000/download",
    "thumbnailUrl": "/api/media/123e4567-e89b-12d3-a456-426614174000/thumbnail",
    "uploadedBy": {
      "id": "789e0123-e89b-12d3-a456-426614174000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "File uploaded successfully"
}
```

### Error Response Examples
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size of 10485760 bytes",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/media/upload"
  }
}
```

## 🚀 Usage

### Accessing Documentation
1. Start the API server
2. Navigate to `/api/docs` in your browser
3. Find the "Media" section in the API documentation
4. Explore endpoints with interactive examples

### Testing Endpoints
- Use the Swagger UI "Try it out" feature
- Upload test files directly from the documentation
- View detailed request/response examples
- Test authentication and error scenarios

## 🔒 Security Considerations

### File Upload Security
- All uploads require authentication
- File type whitelist enforcement
- Size limit validation
- Malicious file detection
- Secure file storage paths

### Access Control
- Owner-based file access
- Role-based permissions
- Store-level data isolation
- Admin-only cleanup operations

## 📝 Notes

- All endpoints require JWT authentication
- File uploads use `multipart/form-data` encoding
- Maximum file size: 10MB per file
- Supported file types: Images (JPEG, PNG, GIF, WebP, SVG, BMP), Documents (PDF, DOC, DOCX, TXT, RTF, ODT), Videos (MP4, AVI, MOV, WMV, FLV, WebM, MKV)
- Files are organized by entity type and date for efficient storage
- Comprehensive error handling with detailed error codes and messages

The media API documentation is now complete and ready for use by developers and API consumers.