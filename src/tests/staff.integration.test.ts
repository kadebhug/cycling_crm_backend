import { StaffService } from '../services/staff.service';
import { UserRole, Permission } from '../types/database/database.types';

describe('Staff Management Integration Tests', () => {
  let staffService: StaffService;

  beforeEach(() => {
    staffService = new StaffService();
  });

  describe('Service Integration', () => {
    it('should have all required methods', () => {
      expect(staffService.createStaff).toBeDefined();
      expect(staffService.getStoreStaff).toBeDefined();
      expect(staffService.getStaffById).toBeDefined();
      expect(staffService.updateStaff).toBeDefined();
      expect(staffService.updateStaffPermissions).toBeDefined();
      expect(staffService.removeStaffFromStore).toBeDefined();
      expect(staffService.addStaffToStore).toBeDefined();
      expect(staffService.getStaffStores).toBeDefined();
      expect(staffService.getStaffPermissions).toBeDefined();
    });

    it('should have static helper methods', () => {
      expect(StaffService.getDefaultStaffPermissions).toBeDefined();
      expect(StaffService.getDefaultSeniorStaffPermissions).toBeDefined();
      expect(StaffService.getAllPermissions).toBeDefined();
    });

    it('should return default permissions correctly', () => {
      const defaultPermissions = StaffService.getDefaultStaffPermissions();
      const seniorPermissions = StaffService.getDefaultSeniorStaffPermissions();
      const allPermissions = StaffService.getAllPermissions();

      expect(Array.isArray(defaultPermissions)).toBe(true);
      expect(Array.isArray(seniorPermissions)).toBe(true);
      expect(Array.isArray(allPermissions)).toBe(true);
      
      expect(defaultPermissions.length).toBeGreaterThan(0);
      expect(seniorPermissions.length).toBeGreaterThan(defaultPermissions.length);
      expect(allPermissions.length).toBeGreaterThan(seniorPermissions.length);
      
      expect(allPermissions).toEqual(Object.values(Permission));
    });
  });
});