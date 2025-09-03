import {
  Model,
  DataTypes,
  Sequelize,
  Association,
  HasManyOptions,
  BelongsToManyOptions,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute
} from 'sequelize';
import { UserRole, UserAttributes } from '../../types/database/database.types';

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> implements UserAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Required fields
  declare email: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare isActive: CreationOptional<boolean>;
  declare emailVerified: CreationOptional<boolean>;

  // Optional fields
  declare firstName: string | null;
  declare lastName: string | null;
  declare phone: string | null;
  declare emailVerificationToken: string | null;
  declare passwordResetToken: string | null;
  declare passwordResetExpires: Date | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare ownedStores?: NonAttribute<any[]>;
  declare workStores?: NonAttribute<any[]>;
  declare bikes?: NonAttribute<any[]>;
  declare serviceRequests?: NonAttribute<any[]>;
  declare staffPermissions?: NonAttribute<any[]>;
  declare createdQuotations?: NonAttribute<any[]>;
  declare createdInvoices?: NonAttribute<any[]>;
  declare serviceUpdates?: NonAttribute<any[]>;
  declare uploadedMedia?: NonAttribute<any[]>;
  declare assignedServiceRecords?: NonAttribute<any[]>;

  // Association declarations
  declare static associations: {
    ownedStores: Association<User, any>;
    workStores: Association<User, any>;
    bikes: Association<User, any>;
    serviceRequests: Association<User, any>;
    staffPermissions: Association<User, any>;
    createdQuotations: Association<User, any>;
    createdInvoices: Association<User, any>;
    serviceUpdates: Association<User, any>;
    uploadedMedia: Association<User, any>;
    assignedServiceRecords: Association<User, any>;
  };

  // Instance methods
  public getFullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.email;
  }

  public isStoreOwner(): boolean {
    return this.role === UserRole.STORE_OWNER;
  }

  public isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  public isStaff(): boolean {
    return this.role === UserRole.STAFF;
  }

  public isCustomer(): boolean {
    return this.role === UserRole.CUSTOMER;
  }

  public canAccessStore(storeId: string): boolean {
    // Admin can access all stores
    if (this.isAdmin()) return true;

    // Store owners can access their own stores
    if (this.isStoreOwner() && this.ownedStores) {
      return this.ownedStores.some((store: any) => store.id === storeId);
    }

    // Staff can access stores they work at
    if (this.isStaff() && this.workStores) {
      return this.workStores.some((store: any) => store.id === storeId);
    }

    return false;
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
            len: [1, 255],
          },
        },
        passwordHash: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 255],
          },
        },
        role: {
          type: DataTypes.ENUM(...Object.values(UserRole)),
          allowNull: false,
          validate: {
            isIn: [Object.values(UserRole)],
          },
        },
        firstName: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 100],
          },
        },
        lastName: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 100],
          },
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 20],
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        emailVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        emailVerificationToken: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        passwordResetToken: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        passwordResetExpires: {
          type: DataTypes.DATE,
          allowNull: true,
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
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ['email'],
          },
          {
            fields: ['role'],
          },
          {
            fields: ['is_active'],
          },
          {
            fields: ['email_verification_token'],
          },
          {
            fields: ['password_reset_token'],
          },
        ],
      }
    );

    return User;
  }
}