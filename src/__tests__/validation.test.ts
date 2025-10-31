/**
 * Tests for PLY file validation functions
 */

import { isPlyFile, isValidPlyBuffer, validatePlyBuffer } from '../api';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

describe('PLY Validation Functions', () => {
  const validPlyPath = path.join(__dirname, '../../samples/man.ply');
  let validPlyBuffer: Buffer;

  beforeAll(() => {
    if (fs.existsSync(validPlyPath)) {
      validPlyBuffer = fs.readFileSync(validPlyPath);
    }
  });

  describe('isValidPlyBuffer', () => {
    it('should return true for a valid PLY buffer', () => {
      if (!validPlyBuffer) {
        console.warn('Skipping test - sample PLY file not found');
        return;
      }

      const result = isValidPlyBuffer(validPlyBuffer);
      expect(result).toBe(true);
    });

    it('should return true for a minimal valid ASCII PLY buffer', () => {
      const minimalPly = Buffer.from(
        'ply\n' +
        'format ascii 1.0\n' +
        'element vertex 1\n' +
        'property float x\n' +
        'property float y\n' +
        'property float z\n' +
        'end_header\n' +
        '0 0 0\n'
      );

      const result = isValidPlyBuffer(minimalPly);
      expect(result).toBe(true);
    });

    it('should return true for a minimal valid binary PLY buffer', () => {
      const minimalPly = Buffer.from(
        'ply\n' +
        'format binary_little_endian 1.0\n' +
        'element vertex 1\n' +
        'property float x\n' +
        'property float y\n' +
        'property float z\n' +
        'end_header\n'
      );

      const result = isValidPlyBuffer(minimalPly);
      expect(result).toBe(true);
    });

    it('should return false for an empty buffer', () => {
      const emptyBuffer = Buffer.from('');
      const result = isValidPlyBuffer(emptyBuffer);
      expect(result).toBe(false);
    });

    it('should return false for a buffer without PLY magic header', () => {
      const invalidBuffer = Buffer.from('not a ply file\nformat ascii 1.0\n');
      const result = isValidPlyBuffer(invalidBuffer);
      expect(result).toBe(false);
    });

    it('should return false for a buffer with incorrect format', () => {
      const invalidBuffer = Buffer.from('ply\nwrong format\n');
      const result = isValidPlyBuffer(invalidBuffer);
      expect(result).toBe(false);
    });

    it('should return false for a buffer without end_header', () => {
      const invalidBuffer = Buffer.from(
        'ply\n' +
        'format ascii 1.0\n' +
        'element vertex 1\n'
      );
      const result = isValidPlyBuffer(invalidBuffer);
      expect(result).toBe(false);
    });

    it('should handle buffers with different line endings (CRLF)', () => {
      const plyWithCRLF = Buffer.from(
        'ply\r\n' +
        'format ascii 1.0\r\n' +
        'element vertex 1\r\n' +
        'property float x\r\n' +
        'property float y\r\n' +
        'property float z\r\n' +
        'end_header\r\n' +
        '0 0 0\r\n'
      );

      const result = isValidPlyBuffer(plyWithCRLF);
      expect(result).toBe(true);
    });

    it('should handle buffers with extra whitespace', () => {
      const plyWithWhitespace = Buffer.from(
        '  ply  \n' +
        '  format ascii 1.0  \n' +
        'element vertex 1\n' +
        'property float x\n' +
        'property float y\n' +
        'property float z\n' +
        '  end_header  \n' +
        '0 0 0\n'
      );

      const result = isValidPlyBuffer(plyWithWhitespace);
      expect(result).toBe(true);
    });
  });

  describe('validatePlyBuffer', () => {
    it('should not throw for a valid PLY buffer', () => {
      if (!validPlyBuffer) {
        console.warn('Skipping test - sample PLY file not found');
        return;
      }

      expect(() => validatePlyBuffer(validPlyBuffer)).not.toThrow();
    });

    it('should not throw for a minimal valid ASCII PLY buffer', () => {
      const minimalPly = Buffer.from(
        'ply\n' +
        'format ascii 1.0\n' +
        'element vertex 1\n' +
        'property float x\n' +
        'property float y\n' +
        'property float z\n' +
        'end_header\n' +
        '0 0 0\n'
      );

      expect(() => validatePlyBuffer(minimalPly)).not.toThrow();
    });

    it('should throw for an empty buffer', () => {
      const emptyBuffer = Buffer.from('');
      expect(() => validatePlyBuffer(emptyBuffer)).toThrow('Invalid PLY file');
    });

    it('should throw for a buffer without PLY magic header', () => {
      const invalidBuffer = Buffer.from('not a ply file\nformat ascii 1.0\n');
      expect(() => validatePlyBuffer(invalidBuffer)).toThrow('Invalid PLY file');
    });

    it('should throw for a buffer with incorrect format', () => {
      const invalidBuffer = Buffer.from('ply\nwrong format\n');
      expect(() => validatePlyBuffer(invalidBuffer)).toThrow('Invalid PLY file');
    });

    it('should throw for a buffer without end_header', () => {
      const invalidBuffer = Buffer.from(
        'ply\n' +
        'format ascii 1.0\n' +
        'element vertex 1\n'
      );
      expect(() => validatePlyBuffer(invalidBuffer)).toThrow('Invalid PLY file');
    });

    it('should include error details in the thrown error', () => {
      const emptyBuffer = Buffer.from('');
      
      try {
        validatePlyBuffer(emptyBuffer);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('Invalid PLY file');
      }
    });
  });

  describe('isPlyFile', () => {
    it('should return true for a valid PLY file path', async () => {
      if (!fs.existsSync(validPlyPath)) {
        console.warn('Skipping test - sample PLY file not found');
        return;
      }

      const result = await isPlyFile(validPlyPath);
      expect(result).toBe(true);
    });

    it('should return true for a valid PLY buffer', async () => {
      if (!validPlyBuffer) {
        console.warn('Skipping test - sample PLY file not found');
        return;
      }

      const result = await isPlyFile(validPlyBuffer);
      expect(result).toBe(true);
    });

    it('should return true for a minimal valid ASCII PLY buffer', async () => {
      const minimalPly = Buffer.from(
        'ply\n' +
        'format ascii 1.0\n' +
        'element vertex 1\n' +
        'property float x\n' +
        'property float y\n' +
        'property float z\n' +
        'end_header\n' +
        '0 0 0\n'
      );

      const result = await isPlyFile(minimalPly);
      expect(result).toBe(true);
    });

    it('should return true for a valid PLY stream', async () => {
      if (!fs.existsSync(validPlyPath)) {
        console.warn('Skipping test - sample PLY file not found');
        return;
      }

      const stream = fs.createReadStream(validPlyPath);
      const result = await isPlyFile(stream);
      expect(result).toBe(true);
    });

    it('should return false for an empty buffer', async () => {
      const emptyBuffer = Buffer.from('');
      const result = await isPlyFile(emptyBuffer);
      expect(result).toBe(false);
    });

    it('should return false for an invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not a ply file');
      const result = await isPlyFile(invalidBuffer);
      expect(result).toBe(false);
    });

    it('should return false for a non-existent file path', async () => {
      const result = await isPlyFile('/non/existent/file.ply');
      expect(result).toBe(false);
    });

    it('should return false for an invalid file', async () => {
      // Create a temporary invalid file
      const tempPath = path.join(__dirname, 'temp-invalid.txt');
      fs.writeFileSync(tempPath, 'not a ply file');

      try {
        const result = await isPlyFile(tempPath);
        expect(result).toBe(false);
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    it('should handle streams that contain invalid PLY data', async () => {
      const invalidData = 'not a ply file\nformat ascii 1.0\n';
      const stream = Readable.from([invalidData]);
      
      const result = await isPlyFile(stream);
      expect(result).toBe(false);
    });

    it('should handle buffers with binary PLY format', async () => {
      const binaryPly = Buffer.from(
        'ply\n' +
        'format binary_little_endian 1.0\n' +
        'element vertex 1\n' +
        'property float x\n' +
        'property float y\n' +
        'property float z\n' +
        'end_header\n'
      );

      const result = await isPlyFile(binaryPly);
      expect(result).toBe(true);
    });

    it('should handle edge case with just the PLY header', async () => {
      const justHeader = Buffer.from('ply\n');
      const result = await isPlyFile(justHeader);
      expect(result).toBe(false);
    });

    it('should handle corrupted PLY files gracefully', async () => {
      const corruptedPly = Buffer.from(
        'ply\n' +
        'format ascii 1.0\n' +
        // Missing element and property definitions - this makes it invalid
        '0 0 0\n'
      );

      const result = await isPlyFile(corruptedPly);
      // Should return false for corrupted files without proper structure
      expect(result).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should validate and then read a PLY file successfully', async () => {
      if (!validPlyBuffer) {
        console.warn('Skipping test - sample PLY file not found');
        return;
      }

      // First validate
      const isValid = isValidPlyBuffer(validPlyBuffer);
      expect(isValid).toBe(true);

      // Then validate it doesn't throw
      expect(() => validatePlyBuffer(validPlyBuffer)).not.toThrow();

      // Finally check with isPlyFile
      const isPly = await isPlyFile(validPlyBuffer);
      expect(isPly).toBe(true);
    });

    it('should consistently reject invalid data across all validation methods', async () => {
      const invalidBuffer = Buffer.from('not a ply file');

      // All should agree it's not valid
      expect(isValidPlyBuffer(invalidBuffer)).toBe(false);
      expect(() => validatePlyBuffer(invalidBuffer)).toThrow();
      expect(await isPlyFile(invalidBuffer)).toBe(false);
    });

    it('should handle large PLY files efficiently', async () => {
      if (!validPlyBuffer) {
        console.warn('Skipping test - sample PLY file not found');
        return;
      }

      const startTime = Date.now();
      const result = await isPlyFile(validPlyBuffer);
      const duration = Date.now() - startTime;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
