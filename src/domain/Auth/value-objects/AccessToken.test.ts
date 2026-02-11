import { describe, it, expect } from 'vitest';
import { AccessToken } from './AccessToken';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

function futureDate(minutes: number): Date {
	return new Date(Date.now() + minutes * 60 * 1000);
}

function pastDate(minutes: number): Date {
	return new Date(Date.now() - minutes * 60 * 1000);
}

describe('AccessToken', () => {
	describe('create', () => {
		it('creates a valid access token', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});

			expect(result.isOk).toBe(true);
			expect(result.value.userId).toBe(VALID_UUID);
			expect(result.value.token).toBe(VALID_TOKEN);
			expect(result.value.isExpired()).toBe(false);
		});

		it('creates token with permissions and roles', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				permissions: ['employees:read', 'employees:edit'],
				roles: ['admin', 'hr_manager']
			});

			expect(result.isOk).toBe(true);
			expect(result.value.permissions).toEqual(['employees:read', 'employees:edit']);
			expect(result.value.roles).toEqual(['admin', 'hr_manager']);
		});

		it('defaults permissions and roles to empty arrays', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});

			expect(result.isOk).toBe(true);
			expect(result.value.permissions).toEqual([]);
			expect(result.value.roles).toEqual([]);
		});

		it('fails for empty token', () => {
			const result = AccessToken.create({
				token: '',
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidTokenError');
			expect(result.error.message).toContain('cannot be empty');
		});

		it('fails for whitespace-only token', () => {
			const result = AccessToken.create({
				token: '   ',
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidTokenError');
		});

		it('fails for invalid UUID userId', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: 'not-a-uuid',
				expiresAt: futureDate(15)
			});

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidTokenError');
			expect(result.error.message).toContain('valid UUID');
		});

		it('fails for empty userId', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: '',
				expiresAt: futureDate(15)
			});

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidTokenError');
		});

		it('fails for invalid date', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: new Date('invalid')
			});

			expect(result.isError).toBe(true);
			expect(result.error.name).toBe('InvalidTokenError');
			expect(result.error.message).toContain('Expiration date');
		});

		it('allows already-expired tokens to be created', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: pastDate(5)
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isExpired()).toBe(true);
		});

		it('accepts case-insensitive UUIDs', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: '123E4567-E89B-12D3-A456-426614174000',
				expiresAt: futureDate(15)
			});

			expect(result.isOk).toBe(true);
		});
	});

	describe('isExpired', () => {
		it('returns false for future expiration', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isExpired()).toBe(false);
		});

		it('returns true for past expiration', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: pastDate(1)
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isExpired()).toBe(true);
		});
	});

	describe('isNearExpiry', () => {
		it('returns true when token expires within threshold', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: new Date(Date.now() + 30 * 1000) // 30 seconds
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isNearExpiry(60)).toBe(true);
		});

		it('returns false when token has plenty of time left', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(10)
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isNearExpiry(60)).toBe(false);
		});

		it('returns false for already expired tokens', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: pastDate(1)
			});

			expect(result.isOk).toBe(true);
			// Already expired is not "near" expiry - it's past expiry
			expect(result.value.isNearExpiry(60)).toBe(false);
		});

		it('uses default threshold of 60 seconds', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: new Date(Date.now() + 30 * 1000) // 30 seconds
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isNearExpiry()).toBe(true);
		});
	});

	describe('hasPermission', () => {
		it('returns true for granted permission', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				permissions: ['employees:read', 'employees:edit']
			});

			expect(result.isOk).toBe(true);
			expect(result.value.hasPermission('employees:read')).toBe(true);
		});

		it('returns false for missing permission', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				permissions: ['employees:read']
			});

			expect(result.isOk).toBe(true);
			expect(result.value.hasPermission('employees:delete')).toBe(false);
		});

		it('returns false when no permissions set', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});

			expect(result.isOk).toBe(true);
			expect(result.value.hasPermission('employees:read')).toBe(false);
		});
	});

	describe('hasRole', () => {
		it('returns true for granted role', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				roles: ['admin', 'hr_manager']
			});

			expect(result.isOk).toBe(true);
			expect(result.value.hasRole('admin')).toBe(true);
		});

		it('returns false for missing role', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15),
				roles: ['employee']
			});

			expect(result.isOk).toBe(true);
			expect(result.value.hasRole('admin')).toBe(false);
		});

		it('returns false when no roles set', () => {
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});

			expect(result.isOk).toBe(true);
			expect(result.value.hasRole('admin')).toBe(false);
		});
	});

	describe('equals', () => {
		it('returns true for same token and userId', () => {
			const a = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});
			const b = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(30)
			});

			expect(a.isOk).toBe(true);
			expect(b.isOk).toBe(true);
			expect(a.value.equals(b.value)).toBe(true);
		});

		it('returns false for different tokens', () => {
			const a = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});
			const b = AccessToken.create({
				token: 'eyJhbGciOiJSUzI1NiJ9.different.token',
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});

			expect(a.isOk).toBe(true);
			expect(b.isOk).toBe(true);
			expect(a.value.equals(b.value)).toBe(false);
		});

		it('returns false for different userIds', () => {
			const a = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt: futureDate(15)
			});
			const b = AccessToken.create({
				token: VALID_TOKEN,
				userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
				expiresAt: futureDate(15)
			});

			expect(a.isOk).toBe(true);
			expect(b.isOk).toBe(true);
			expect(a.value.equals(b.value)).toBe(false);
		});
	});

	describe('expiresAt getter', () => {
		it('returns a copy of the expiration date', () => {
			const expiresAt = futureDate(15);
			const result = AccessToken.create({
				token: VALID_TOKEN,
				userId: VALID_UUID,
				expiresAt
			});

			expect(result.isOk).toBe(true);
			const retrieved = result.value.expiresAt;
			// Should be equal in value
			expect(retrieved.getTime()).toBe(expiresAt.getTime());
			// But not the same reference (defensive copy)
			expect(retrieved).not.toBe(expiresAt);
		});
	});
});
