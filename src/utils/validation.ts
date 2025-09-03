import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }

    return uuidValidate(uuid) && uuidVersion(uuid) === 4;
  }

  /**
   * Validate phone number format (basic validation)
   */
  static isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false;
    }

    // Basic phone validation - allows digits, spaces, hyphens, parentheses, and plus sign
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * Validate string length
   */
  static isValidLength(str: string, min: number, max?: number): boolean {
    if (!str || typeof str !== 'string') {
      return false;
    }

    const length = str.trim().length;
    if (length < min) {
      return false;
    }

    if (max !== undefined && length > max) {
      return false;
    }

    return true;
  }

  /**
   * Validate required string field
   */
  static isRequiredString(str: any): boolean {
    return typeof str === 'string' && str.trim().length > 0;
  }

  /**
   * Validate numeric value
   */
  static isValidNumber(value: any, min?: number, max?: number): boolean {
    const num = Number(value);
    
    if (isNaN(num) || !isFinite(num)) {
      return false;
    }

    if (min !== undefined && num < min) {
      return false;
    }

    if (max !== undefined && num > max) {
      return false;
    }

    return true;
  }

  /**
   * Validate positive integer
   */
  static isPositiveInteger(value: any): boolean {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
  }

  /**
   * Validate boolean value
   */
  static isValidBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }

  /**
   * Validate date string
   */
  static isValidDate(dateString: string): boolean {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }

    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Validate future date
   */
  static isFutureDate(dateString: string): boolean {
    if (!this.isValidDate(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    const now = new Date();
    return date > now;
  }

  /**
   * Validate past date
   */
  static isPastDate(dateString: string): boolean {
    if (!this.isValidDate(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    const now = new Date();
    return date < now;
  }

  /**
   * Validate URL format
   */
  static isValidURL(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return '';
    }

    return str.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate array with minimum length
   */
  static isValidArray(arr: any, minLength: number = 0): boolean {
    return Array.isArray(arr) && arr.length >= minLength;
  }

  /**
   * Validate object has required properties
   */
  static hasRequiredProperties(obj: any, requiredProps: string[]): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    return requiredProps.every(prop => obj.hasOwnProperty(prop));
  }

  /**
   * Validate enum value
   */
  static isValidEnumValue<T>(value: any, enumObject: Record<string, T>): value is T {
    return Object.values(enumObject).includes(value);
  }

  /**
   * Validate password strength (basic)
   */
  static isStrongPassword(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // At least 8 characters, contains uppercase, lowercase, number
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return strongPasswordRegex.test(password);
  }

  /**
   * Validate file extension
   */
  static hasValidFileExtension(filename: string, allowedExtensions: string[]): boolean {
    if (!filename || typeof filename !== 'string') {
      return false;
    }

    const extension = filename.toLowerCase().split('.').pop();
    return extension ? allowedExtensions.includes(extension) : false;
  }

  /**
   * Validate MIME type
   */
  static isValidMimeType(mimeType: string, allowedTypes: string[]): boolean {
    if (!mimeType || typeof mimeType !== 'string') {
      return false;
    }

    return allowedTypes.includes(mimeType.toLowerCase());
  }
}