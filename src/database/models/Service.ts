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
import { ServiceAttributes } from '../../types/database/database.types';
import { Store } from './Store';

export class Service extends Model<
  InferAttributes<Service>,
  InferCreationAttributes<Service>
> implements ServiceAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare storeId: ForeignKey<Store['id']>;

  // Required fields
  declare name: string;
  declare basePrice: number;
  declare isActive: CreationOptional<boolean>;

  // Optional fields
  declare description: string | null;
  declare estimatedDuration: number | null; // in minutes
  declare category: string | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare store?: NonAttribute<Store>;

  // Association declarations
  declare static associations: {
    store: Association<Service, Store>;
  };

  // Instance methods
  public getFormattedPrice(): string {
    return `$${this.basePrice.toFixed(2)}`;
  }

  public getEstimatedDurationFormatted(): string {
    if (!this.estimatedDuration) return 'Duration not specified';
    
    const hours = Math.floor(this.estimatedDuration / 60);
    const minutes = this.estimatedDuration % 60;
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
    }
  }

  public isInCategory(category: string): boolean {
    return this.category?.toLowerCase() === category.toLowerCase();
  }

  // Static methods
  public static getCommonCategories(): string[] {
    return [
      'Basic Maintenance',
      'Brake Service',
      'Drivetrain Service',
      'Wheel Service',
      'Suspension Service',
      'Frame Repair',
      'Electrical',
      'Custom Work',
      'Emergency Repair',
    ];
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof Service {
    Service.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
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
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 255],
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        basePrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
            isDecimal: true,
          },
        },
        estimatedDuration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: 1,
            max: 10080, // Max 1 week in minutes
          },
        },
        category: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 100],
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
        modelName: 'Service',
        tableName: 'services',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ['store_id'],
          },
          {
            fields: ['is_active'],
          },
          {
            fields: ['category'],
          },
          {
            fields: ['name'],
          },
          {
            fields: ['base_price'],
          },
        ],
      }
    );

    return Service;
  }
}