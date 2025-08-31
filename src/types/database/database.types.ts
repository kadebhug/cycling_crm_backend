// Database types and enums for Sequelize models

export enum UserRole {
  ADMIN = 'admin',
  STORE_OWNER = 'store_owner',
  STAFF = 'staff',
  CUSTOMER = 'customer'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum RequestStatus {
  PENDING = 'pending',
  QUOTED = 'quoted',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum ServiceRecordStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled'
}

export enum QuotationStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum MediaType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video'
}

export enum Permission {
  // Service management
  VIEW_SERVICES = 'view_services',
  CREATE_SERVICES = 'create_services',
  UPDATE_SERVICES = 'update_services',
  DELETE_SERVICES = 'delete_services',
  
  // Service request management
  VIEW_SERVICE_REQUESTS = 'view_service_requests',
  UPDATE_SERVICE_REQUESTS = 'update_service_requests',
  
  // Quotation management
  VIEW_QUOTATIONS = 'view_quotations',
  CREATE_QUOTATIONS = 'create_quotations',
  UPDATE_QUOTATIONS = 'update_quotations',
  
  // Service record management
  VIEW_SERVICE_RECORDS = 'view_service_records',
  UPDATE_SERVICE_RECORDS = 'update_service_records',
  
  // Invoice management
  VIEW_INVOICES = 'view_invoices',
  CREATE_INVOICES = 'create_invoices',
  UPDATE_INVOICES = 'update_invoices',
  
  // Staff management (store owner only)
  MANAGE_STAFF = 'manage_staff',
  
  // Media management
  UPLOAD_MEDIA = 'upload_media',
  VIEW_MEDIA = 'view_media'
}

// Business hours interface
export interface BusinessHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

// Model attribute interfaces
export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreAttributes {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  businessHours: BusinessHours | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffStorePermissionAttributes {
  id: string;
  userId: string;
  storeId: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BikeAttributes {
  id: string;
  customerId: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  serialNumber: string | null;
  color: string | null;
  bikeType: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceAttributes {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  basePrice: number;
  estimatedDuration: number | null; // in minutes
  category: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRequestAttributes {
  id: string;
  customerId: string;
  bikeId: string;
  storeId: string;
  requestedServices: string[]; // Array of service IDs or names
  priority: Priority;
  preferredDate: Date | null;
  customerNotes: string | null;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRecordAttributes {
  id: string;
  serviceRequestId: string;
  assignedStaffId: string | null;
  status: ServiceRecordStatus;
  startDate: Date | null;
  completedDate: Date | null;
  estimatedCompletionDate: Date | null;
  workPerformed: string | null;
  partsUsed: string | null;
  laborHours: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationAttributes {
  id: string;
  serviceRequestId: string;
  quotationNumber: string;
  createdById: string;
  lineItems: QuotationLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: Date;
  status: QuotationStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceAttributes {
  id: string;
  serviceRecordId: string;
  quotationId: string | null;
  invoiceNumber: string;
  createdById: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  dueDate: Date;
  paidDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ServiceUpdateAttributes {
  id: string;
  serviceRecordId: string;
  createdById: string;
  updateType: string;
  message: string;
  isVisibleToCustomer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaAttributes {
  id: string;
  entityType: string; // 'service_record', 'service_update', 'quotation', etc.
  entityId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  mediaType: MediaType;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}