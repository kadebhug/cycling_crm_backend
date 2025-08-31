// Database model types

export interface BaseModel {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserModel extends BaseModel {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

export interface CustomerModel extends BaseModel {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  userId?: number;
}

export interface StoreModel extends BaseModel {
  name: string;
  address: string;
  phone: string;
  email: string;
  managerId: number;
  isActive: boolean;
}
