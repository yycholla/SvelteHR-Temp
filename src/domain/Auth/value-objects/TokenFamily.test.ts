import { describe, it, expect } from 'vitest';
import { TokenFamily } from './TokenFamily';
import { InvalidTokenError } from '../errors/TokenErrors';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('TokenFamily', () => {
	describe('create', () => {
		it('should create a valid token family', () => {
			const now = new Date();
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: now
			});

			expect(result.isOk).toBe(true);
			expect(result.value.familyId).toBe('family-uuid-123');
			expect(result.value.userId).toBe(VALID_UUID);
			expect(result.value.createdAt.getTime()).toBe(now.getTime());
			expect(result.value.isRevoked).toBe(false);
			expect(result.value.revokedAt).toBeUndefined();
			expect(result.value.revokedReason).toBeUndefined();
		});

		it('should fail for empty family ID', () => {
			const result = TokenFamily.create({
				familyId: '',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('Family ID');
		});

		it('should fail for whitespace-only family ID', () => {
			const result = TokenFamily.create({
				familyId: '   ',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
		});

		it('should fail for invalid UUID userId', () => {
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: 'not-a-uuid',
				createdAt: new Date()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('User ID');
		});

		it('should fail for invalid createdAt date', () => {
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date('invalid')
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('Created date');
		});

		it('should accept a family with pre-existing revocation state', () => {
			const revokedAt = new Date();
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date(Date.now() - 60000),
				revokedAt,
				revokedReason: 'replay attack detected'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isRevoked).toBe(true);
			expect(result.value.revokedAt!.getTime()).toBe(revokedAt.getTime());
			expect(result.value.revokedReason).toBe('replay attack detected');
		});
	});

	describe('revoke', () => {
		it('should return a new revoked instance', () => {
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			expect(result.isOk).toBe(true);
			const original = result.value;
			const revoked = original.revoke('replay attack detected');

			// Original should NOT be mutated
			expect(original.isRevoked).toBe(false);
			expect(original.revokedAt).toBeUndefined();
			expect(original.revokedReason).toBeUndefined();

			// Revoked copy should have revocation state
			expect(revoked.isRevoked).toBe(true);
			expect(revoked.revokedReason).toBe('replay attack detected');
			expect(revoked.revokedAt).toBeInstanceOf(Date);
		});

		it('should record revocation timestamp', () => {
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			expect(result.isOk).toBe(true);
			const before = Date.now();
			const revoked = result.value.revoke('test');
			const after = Date.now();

			expect(revoked.revokedAt).toBeDefined();
			expect(revoked.revokedAt!.getTime()).toBeGreaterThanOrEqual(before);
			expect(revoked.revokedAt!.getTime()).toBeLessThanOrEqual(after);
		});

		it('should preserve familyId and userId after revocation', () => {
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			expect(result.isOk).toBe(true);
			const revoked = result.value.revoke('some reason');

			expect(revoked.familyId).toBe('family-uuid-123');
			expect(revoked.userId).toBe(VALID_UUID);
		});
	});

	describe('equals', () => {
		it('should return true for families with same familyId and userId', () => {
			const result1 = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			const result2 = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date(Date.now() - 60000) // different createdAt
			});

			expect(result1.isOk).toBe(true);
			expect(result2.isOk).toBe(true);
			expect(result1.value.equals(result2.value)).toBe(true);
		});

		it('should return false for families with different familyId', () => {
			const result1 = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			const result2 = TokenFamily.create({
				familyId: 'family-uuid-456',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			expect(result1.isOk).toBe(true);
			expect(result2.isOk).toBe(true);
			expect(result1.value.equals(result2.value)).toBe(false);
		});

		it('should return false for families with different userId', () => {
			const result1 = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date()
			});

			const result2 = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: '00000000-0000-0000-0000-000000000000',
				createdAt: new Date()
			});

			expect(result1.isOk).toBe(true);
			expect(result2.isOk).toBe(true);
			expect(result1.value.equals(result2.value)).toBe(false);
		});
	});

	describe('immutability', () => {
		it('should return defensive copy of createdAt', () => {
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date('2026-01-01T00:00:00Z')
			});

			expect(result.isOk).toBe(true);
			const date1 = result.value.createdAt;
			const date2 = result.value.createdAt;

			// Should be equal in value
			expect(date1.getTime()).toBe(date2.getTime());
			// But not the same reference (defensive copy)
			expect(date1).not.toBe(date2);
		});

		it('should return defensive copy of revokedAt', () => {
			const result = TokenFamily.create({
				familyId: 'family-uuid-123',
				userId: VALID_UUID,
				createdAt: new Date(),
				revokedAt: new Date('2026-01-15T00:00:00Z'),
				revokedReason: 'test'
			});

			expect(result.isOk).toBe(true);
			const date1 = result.value.revokedAt;
			const date2 = result.value.revokedAt;

			expect(date1).toBeDefined();
			expect(date2).toBeDefined();
			expect(date1!.getTime()).toBe(date2!.getTime());
			expect(date1).not.toBe(date2);
		});
	});
});
