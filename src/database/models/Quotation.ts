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
import { QuotationAttributes, QuotationStatus, QuotationLineItem } from '../../types/database/database.types';
import { User } from './User';

export class Quotation extends Model<
    InferAttributes<Quotation>,
    InferCreationAttributes<Quotation>
> implements QuotationAttributes {
    // Primary key
    declare id: CreationOptional<string>;

    // Foreign keys
    declare serviceRequestId: ForeignKey<any>;
    declare createdById: ForeignKey<User['id']>;

    // Required fields
    declare quotationNumber: string;
    declare lineItems: QuotationLineItem[];
    declare subtotal: number;
    declare taxRate: number;
    declare taxAmount: number;
    declare total: number;
    declare validUntil: Date;
    declare status: CreationOptional<QuotationStatus>;

    // Optional fields
    declare notes: string | null;

    // Timestamps
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    // Associations
    declare serviceRequest?: NonAttribute<any>;
    declare createdBy?: NonAttribute<User>;
    declare invoices?: NonAttribute<any[]>;

    // Association declarations
    declare static associations: {
        serviceRequest: Association<Quotation, any>;
        createdBy: Association<Quotation, User>;
        invoices: Association<Quotation, any>;
    };

    // Instance methods
    public isDraft(): boolean {
        return this.status === QuotationStatus.DRAFT;
    }

    public isSent(): boolean {
        return this.status === QuotationStatus.SENT;
    }

    public isApproved(): boolean {
        return this.status === QuotationStatus.APPROVED;
    }

    public isRejected(): boolean {
        return this.status === QuotationStatus.REJECTED;
    }

    public isExpired(): boolean {
        return this.status === QuotationStatus.EXPIRED || new Date() > this.validUntil;
    }

    public canBeSent(): boolean {
        return this.status === QuotationStatus.DRAFT;
    }

    public canBeApproved(): boolean {
        return this.status === QuotationStatus.SENT && !this.isExpired();
    }

    public canBeRejected(): boolean {
        return this.status === QuotationStatus.SENT && !this.isExpired();
    }

    public canBeEdited(): boolean {
        return [QuotationStatus.DRAFT, QuotationStatus.REJECTED].includes(this.status);
    }

    public getDaysUntilExpiry(): number {
        const now = new Date();
        const diffTime = this.validUntil.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    public isExpiringSoon(days: number = 3): boolean {
        const daysUntilExpiry = this.getDaysUntilExpiry();
        return daysUntilExpiry <= days && daysUntilExpiry > 0;
    }

    public recalculateTotals(): void {
        this.subtotal = this.lineItems.reduce((sum, item) => sum + item.total, 0);
        this.taxAmount = this.subtotal * (this.taxRate / 100);
        this.total = this.subtotal + this.taxAmount;
    }

    public addLineItem(item: Omit<QuotationLineItem, 'id' | 'total'>): void {
        const lineItem: QuotationLineItem = {
            ...item,
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            total: item.quantity * item.unitPrice,
        };

        this.lineItems = [...this.lineItems, lineItem];
        this.recalculateTotals();
    }

    public removeLineItem(itemId: string): void {
        this.lineItems = this.lineItems.filter(item => item.id !== itemId);
        this.recalculateTotals();
    }

    public updateLineItem(itemId: string, updates: Partial<Omit<QuotationLineItem, 'id'>>): void {
        this.lineItems = this.lineItems.map(item => {
            if (item.id === itemId) {
                const updatedItem = { ...item, ...updates };
                updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
                return updatedItem;
            }
            return item;
        });
        this.recalculateTotals();
    }

    public getFormattedTotal(): string {
        return `$${this.total.toFixed(2)}`;
    }

    public getStatusColor(): string {
        const statusColors = {
            [QuotationStatus.DRAFT]: '#6b7280', // gray
            [QuotationStatus.SENT]: '#3b82f6', // blue
            [QuotationStatus.APPROVED]: '#10b981', // green
            [QuotationStatus.REJECTED]: '#ef4444', // red
            [QuotationStatus.EXPIRED]: '#9ca3af', // light gray
        };
        return statusColors[this.status as QuotationStatus];
    }

    // Static methods
    public static generateQuotationNumber(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const timestamp = now.getTime().toString().slice(-6);

        return `QUO-${year}${month}${day}-${timestamp}`;
    }

    // Model initialization
    public static initModel(sequelize: Sequelize): typeof Quotation {
        Quotation.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                serviceRequestId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: {
                        model: 'service_requests',
                        key: 'id',
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                quotationNumber: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                    validate: {
                        len: [1, 50],
                    },
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
                lineItems: {
                    type: DataTypes.JSONB,
                    allowNull: false,
                    defaultValue: [],
                    validate: {
                        isValidLineItems(value: QuotationLineItem[]) {
                            if (!Array.isArray(value)) {
                                throw new Error('Line items must be an array');
                            }

                            for (const item of value) {
                                if (!item.id || !item.description || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
                                    throw new Error('Invalid line item format');
                                }

                                if (item.quantity <= 0 || item.unitPrice < 0) {
                                    throw new Error('Invalid line item values');
                                }
                            }
                        },
                    },
                },
                subtotal: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                    },
                },
                taxRate: {
                    type: DataTypes.DECIMAL(5, 2),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                        max: 100,
                    },
                },
                taxAmount: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                    },
                },
                total: {
                    type: DataTypes.DECIMAL(10, 2),
                    allowNull: false,
                    defaultValue: 0,
                    validate: {
                        min: 0,
                    },
                },
                validUntil: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    validate: {
                        isDate: true,
                        isAfter: {
                            args: new Date().toISOString(),
                            msg: 'Valid until date must be in the future',
                        },
                    },
                },
                status: {
                    type: DataTypes.ENUM(...Object.values(QuotationStatus)),
                    allowNull: false,
                    defaultValue: QuotationStatus.DRAFT,
                    validate: {
                        isIn: [Object.values(QuotationStatus)],
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
                modelName: 'Quotation',
                tableName: 'quotations',
                timestamps: true,
                underscored: true,
                indexes: [
                    {
                        unique: true,
                        fields: ['quotation_number'],
                    },
                    {
                        fields: ['service_request_id'],
                    },
                    {
                        fields: ['created_by_id'],
                    },
                    {
                        fields: ['status'],
                    },
                    {
                        fields: ['valid_until'],
                    },
                    {
                        fields: ['created_at'],
                    },
                ],
            }
        );

        return Quotation;
    }
}