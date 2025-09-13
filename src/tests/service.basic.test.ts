import { Service } from '../database/models/Service';

describe('Service Basic Tests', () => {
  describe('Service Model Static Methods', () => {
    it('should return common categories', () => {
      const categories = Service.getCommonCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('Basic Maintenance');
      expect(categories).toContain('Brake Service');
      expect(categories).toContain('Drivetrain Service');
      expect(categories).toContain('Wheel Service');
    });
  });

  describe('Service Model Instance Methods', () => {
    // Mock service instance for testing methods
    const mockService = {
      basePrice: 75.50,
      estimatedDuration: 90,
      category: 'Brake Service',
      getFormattedPrice: Service.prototype.getFormattedPrice,
      getEstimatedDurationFormatted: Service.prototype.getEstimatedDurationFormatted,
      isInCategory: Service.prototype.isInCategory,
    };

    it('should format price correctly', () => {
      const formattedPrice = mockService.getFormattedPrice.call(mockService);
      expect(formattedPrice).toBe('$75.50');
    });

    it('should format duration correctly for hours and minutes', () => {
      const formatted = mockService.getEstimatedDurationFormatted.call(mockService);
      expect(formatted).toBe('1 hour 30 minutes');
    });

    it('should format duration correctly for only minutes', () => {
      const serviceWithMinutes = { ...mockService, estimatedDuration: 45 };
      const formatted = mockService.getEstimatedDurationFormatted.call(serviceWithMinutes);
      expect(formatted).toBe('45 minutes');
    });

    it('should format duration correctly for only hours', () => {
      const serviceWithHours = { ...mockService, estimatedDuration: 120 };
      const formatted = mockService.getEstimatedDurationFormatted.call(serviceWithHours);
      expect(formatted).toBe('2 hours');
    });

    it('should handle null duration', () => {
      const serviceWithNullDuration = { ...mockService, estimatedDuration: null };
      const formatted = mockService.getEstimatedDurationFormatted.call(serviceWithNullDuration);
      expect(formatted).toBe('Duration not specified');
    });

    it('should check category correctly', () => {
      expect(mockService.isInCategory.call(mockService, 'Brake Service')).toBe(true);
      expect(mockService.isInCategory.call(mockService, 'brake service')).toBe(true);
      expect(mockService.isInCategory.call(mockService, 'BRAKE SERVICE')).toBe(true);
      expect(mockService.isInCategory.call(mockService, 'Basic Maintenance')).toBe(false);
    });
  });
});