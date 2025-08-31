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
import { ServiceRecordAttributes, ServiceRecordStatus } from '../../types/database/database.types';
import { User } from './User';

export class ServiceRecord extends Model<
  InferAttributes<ServiceRecord>,
  InferCreationAttributes<ServiceRecord>
> implements ServiceRecordAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare serviceRequestId: ForeignKey<any>;
  declare assignedStaffId: ForeignKey<User['id']> | null;

  // Required fields
  declare status: CreationOptional<ServiceRecordStatus>;

  // Optional fields
  declare startDate: Date | null;
  declare completedDate: Date | null;
  declare estimatedCompletionDate: Date | null;
  declare workPerformed: string | null;
  declare partsUsed: string | null;
  declare laborHours: number | null;
  declare notes: string | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare serviceRequest?: NonAttribute<any>;
  declare assignedStaff?: NonAttribute<User>;
  declare serviceUpdates?: NonAttribute<any[]>;
  declare media?: NonAttribute<any[]>;
  declare invoices?: NonAttribute<any[]>;

  // Association declarations
  declare static associations: {
    serviceRequest: Association<ServiceRecord, any>;
    assignedStaff: Association<ServiceRecord, User>;
    serviceUpdates: Association<ServiceRecord, any>;
    media: Association<ServiceRecord, any>;
    invoices: Association<ServiceRecord, any>;
  };

  // Instance methods
  public isPending(): boolean {
    return this.status === ServiceRecordStatus.PENDING;
  }

  public isInProgress(): boolean {
    return this.status === ServiceRecordStatus.IN_PROGRESS;
  }

  public isCompleted(): boolean {
    return this.status === ServiceRecordStatus.COMPLETED;
  }

  public isOnHold(): boolean {
    return this.status === ServiceRecordStatus.ON_HOLD;
  }

  public isCancelled(): boolean {
    return this.status === ServiceRecordStatus.CANCELLED;
  }

  public canBeStarted(): boolean {
    return this.status === ServiceRecordStatus.PENDING;
  }

  public canBeCompleted(): boolean {
    return this.status === ServiceRecordStatus.IN_PROGRESS;
  }

  public canBePutOnHold(): boolean {
    return [ServiceRecordStatus.PENDING, ServiceRecordStatus.IN_PROGRESS].includes(this.status);
  }

  public canBeResumed(): boolean {
    return this.status === ServiceRecordStatus.ON_HOLD;
  }

  public canBeCancelled(): boolean {
    return [ServiceRecordStatus.PENDING, ServiceRecordStatus.IN_PROGRESS, ServiceRecordStatus.ON_HOLD].includes(this.status);
  }

  public getDurationInDays(): number | null {
    if (!this.startDate) return null;
    
    const endDate = this.completedDate || new Date();
    const diffTime = Math.abs(endDate.getTime() - this.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public isOverdue(): boolean {
    if (!this.estimatedCompletionDate || this.isCompleted()) return false;
    return new Date() > this.estimatedCompletionDate;
  }

  public getProgressPercentage(): number {
    if (this.isCompleted()) return 100;
    if (this.isPending()) return 0;
    if (this.isCancelled()) return 0;
    
    // For in-progress and on-hold, estimate based on time elapsed
    if (this.startDate && this.estimatedCompletionDate) {
      const now = new Date();
      const totalDuration = this.estimatedCompletionDate.getTime() - this.startDate.getTime();
      const elapsed = now.getTime() - this.startDate.getTime();
      const percentage = Math.min(Math.max((elapsed / totalDuration) * 100, 5), 95);
      return Math.round(percentage);
    }
    
    // Default progress for in-progress without dates
    return this.isInProgress() ? 50 : 25;
  }

  public getStatusColor(): string {
    const statusColors = {
      [ServiceRecordStatus.PENDING]: '#fbbf24', // yellow
      [ServiceRecordStatus.IN_PROGRESS]: '#3b82f6', // blue
      [ServiceRecordStatus.COMPLETED]: '#10b981', // green
      [ServiceRecordStatus.ON_HOLD]: '#f97316', // orange
      [ServiceRecordStatus.CANCELLED]: '#ef4444', // red
    };
    return statusColors[this.status as ServiceRecordStatus];
  }

  public getTotalCost(): number {
    // This would typically calculate based on parts used and labor hours
    // For now, return 0 as this would be calculated from related data
    return 0;
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof ServiceRecord {
    ServiceRecord.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        serviceRequestId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true, // One service record per service request
          references: {
            model: 'service_requests',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        assignedStaffId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        status: {
          type: DataTypes.ENUM(...Object.values(ServiceRecordStatus)),
          allowNull: false,
          defaultValue: ServiceRecordStatus.PENDING,
          validate: {
            isIn: [Object.values(ServiceRecordStatus)],
          },
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: true,
          },
        },
        completedDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: true,
            isAfterStartDate(value: Date) {
              if (value && this.startDate && value < this.startDate) {
                throw new Error('Completed date must be after start date');
              }
            },
          },
        },
        estimatedCompletionDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: true,
          },
        },
        workPerformed: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        partsUsed: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        laborHours: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          validate: {
            min: 0,
            max: 999.99,
          },
        },
        notes: {
          type: DataTypes.TEXT,
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
        modelName: 'ServiceRecord',
        tableName: 'service_records',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ['service_request_id'],
          },
          {
            fields: ['assigned_staff_id'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['start_date'],
          },
          {
            fields: ['estimated_completion_date'],
          },
          {
            fields: ['completed_date'],
          },
        ],
      }
    );

    return ServiceRecord;
  }
}