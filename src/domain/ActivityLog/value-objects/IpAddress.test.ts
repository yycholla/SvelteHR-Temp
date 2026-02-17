// src/domain/ActivityLog/value-objects/IpAddress.test.ts
import { describe, it, expect } from 'vitest';
import { IpAddress } from './IpAddress';

describe('IpAddress', () => {
	describe('create()', () => {
		it('should create IpAddress with valid IPv4 address', () => {
			const result = IpAddress.create('192.168.1.1');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('192.168.1.1');
		});

		it('should create IpAddress with valid IPv6 address', () => {
			const result = IpAddress.create('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
			expect(result.isOk).toBe(true);
		});

		it('should create IpAddress with shortened IPv6 address', () => {
			const result = IpAddress.create('::1');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('::1');
		});

		it('should create IpAddress with localhost IPv4', () => {
			const result = IpAddress.create('127.0.0.1');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('127.0.0.1');
		});

		it('should trim whitespace from IP address', () => {
			const result = IpAddress.create('  192.168.1.1  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('192.168.1.1');
		});

		it('should return error for empty string', () => {
			const result = IpAddress.create('');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('should return error for whitespace-only string', () => {
			const result = IpAddress.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('should return error for IP address exceeding 45 characters', () => {
			const longIp = 'a'.repeat(46);
			const result = IpAddress.create(longIp);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('45 characters');
		});

		it('should accept exactly 45 characters', () => {
			const ip = 'a'.repeat(45);
			const result = IpAddress.create(ip);
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(ip);
		});
	});

	describe('equals()', () => {
		it('should return true for same IP addresses', () => {
			const ip1 = IpAddress.create('192.168.1.1').value;
			const ip2 = IpAddress.create('192.168.1.1').value;
			expect(ip1.equals(ip2)).toBe(true);
		});

		it('should return false for different IP addresses', () => {
			const ip1 = IpAddress.create('192.168.1.1').value;
			const ip2 = IpAddress.create('10.0.0.1').value;
			expect(ip1.equals(ip2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the IP address string', () => {
			const ip = IpAddress.create('192.168.1.1').value;
			expect(ip.toString()).toBe('192.168.1.1');
		});
	});
});
