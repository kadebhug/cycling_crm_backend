// Authentication permission types

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  roleId: number;
  permissionId: number;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  userId: number;
}

export interface UserPermissions {
  userId: number;
  permissions: string[];
  roles: string[];
}
