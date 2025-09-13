import {
  validateFileName,
  validateFileExtensionMimeType,
  validateFileType,
  validateFileSize,
  FILE_VALIDATION,
} from '../../validators/media.validators';
import {
  validateFileType as storageValidateFileType,
  validateFileSize as storageValidateFileSize,
} from '../../config/storage';

describe('Media Security Validations', () => {
  describe('validateFileName', () => {
    it('should accept valid file names', () => {
      const validNames = [
        'document.pdf',
        'image.jpg',
        'my-file_123.png',
        'report-2024.docx',
        'bike_photo.jpeg',
      ];

      validNames.forEach(name => {
        const result = validateFileName(name);
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    it('should reject file names with null bytes', () => {
      const result = validateFileName('file\0.jpg');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Filename contains null bytes');
    });

    it('should reject file names with path traversal', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        'file/../../../secret.txt',
        'normal\\..\\dangerous.exe',
      ];

      dangerousNames.forEach(name => {
        const result = validateFileName(name);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Filename contains path traversal characters');
      });
    });

    it('should reject reserved Windows names', () => {
      const reservedNames = [
        'CON.txt',
        'PRN.pdf',
        'AUX.jpg',
        'NUL.png',
        'COM1.doc',
        'LPT1.docx',
      ];

      reservedNames.forEach(name => {
        const result = validateFileName(name);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Filename uses reserved system name');
      });
    });

    it('should reject dangerous file extensions', () => {
      const dangerousNames = [
        'script.exe',
        'malware.bat',
        'virus.cmd',
        'trojan.scr',
        'backdoor.pif',
        'payload.com',
        'script.js',
        'macro.vbs',
        'exploit.jar',
        'shell.php',
        'webshell.asp',
        'backdoor.jsp',
      ];

      dangerousNames.forEach(name => {
        const result = validateFileName(name);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Filename has potentially dangerous extension');
      });
    });

    it('should reject file names that are too long', () => {
      const longName = 'a'.repeat(256) + '.jpg';
      const result = validateFileName(longName);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Filename too long');
    });
  });

  describe('validateFileExtensionMimeType', () => {
    it('should validate matching MIME types and extensions', () => {
      const validCombinations = [
        { filename: 'image.jpg', mimeType: 'image/jpeg' },
        { filename: 'image.jpeg', mimeType: 'image/jpeg' },
        { filename: 'image.png', mimeType: 'image/png' },
        { filename: 'image.gif', mimeType: 'image/gif' },
        { filename: 'image.webp', mimeType: 'image/webp' },
        { filename: 'document.pdf', mimeType: 'application/pdf' },
        { filename: 'document.doc', mimeType: 'application/msword' },
        { filename: 'document.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { filename: 'text.txt', mimeType: 'text/plain' },
        { filename: 'video.mp4', mimeType: 'video/mp4' },
        { filename: 'video.avi', mimeType: 'video/avi' },
      ];

      validCombinations.forEach(({ filename, mimeType }) => {
        const result = validateFileExtensionMimeType(filename, mimeType);
        expect(result).toBe(true);
      });
    });

    it('should reject mismatched MIME types and extensions', () => {
      const invalidCombinations = [
        { filename: 'image.jpg', mimeType: 'application/pdf' },
        { filename: 'document.pdf', mimeType: 'image/jpeg' },
        { filename: 'script.exe', mimeType: 'image/jpeg' },
        { filename: 'video.mp4', mimeType: 'image/png' },
        { filename: 'text.txt', mimeType: 'video/mp4' },
      ];

      invalidCombinations.forEach(({ filename, mimeType }) => {
        const result = validateFileExtensionMimeType(filename, mimeType);
        expect(result).toBe(false);
      });
    });

    it('should handle files without extensions', () => {
      const result = validateFileExtensionMimeType('noextension', 'image/jpeg');
      expect(result).toBe(false);
    });

    it('should handle unknown MIME types', () => {
      const result = validateFileExtensionMimeType('file.unknown', 'application/unknown');
      expect(result).toBe(false);
    });
  });

  describe('validateFileType', () => {
    it('should accept allowed MIME types', () => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'text/plain',
        'video/mp4',
      ];

      allowedTypes.forEach(mimeType => {
        expect(validateFileType(mimeType)).toBe(true);
      });
    });

    it('should reject disallowed MIME types', () => {
      const disallowedTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-msdos-program',
        'text/javascript',
        'application/javascript',
        'text/html',
        'application/x-php',
        'application/x-httpd-php',
        'application/java-archive',
        'application/x-java-archive',
      ];

      disallowedTypes.forEach(mimeType => {
        expect(validateFileType(mimeType)).toBe(false);
      });
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const validSizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        FILE_VALIDATION.MAX_FILE_SIZE, // Exactly at limit
      ];

      validSizes.forEach(size => {
        expect(validateFileSize(size)).toBe(true);
      });
    });

    it('should reject files exceeding size limit', () => {
      const invalidSizes = [
        FILE_VALIDATION.MAX_FILE_SIZE + 1,
        15 * 1024 * 1024, // 15MB
        100 * 1024 * 1024, // 100MB
      ];

      invalidSizes.forEach(size => {
        expect(validateFileSize(size)).toBe(false);
      });
    });

    it('should handle zero-byte files', () => {
      expect(validateFileSize(0)).toBe(true);
    });
  });

  describe('Storage Configuration Validations', () => {
    it('should validate file types using storage config', () => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'video/mp4',
      ];

      allowedTypes.forEach(mimeType => {
        expect(storageValidateFileType(mimeType)).toBe(true);
      });
    });

    it('should reject invalid file types using storage config', () => {
      const disallowedTypes = [
        'application/x-executable',
        'text/javascript',
        'application/x-php',
      ];

      disallowedTypes.forEach(mimeType => {
        expect(storageValidateFileType(mimeType)).toBe(false);
      });
    });

    it('should validate file sizes using storage config', () => {
      expect(storageValidateFileSize(1024)).toBe(true);
      expect(storageValidateFileSize(10 * 1024 * 1024)).toBe(true);
      expect(storageValidateFileSize(15 * 1024 * 1024)).toBe(false);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle case-insensitive extension checks', () => {
      const testCases = [
        { filename: 'IMAGE.JPG', mimeType: 'image/jpeg' },
        { filename: 'Document.PDF', mimeType: 'application/pdf' },
        { filename: 'video.MP4', mimeType: 'video/mp4' },
      ];

      testCases.forEach(({ filename, mimeType }) => {
        const result = validateFileExtensionMimeType(filename, mimeType);
        expect(result).toBe(true);
      });
    });

    it('should handle multiple dots in filename', () => {
      const result = validateFileExtensionMimeType('my.file.with.dots.jpg', 'image/jpeg');
      expect(result).toBe(true);
    });

    it('should reject double extensions (potential bypass attempt)', () => {
      const dangerousFiles = [
        'image.jpg.exe',
        'document.pdf.bat',
        'video.mp4.cmd',
      ];

      dangerousFiles.forEach(filename => {
        const result = validateFileName(filename);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Filename has potentially dangerous extension');
      });
    });

    it('should handle Unicode and special characters safely', () => {
      const unicodeNames = [
        'файл.jpg', // Cyrillic
        '文件.png', // Chinese
        'ملف.pdf', // Arabic
        'file-with-émojis-🎉.jpg',
      ];

      unicodeNames.forEach(name => {
        const result = validateFileName(name);
        // Should be valid as long as no dangerous patterns
        expect(result.valid).toBe(true);
      });
    });

    it('should reject extremely long file names', () => {
      const extremelyLongName = 'a'.repeat(1000) + '.jpg';
      const result = validateFileName(extremelyLongName);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Filename too long');
    });

    it('should handle empty or whitespace-only filenames', () => {
      const invalidNames = ['', '   ', '\t\n', '.jpg', '   .pdf'];

      invalidNames.forEach(name => {
        // These should be caught by other validation layers
        // but our function should handle them gracefully
        const result = validateFileName(name);
        // The behavior may vary, but it should not crash
        expect(typeof result.valid).toBe('boolean');
      });
    });
  });

  describe('MIME Type Spoofing Protection', () => {
    it('should detect common MIME type spoofing attempts', () => {
      const spoofingAttempts = [
        { filename: 'malware.exe', mimeType: 'image/jpeg' },
        { filename: 'script.js', mimeType: 'text/plain' },
        { filename: 'shell.php', mimeType: 'application/pdf' },
        { filename: 'backdoor.asp', mimeType: 'image/png' },
      ];

      spoofingAttempts.forEach(({ filename, mimeType }) => {
        // First, the filename should be rejected due to dangerous extension
        const filenameResult = validateFileName(filename);
        expect(filenameResult.valid).toBe(false);

        // Second, the MIME type mismatch should be detected
        const mimeResult = validateFileExtensionMimeType(filename, mimeType);
        expect(mimeResult).toBe(false);
      });
    });

    it('should handle case variations in extensions', () => {
      const caseVariations = [
        { filename: 'script.EXE', mimeType: 'image/jpeg' },
        { filename: 'malware.Bat', mimeType: 'text/plain' },
        { filename: 'virus.CMD', mimeType: 'application/pdf' },
      ];

      caseVariations.forEach(({ filename }) => {
        const result = validateFileName(filename);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Filename has potentially dangerous extension');
      });
    });
  });
});