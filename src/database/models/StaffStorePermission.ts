import {
  Model,
  DataTypes,
  Sequelize,
  Association,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
  ForeignKey
} from 'sequelize';
import { StaffStorePermissionAttributes, Permission } from '../../types/database/database.types';
import { User } from './User';
import { Store } from './Store';

export class StaffStorePermission extends Model<
  InferAttributes<StaffStorePermission>,
  InferCreationAttributes<StaffStorePermission>
> implements StaffStorePermissionAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare userId: ForeignKey<User['id']>;
  declare storeId: ForeignKey<Store['id']>;

  // Required fields
  declare permissions: Permission[];
  declare isActive: CreationOptional<boolean>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare store?: NonAttribute<Store>;

  // Association declarations
  declare static associations: {
    user: Association<StaffStorePermission, User>;
    store: Association<StaffStorePermission, Store>;
  };

  // Instance methods
  public hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  public hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.permissions.includes(permission));
  }

  public hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.permissions.includes(permission));
  }

  public addPermission(permission: Permission): void {
    if (!this.hasPermission(permission)) {
      this.permissions = [...this.permissions, permission];
    }
  }

  public removePermission(permission: Permission): void {
    this.permissions = this.permissions.filter(p => p !== permission);
  }

  public setPermissions(permissions: Permission[]): void {
    this.permissions = [...new Set(permissions)]; // Remove duplicates
  }

  // Static methods
  public static getDefaultStaffPermissions(): Permission[] {
    return [
      Permission.VIEW_SERVICES,
      Permission.VIEW_SERVICE_REQUESTS,
      Permission.UPDATE_SERVICE_REQUESTS,
      Permission.VIEW_SERVICE_RECORDS,
      Permission.UPDATE_SERVICE_RECORDS,
      Permission.VIEW_MEDIA,
      Permission.UPLOAD_MEDIA,
    ];
  }

  public static getDefaultSeniorStaffPermissions(): Permission[] {
    return [
      ...StaffStorePermission.getDefaultStaffPermissions(),
      Permission.CREATE_QUOTATIONS,
      Permission.UPDATE_QUOTATIONS,
      Permission.VIEW_QUOTATIONS,
      Permission.VIEW_INVOICES,
    ];
  }

  public static getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof StaffStorePermission {
    StaffStorePermission.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        storeId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'stores',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        permissions: {
          type: DataTypes.ARRAY(DataTypes.ENUM(...Object.values(Permission))),
          allowNull: false,
          defaultValue: [],
          validate: {
            isValidPermissions(value: Permission[]) {
              if (!Array.isArray(value)) {
                throw new Error('Permissions must be an array');
              }
              
              const validPermissions = Object.values(Permission);
              const invalidPermissions = value.filter(p => !validPermissions.includes(p));
              
              if (invalidPermissions.length > 0) {
                throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
              }
            },
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'StaffStorePermission',
        tableName: 'staff_store_permissions',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ['user_id', 'store_id'],
            name: 'unique_user_store_permission',
          },
          {
            fields: ['user_id'],
          },
          {
            fields: ['store_id'],
          },
          {
            fields: ['is_active'],
          },
        ],
      }
    );

    return StaffStorePermission;
  }
}