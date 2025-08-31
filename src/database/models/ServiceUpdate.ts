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
import { ServiceUpdateAttributes } from '../../types/database/database.types';
import { User } from './User';

export class ServiceUpdate extends Model<
  InferAttributes<ServiceUpdate>,
  InferCreationAttributes<ServiceUpdate>
> implements ServiceUpdateAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare serviceRecordId: ForeignKey<any>;
  declare createdById: ForeignKey<User['id']>;

  // Required fields
  declare updateType: string;
  declare message: string;
  declare isVisibleToCustomer: CreationOptional<boolean>;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare serviceRecord?: NonAttribute<any>;
  declare createdBy?: NonAttribute<User>;
  declare media?: NonAttribute<any[]>;

  // Association declarations
  declare static associations: {
    serviceRecord: Association<ServiceUpdate, any>;
    createdBy: Association<ServiceUpdate, User>;
    media: Association<ServiceUpdate, any>;
  };

  // Instance methods
  public isVisibleToCustomers(): boolean {
    return this.isVisibleToCustomer;
  }

  public isInternalOnly(): boolean {
    return !this.isVisibleToCustomer;
  }

  public getFormattedTimestamp(): string {
    return this.createdAt.toLocaleString();
  }

  public hasMedia(): boolean {
    return Boolean(this.media && this.media.length > 0);
  }

  public getUpdateTypeColor(): string {
    const typeColors: { [key: string]: string } = {
      'status_change': '#3b82f6', // blue
      'progress_update': '#10b981', // green
      'issue_found': '#f97316', // orange
      'delay_notification': '#ef4444', // red
      'completion_notice': '#059669', // emerald
      'customer_communication': '#8b5cf6', // purple
      'internal_note': '#6b7280', // gray
      'parts_ordered': '#fbbf24', // yellow
      'parts_received': '#10b981', // green
      'quality_check': '#3b82f6', // blue
    };
    return typeColors[this.updateType] || '#6b7280';
  }

  public getUpdateTypeIcon(): string {
    const typeIcons: { [key: string]: string } = {
      'status_change': '🔄',
      'progress_update': '📈',
      'issue_found': '⚠️',
      'delay_notification': '⏰',
      'completion_notice': '✅',
      'customer_communication': '💬',
      'internal_note': '📝',
      'parts_ordered': '📦',
      'parts_received': '✅',
      'quality_check': '🔍',
    };
    return typeIcons[this.updateType] || '📝';
  }

  // Static methods
  public static getUpdateTypes(): string[] {
    return [
      'status_change',
      'progress_update',
      'issue_found',
      'delay_notification',
      'completion_notice',
      'customer_communication',
      'internal_note',
      'parts_ordered',
      'parts_received',
      'quality_check',
    ];
  }

  public static getCustomerVisibleTypes(): string[] {
    return [
      'status_change',
      'progress_update',
      'delay_notification',
      'completion_notice',
      'customer_communication',
    ];
  }

  public static getInternalOnlyTypes(): string[] {
    return [
      'internal_note',
      'issue_found',
      'parts_ordered',
      'parts_received',
      'quality_check',
    ];
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof ServiceUpdate {
    ServiceUpdate.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        serviceRecordId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'service_records',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdById: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        updateType: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 50],
            isIn: [ServiceUpdate.getUpdateTypes()],
          },
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            len: [1, 2000],
          },
        },
        isVisibleToCustomer: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
        modelName: 'ServiceUpdate',
        tableName: 'service_updates',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ['service_record_id'],
          },
          {
            fields: ['created_by_id'],
          },
          {
            fields: ['update_type'],
          },
          {
            fields: ['is_visible_to_customer'],
          },
          {
            fields: ['created_at'],
          },
        ],
      }
    );

    return ServiceUpdate;
  }
}