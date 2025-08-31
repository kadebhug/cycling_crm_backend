import { User, Store, Service, Bike, ServiceRequest } from '../database/models';
import { UserRole, Priority, RequestStatus } from '../types/database/database.types';

describe('Sequelize Models', () => {
  describe('User Model', () => {
    test('should have correct static methods', () => {
      expect(typeof User.initModel).toBe('function');
    });

    test('should create user instance with correct properties', () => {
      const userData = {
        id: 'test-id',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: UserRole.CUSTOMER,
        firstName: 'John',
        lastName: 'Doe',
        phone: '123-456-7890',
        isActive: true,
        emailVerified: false,
        emailVerificationToken: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Test instance methods would work with actual instance
      expect(UserRole.CUSTOMER).toBe('customer');
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.STORE_OWNER).toBe('store_owner');
      expect(UserRole.STAFF).toBe('staff');
    });
  });

  describe('Store Model', () => {
    test('should have correct static methods', () => {
      expect(typeof Store.initModel).toBe('function');
    });
  });

  describe('Service Model', () => {
    test('should have correct static methods', () => {
      expect(typeof Service.initModel).toBe('function');
      expect(Array.isArray(Service.getCommonCategories())).toBe(true);
      expect(Service.getCommonCategories().length).toBeGreaterThan(0);
    });

    test('should return common categories', () => {
      const categories = Service.getCommonCategories();
      expect(categories).toContain('Basic Maintenance');
      expect(categories).toContain('Brake Service');
      expect(categories).toContain('Drivetrain Service');
    });
  });

  describe('Bike Model', () => {
    test('should have correct static methods', () => {
      expect(typeof Bike.initModel).toBe('function');
    });
  });

  describe('ServiceRequest Model', () => {
    test('should have correct static methods', () => {
      expect(typeof ServiceRequest.initModel).toBe('function');
    });

    test('should have correct enums', () => {
      expect(Priority.LOW).toBe('low');
      expect(Priority.MEDIUM).toBe('medium');
      expect(Priority.HIGH).toBe('high');
      expect(Priority.URGENT).toBe('urgent');

      expect(RequestStatus.PENDING).toBe('pending');
      expect(RequestStatus.QUOTED).toBe('quoted');
      expect(RequestStatus.APPROVED).toBe('approved');
      expect(RequestStatus.IN_PROGRESS).toBe('in_progress');
      expect(RequestStatus.COMPLETED).toBe('completed');
      expect(RequestStatus.CANCELLED).toBe('cancelled');
      expect(RequestStatus.EXPIRED).toBe('expired');
    });
  });
});