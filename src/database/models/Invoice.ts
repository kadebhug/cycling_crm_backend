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
import { InvoiceAttributes, PaymentStatus, InvoiceLineItem } from '../../types/database/database.types';
import { User } from './User';

export class Invoice extends Model<
  InferAttributes<Invoice>,
  InferCreationAttributes<Invoice>
> implements InvoiceAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare serviceRecordId: ForeignKey<any>;
  declare quotationId: ForeignKey<any> | null;
  declare createdById: ForeignKey<User['id']>;

  // Required fields
  declare invoiceNumber: string;
  declare lineItems: InvoiceLineItem[];
  declare subtotal: number;
  declare taxRate: number;
  declare taxAmount: number;
  declare total: number;
  declare paidAmount: CreationOptional<number>;
  declare paymentStatus: CreationOptional<PaymentStatus>;
  declare dueDate: Date;

  // Optional fields
  declare paidDate: Date | null;
  declare notes: string | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare serviceRecord?: NonAttribute<any>;
  declare quotation?: NonAttribute<any>;
  declare createdBy?: NonAttribute<User>;

  // Association declarations
  declare static associations: {
    serviceRecord: Association<Invoice, any>;
    quotation: Association<Invoice, any>;
    createdBy: Association<Invoice, User>;
  };

  // Instance methods
  public isPending(): boolean {
    return this.paymentStatus === PaymentStatus.PENDING;
  }

  public isPartiallyPaid(): boolean {
    return this.paymentStatus === PaymentStatus.PARTIAL;
  }

  public isPaid(): boolean {
    return this.paymentStatus === PaymentStatus.PAID;
  }

  public isOverdue(): boolean {
    return this.paymentStatus === PaymentStatus.OVERDUE || 
           (new Date() > this.dueDate && !this.isPaid());
  }

  public isCancelled(): boolean {
    return this.paymentStatus === PaymentStatus.CANCELLED;
  }

  public getRemainingAmount(): number {
    return Math.max(0, this.total - this.paidAmount);
  }

  public getPaymentPercentage(): number {
    if (this.total === 0) return 100;
    return Math.min(100, (this.paidAmount / this.total) * 100);
  }

  public getDaysOverdue(): number {
    if (!this.isOverdue()) return 0;
    
    const now = new Date();
    const diffTime = now.getTime() - this.dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getDaysUntilDue(): number {
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public isDueSoon(days: number = 7): boolean {
    const daysUntilDue = this.getDaysUntilDue();
    return daysUntilDue <= days && daysUntilDue > 0 && !this.isPaid();
  }

  public recordPayment(amount: number, paymentDate?: Date): void {
    const previousPaidAmount = this.paidAmount;
    this.paidAmount = Math.min(this.total, this.paidAmount + amount);
    
    // Update payment status
    if (this.paidAmount >= this.total) {
      this.paymentStatus = PaymentStatus.PAID;
      this.paidDate = paymentDate || new Date();
    } else if (this.paidAmount > 0) {
      this.paymentStatus = PaymentStatus.PARTIAL;
    }
    
    // If this is the first payment, set paid date
    if (previousPaidAmount === 0 && this.paidAmount > 0 && !this.paidDate) {
      this.paidDate = paymentDate || new Date();
    }
  }

  public recalculateTotals(): void {
    this.subtotal = this.lineItems.reduce((sum, item) => sum + item.total, 0);
    this.taxAmount = this.subtotal * (this.taxRate / 100);
    this.total = this.subtotal + this.taxAmount;
    
    // Update payment status based on new total
    if (this.paidAmount >= this.total) {
      this.paymentStatus = PaymentStatus.PAID;
    } else if (this.paidAmount > 0) {
      this.paymentStatus = PaymentStatus.PARTIAL;
    }
  }

  public addLineItem(item: Omit<InvoiceLineItem, 'id' | 'total'>): void {
    const lineItem: InvoiceLineItem = {
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

  public updateLineItem(itemId: string, updates: Partial<Omit<InvoiceLineItem, 'id'>>): void {
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

  public getFormattedRemainingAmount(): string {
    return `$${this.getRemainingAmount().toFixed(2)}`;
  }

  public getStatusColor(): string {
    const statusColors = {
      [PaymentStatus.PENDING]: '#fbbf24', // yellow
      [PaymentStatus.PARTIAL]: '#3b82f6', // blue
      [PaymentStatus.PAID]: '#10b981', // green
      [PaymentStatus.OVERDUE]: '#ef4444', // red
      [PaymentStatus.CANCELLED]: '#6b7280', // gray
    };
    return statusColors[this.paymentStatus as PaymentStatus];
  }

  // Static methods
  public static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    
    return `INV-${year}${month}${day}-${timestamp}`;
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof Invoice {
    Invoice.init(
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
        quotationId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'quotations',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        invoiceNumber: {
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
            isValidLineItems(value: InvoiceLineItem[]) {
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
        paidAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        paymentStatus: {
          type: DataTypes.ENUM(...Object.values(PaymentStatus)),
          allowNull: false,
          defaultValue: PaymentStatus.PENDING,
          validate: {
            isIn: [Object.values(PaymentStatus)],
          },
        },
        dueDate: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: true,
          },
        },
        paidDate: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: true,
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
        modelName: 'Invoice',
        tableName: 'invoices',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ['invoice_number'],
          },
          {
            fields: ['service_record_id'],
          },
          {
            fields: ['quotation_id'],
          },
          {
            fields: ['created_by_id'],
          },
          {
            fields: ['payment_status'],
          },
          {
            fields: ['due_date'],
          },
          {
            fields: ['paid_date'],
          },
          {
            fields: ['created_at'],
          },
        ],
      }
    );

    return Invoice;
  }
}