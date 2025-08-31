import { Sequelize } from 'sequelize';
import { sequelize } from '../../config/database';

// Import all models
import { User } from './User';
import { Store } from './Store';
import { StaffStorePermission } from './StaffStorePermission';
import { Bike } from './Bike';
import { Service } from './Service';
import { ServiceRequest } from './ServiceRequest';
import { ServiceRecord } from './ServiceRecord';
import { Quotation } from './Quotation';
import { Invoice } from './Invoice';
import { ServiceUpdate } from './ServiceUpdate';
import { Media } from './Media';

// Initialize all models
export const initializeModels = (sequelizeInstance: Sequelize) => {
  // Initialize models
  User.initModel(sequelizeInstance);
  Store.initModel(sequelizeInstance);
  StaffStorePermission.initModel(sequelizeInstance);
  Bike.initModel(sequelizeInstance);
  Service.initModel(sequelizeInstance);
  ServiceRequest.initModel(sequelizeInstance);
  ServiceRecord.initModel(sequelizeInstance);
  Quotation.initModel(sequelizeInstance);
  Invoice.initModel(sequelizeInstance);
  ServiceUpdate.initModel(sequelizeInstance);
  Media.initModel(sequelizeInstance);

  // Set up associations
  setupAssociations();
};

// Set up model associations
const setupAssociations = () => {
  // User associations
  User.hasMany(Store, {
    foreignKey: 'ownerId',
    as: 'ownedStores',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  User.hasMany(Bike, {
    foreignKey: 'customerId',
    as: 'bikes',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  User.hasMany(ServiceRequest, {
    foreignKey: 'customerId',
    as: 'serviceRequests',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  User.hasMany(StaffStorePermission, {
    foreignKey: 'userId',
    as: 'staffPermissions',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  User.hasMany(ServiceRecord, {
    foreignKey: 'assignedStaffId',
    as: 'assignedServiceRecords',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  User.hasMany(Quotation, {
    foreignKey: 'createdById',
    as: 'createdQuotations',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  User.hasMany(Invoice, {
    foreignKey: 'createdById',
    as: 'createdInvoices',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  User.hasMany(ServiceUpdate, {
    foreignKey: 'createdById',
    as: 'serviceUpdates',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  User.hasMany(Media, {
    foreignKey: 'uploadedById',
    as: 'uploadedMedia',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  User.belongsToMany(Store, {
    through: StaffStorePermission,
    foreignKey: 'userId',
    otherKey: 'storeId',
    as: 'workStores',
  });

  // Store associations
  Store.belongsTo(User, {
    foreignKey: 'ownerId',
    as: 'owner',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  Store.hasMany(Service, {
    foreignKey: 'storeId',
    as: 'services',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Store.hasMany(ServiceRequest, {
    foreignKey: 'storeId',
    as: 'serviceRequests',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Store.hasMany(StaffStorePermission, {
    foreignKey: 'storeId',
    as: 'staffPermissions',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Store.belongsToMany(User, {
    through: StaffStorePermission,
    foreignKey: 'storeId',
    otherKey: 'userId',
    as: 'staff',
  });

  // StaffStorePermission associations
  StaffStorePermission.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  StaffStorePermission.belongsTo(Store, {
    foreignKey: 'storeId',
    as: 'store',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Bike associations
  Bike.belongsTo(User, {
    foreignKey: 'customerId',
    as: 'customer',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Bike.hasMany(ServiceRequest, {
    foreignKey: 'bikeId',
    as: 'serviceRequests',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Service associations
  Service.belongsTo(Store, {
    foreignKey: 'storeId',
    as: 'store',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // ServiceRequest associations
  ServiceRequest.belongsTo(User, {
    foreignKey: 'customerId',
    as: 'customer',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  ServiceRequest.belongsTo(Bike, {
    foreignKey: 'bikeId',
    as: 'bike',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  ServiceRequest.belongsTo(Store, {
    foreignKey: 'storeId',
    as: 'store',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  ServiceRequest.hasOne(ServiceRecord, {
    foreignKey: 'serviceRequestId',
    as: 'serviceRecord',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  ServiceRequest.hasMany(Quotation, {
    foreignKey: 'serviceRequestId',
    as: 'quotations',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // ServiceRecord associations
  ServiceRecord.belongsTo(ServiceRequest, {
    foreignKey: 'serviceRequestId',
    as: 'serviceRequest',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  ServiceRecord.belongsTo(User, {
    foreignKey: 'assignedStaffId',
    as: 'assignedStaff',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  ServiceRecord.hasMany(ServiceUpdate, {
    foreignKey: 'serviceRecordId',
    as: 'serviceUpdates',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  ServiceRecord.hasMany(Media, {
    foreignKey: 'entityId',
    as: 'media',
    scope: {
      entityType: 'service_record',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  ServiceRecord.hasMany(Invoice, {
    foreignKey: 'serviceRecordId',
    as: 'invoices',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Quotation associations
  Quotation.belongsTo(ServiceRequest, {
    foreignKey: 'serviceRequestId',
    as: 'serviceRequest',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Quotation.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  Quotation.hasMany(Invoice, {
    foreignKey: 'quotationId',
    as: 'invoices',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  // Invoice associations
  Invoice.belongsTo(ServiceRecord, {
    foreignKey: 'serviceRecordId',
    as: 'serviceRecord',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Invoice.belongsTo(Quotation, {
    foreignKey: 'quotationId',
    as: 'quotation',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  Invoice.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  // ServiceUpdate associations
  ServiceUpdate.belongsTo(ServiceRecord, {
    foreignKey: 'serviceRecordId',
    as: 'serviceRecord',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  ServiceUpdate.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });

  ServiceUpdate.hasMany(Media, {
    foreignKey: 'entityId',
    as: 'media',
    scope: {
      entityType: 'service_update',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Media associations
  Media.belongsTo(User, {
    foreignKey: 'uploadedById',
    as: 'uploadedBy',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  });
};

// Export all models
export {
  User,
  Store,
  StaffStorePermission,
  Bike,
  Service,
  ServiceRequest,
  ServiceRecord,
  Quotation,
  Invoice,
  ServiceUpdate,
  Media,
};

// Initialize models with the sequelize instance
initializeModels(sequelize);