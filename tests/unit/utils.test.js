const crypto = require('crypto');
const bcrypt = require('bcryptjs');

describe('Utility Functions', () => {
  describe('Crypto utilities', () => {
    it('should generate random strings', () => {
      const random1 = crypto.randomBytes(16).toString('hex');
      const random2 = crypto.randomBytes(16).toString('hex');
      
      expect(random1).not.toBe(random2);
      expect(random1).toHaveLength(32);
      expect(random2).toHaveLength(32);
    });

    it('should hash passwords consistently', async () => {
      const password = 'test-password';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);
      
      expect(hash1).not.toBe(hash2); // Different salts
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
      expect(await bcrypt.compare('wrong-password', hash1)).toBe(false);
    });
  });

  describe('URL validation', () => {
    function isValidUrl(url) {
      try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      } catch {
        return false;
      }
    }

    it('should validate HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
    });
  });

  describe('Data processing', () => {
    function calculateCost(calls, bytes, pricePerCall, pricePerByte) {
      return (calls * pricePerCall) + (bytes * pricePerByte);
    }

    it('should calculate costs correctly', () => {
      expect(calculateCost(10, 1000, 0.001, 0.0001)).toBe(0.11);
      expect(calculateCost(0, 0, 0.001, 0.0001)).toBe(0);
      expect(calculateCost(1, 0, 0.001, 0.0001)).toBe(0.001);
      expect(calculateCost(0, 1000, 0.001, 0.0001)).toBe(0.1);
    });

    it('should handle edge cases', () => {
      expect(calculateCost(0, 0, 0, 0)).toBe(0);
      expect(calculateCost(1000000, 1000000, 0.001, 0.0001)).toBe(1100);
    });
  });

  describe('String utilities', () => {
    function generateApiKey(prefix = 'ac_') {
      const randomBytes = crypto.randomBytes(24).toString('hex');
      return `${prefix}${randomBytes}`;
    }

    it('should generate API keys with correct format', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey('test_');
      
      expect(key1).toMatch(/^ac_[a-f0-9]{48}$/);
      expect(key2).toMatch(/^test_[a-f0-9]{48}$/);
      expect(key1).not.toBe(key2);
    });

    it('should handle empty prefix', () => {
      const key = generateApiKey('');
      expect(key).toMatch(/^[a-f0-9]{48}$/);
    });
  });

  describe('Date utilities', () => {
    it('should format dates correctly', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const dateStr = date.toISOString().split('T')[0];
      const monthStr = date.toISOString().substring(0, 7);
      
      expect(dateStr).toBe('2023-01-01');
      expect(monthStr).toBe('2023-01');
    });

    it('should handle current date', () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const month = now.toISOString().substring(0, 7);
      
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(month).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});