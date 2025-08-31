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
import { StoreAttributes, BusinessHours } from '../../types/database/database.types';
import { User } from './User';

export class Store extends Model<
  InferAttributes<Store>,
  InferCreationAttributes<Store>
> implements StoreAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare ownerId: ForeignKey<User['id']>;

  // Required fields
  declare name: string;
  declare isActive: CreationOptional<boolean>;

  // Optional fields
  declare description: string | null;
  declare address: string | null;
  declare phone: string | null;
  declare email: string | null;
  declare businessHours: BusinessHours | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare owner?: NonAttribute<User>;
  declare staff?: NonAttribute<User[]>;
  declare services?: NonAttribute<any[]>;
  declare serviceRequests?: NonAttribute<any[]>;
  declare staffPermissions?: NonAttribute<any[]>;

  // Association declarations
  declare static associations: {
    owner: Association<Store, User>;
    staff: Association<Store, User>;
    services: Association<Store, any>;
    serviceRequests: Association<Store, any>;
    staffPermissions: Association<Store, any>;
  };

  // Instance methods
  public isOpenNow(): boolean {
    if (!this.businessHours) return true; // Assume open if no hours set

    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[now.getDay()] as keyof BusinessHours;
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const dayHours = this.businessHours[dayOfWeek];
    if (!dayHours || dayHours.closed) return false;

    return currentTime >= dayHours.open && currentTime <= dayHours.close;
  }

  public getBusinessHoursForDay(day: keyof BusinessHours): { open: string; close: string; closed?: boolean } | null {
    return this.businessHours?.[day] || null;
  }

  public hasStaff(userId: string): boolean {
    return this.staff?.some(staff => staff.id === userId) || false;
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof Store {
    Store.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        ownerId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
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
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [0, 20],
          },
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            isEmail: true,
            len: [0, 255],
          },
        },
        businessHours: {
          type: DataTypes.JSONB,
          allowNull: true,
          validate: {
            isValidBusinessHours(value: any) {
              if (!value) return;
              
              const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
              const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
              
              for (const [day, hours] of Object.entries(value)) {
                if (!validDays.includes(day)) {
                  throw new Error(`Invalid day: ${day}`);
                }
                
                if (typeof hours !== 'object' || hours === null) {
                  throw new Error(`Invalid hours format for ${day}`);
                }
                
                const { open, close, closed } = hours as any;
                
                if (closed === true) continue;
                
                if (!open || !close) {
                  throw new Error(`Missing open/close times for ${day}`);
                }
                
                if (!timeRegex.test(open) || !timeRegex.test(close)) {
                  throw new Error(`Invalid time format for ${day}. Use HH:MM format`);
                }
                
                if (open >= close) {
                  throw new Error(`Open time must be before close time for ${day}`);
                }
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
        modelName: 'Store',
        tableName: 'stores',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ['owner_id'],
          },
          {
            fields: ['is_active'],
          },
          {
            fields: ['name'],
          },
        ],
      }
    );

    return Store;
  }
}