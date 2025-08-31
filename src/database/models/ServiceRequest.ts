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
import { ServiceRequestAttributes, Priority, RequestStatus } from '../../types/database/database.types';
import { User } from './User';
import { Bike } from './Bike';
import { Store } from './Store';

export class ServiceRequest extends Model<
  InferAttributes<ServiceRequest>,
  InferCreationAttributes<ServiceRequest>
> implements ServiceRequestAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare customerId: ForeignKey<User['id']>;
  declare bikeId: ForeignKey<Bike['id']>;
  declare storeId: ForeignKey<Store['id']>;

  // Required fields
  declare requestedServices: string[];
  declare priority: Priority;
  declare status: CreationOptional<RequestStatus>;

  // Optional fields
  declare preferredDate: Date | null;
  declare customerNotes: string | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare customer?: NonAttribute<User>;
  declare bike?: NonAttribute<Bike>;
  declare store?: NonAttribute<Store>;
  declare serviceRecord?: NonAttribute<any>;
  declare quotations?: NonAttribute<any[]>;

  // Association declarations
  declare static associations: {
    customer: Association<ServiceRequest, User>;
    bike: Association<ServiceRequest, Bike>;
    store: Association<ServiceRequest, Store>;
    serviceRecord: Association<ServiceRequest, any>;
    quotations: Association<ServiceRequest, any>;
  };

  // Instance methods
  public isPending(): boolean {
    return this.status === RequestStatus.PENDING;
  }

  public isQuoted(): boolean {
    return this.status === RequestStatus.QUOTED;
  }

  public isApproved(): boolean {
    return this.status === RequestStatus.APPROVED;
  }

  public isInProgress(): boolean {
    return this.status === RequestStatus.IN_PROGRESS;
  }

  public isCompleted(): boolean {
    return this.status === RequestStatus.COMPLETED;
  }

  public isCancelled(): boolean {
    return this.status === RequestStatus.CANCELLED;
  }

  public isExpired(): boolean {
    return this.status === RequestStatus.EXPIRED;
  }

  public canBeQuoted(): boolean {
    return this.status === RequestStatus.PENDING;
  }

  public canBeApproved(): boolean {
    return this.status === RequestStatus.QUOTED;
  }

  public canBeStarted(): boolean {
    return this.status === RequestStatus.APPROVED;
  }

  public canBeCancelled(): boolean {
    return [RequestStatus.PENDING, RequestStatus.QUOTED, RequestStatus.APPROVED].includes(this.status);
  }

  public getPriorityLevel(): number {
    const priorityLevels = {
      [Priority.LOW]: 1,
      [Priority.MEDIUM]: 2,
      [Priority.HIGH]: 3,
      [Priority.URGENT]: 4,
    };
    return priorityLevels[this.priority];
  }

  public isHighPriority(): boolean {
    return [Priority.HIGH, Priority.URGENT].includes(this.priority);
  }

  public isOverdue(): boolean {
    if (!this.preferredDate) return false;
    return new Date() > this.preferredDate && !this.isCompleted();
  }

  public getStatusColor(): string {
    const statusColors = {
      [RequestStatus.PENDING]: '#fbbf24', // yellow
      [RequestStatus.QUOTED]: '#3b82f6', // blue
      [RequestStatus.APPROVED]: '#10b981', // green
      [RequestStatus.IN_PROGRESS]: '#8b5cf6', // purple
      [RequestStatus.COMPLETED]: '#059669', // emerald
      [RequestStatus.CANCELLED]: '#ef4444', // red
      [RequestStatus.EXPIRED]: '#6b7280', // gray
    };
    return statusColors[this.status as RequestStatus];
  }

  public getPriorityColor(): string {
    const priorityColors = {
      [Priority.LOW]: '#10b981', // green
      [Priority.MEDIUM]: '#fbbf24', // yellow
      [Priority.HIGH]: '#f97316', // orange
      [Priority.URGENT]: '#ef4444', // red
    };
    return priorityColors[this.priority];
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof ServiceRequest {
    ServiceRequest.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        customerId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        bikeId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'bikes',
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
        requestedServices: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
          validate: {
            notEmpty: {
              msg: 'At least one service must be requested',
            },
            isValidServices(value: string[]) {
              if (!Array.isArray(value) || value.length === 0) {
                throw new Error('Requested services must be a non-empty array');
              }
            },
          },
        },
        priority: {
          type: DataTypes.ENUM(...Object.values(Priority)),
          allowNull: false,
          defaultValue: Priority.MEDIUM,
          validate: {
            isIn: [Object.values(Priority)],
          },
        },
        preferredDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: true,
            isAfter: {
              args: new Date().toISOString(),
              msg: 'Preferred date must be in the future',
            },
          },
        },
        customerNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(RequestStatus)),
          allowNull: false,
          defaultValue: RequestStatus.PENDING,
          validate: {
            isIn: [Object.values(RequestStatus)],
          },
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
        modelName: 'ServiceRequest',
        tableName: 'service_requests',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ['customer_id'],
          },
          {
            fields: ['bike_id'],
          },
          {
            fields: ['store_id'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['priority'],
          },
          {
            fields: ['preferred_date'],
          },
          {
            fields: ['created_at'],
          },
        ],
      }
    );

    return ServiceRequest;
  }
}