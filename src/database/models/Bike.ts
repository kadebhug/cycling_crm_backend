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
import { BikeAttributes } from '../../types/database/database.types';
import { User } from './User';

export class Bike extends Model<
  InferAttributes<Bike>,
  InferCreationAttributes<Bike>
> implements BikeAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare customerId: ForeignKey<User['id']>;

  // Optional fields
  declare brand: string | null;
  declare model: string | null;
  declare year: number | null;
  declare serialNumber: string | null;
  declare color: string | null;
  declare bikeType: string | null;
  declare notes: string | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare customer?: NonAttribute<User>;
  declare serviceRequests?: NonAttribute<any[]>;

  // Association declarations
  declare static associations: {
    customer: Association<Bike, User>;
    serviceRequests: Association<Bike, any>;
  };

  // Instance methods
  public getDisplayName(): string {
    const parts = [this.brand, this.model, this.year?.toString()].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : `Bike #${this.id.slice(-8)}`;
  }

  public getFullDescription(): string {
    const details = [];
    
    if (this.brand) details.push(`Brand: ${this.brand}`);
    if (this.model) details.push(`Model: ${this.model}`);
    if (this.year) details.push(`Year: ${this.year}`);
    if (this.color) details.push(`Color: ${this.color}`);
    if (this.bikeType) details.push(`Type: ${this.bikeType}`);
    if (this.serialNumber) details.push(`Serial: ${this.serialNumber}`);
    
    return details.join(', ') || 'No details available';
  }

  public hasSerialNumber(): boolean {
    return Boolean(this.serialNumber && this.serialNumber.trim().length > 0);
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof Bike {
    Bike.init(
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
        brand: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 100],
          },
        },
        model: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 100],
          },
        },
        year: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: 1800,
            max: new Date().getFullYear() + 1,
          },
        },
        serialNumber: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 100],
          },
        },
        color: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 50],
          },
        },
        bikeType: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 50],
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
        modelName: 'Bike',
        tableName: 'bikes',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ['customer_id'],
          },
          {
            fields: ['serial_number'],
          },
          {
            fields: ['brand'],
          },
          {
            fields: ['bike_type'],
          },
        ],
      }
    );

    return Bike;
  }
}