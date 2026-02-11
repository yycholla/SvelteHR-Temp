import { describe, it, expect } from 'vitest';
import { RefreshToken } from './RefreshToken';
import { InvalidTokenError } from '../errors/TokenErrors';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_JWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
const VALID_PLAINTEXT = 'abc123xyz789';
const VALID_FAMILY_ID = 'family-uuid-123';

function futureDate(days: number = 7): Date {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function pastDate(seconds: number = 1): Date {
	return new Date(Date.now() - seconds * 1000);
}

describe('RefreshToken', () => {
	describe('create', () => {
		it('should create a valid refresh token', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.userId).toBe(VALID_UUID);
			expect(result.value.familyId).toBe(VALID_FAMILY_ID);
			expect(result.value.jwt).toBe(VALID_JWT);
			expect(result.value.plaintext).toBe(VALID_PLAINTEXT);
			expect(result.value.isExpired()).toBe(false);
		});

		it('should fail when JWT does not contain dots', () => {
			const result = RefreshToken.create({
				jwt: 'notajwt',
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('JWT');
		});

		it('should fail when JWT is empty', () => {
			const result = RefreshToken.create({
				jwt: '',
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
		});

		it('should fail when plaintext is too short (less than 8 chars)', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: 'short',
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('8 characters');
		});

		it('should fail when plaintext is empty', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: '',
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
		});

		it('should fail when userId is not a valid UUID', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: 'not-a-uuid',
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('UUID');
		});

		it('should fail when familyId is empty', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: '',
				expiresAt: futureDate()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('Family ID');
		});

		it('should fail when familyId is only whitespace', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: '   ',
				expiresAt: futureDate()
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
		});

		it('should fail when expiresAt is an invalid date', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: new Date('invalid')
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('date');
		});
	});

	describe('isExpired', () => {
		it('should return false for a future expiration date', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isExpired()).toBe(false);
		});

		it('should return true for a past expiration date', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: pastDate()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.isExpired()).toBe(true);
		});
	});

	describe('toCombinedFormat', () => {
		it('should produce jwt:plaintext format', () => {
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(result.isOk).toBe(true);
			expect(result.value.toCombinedFormat()).toBe(`${VALID_JWT}:${VALID_PLAINTEXT}`);
		});
	});

	describe('fromCombinedFormat', () => {
		it('should parse a valid combined format string', () => {
			const combined = `${VALID_JWT}:${VALID_PLAINTEXT}`;
			const result = RefreshToken.fromCombinedFormat(
				combined,
				VALID_UUID,
				VALID_FAMILY_ID,
				futureDate()
			);

			expect(result.isOk).toBe(true);
			expect(result.value.jwt).toBe(VALID_JWT);
			expect(result.value.plaintext).toBe(VALID_PLAINTEXT);
		});

		it('should fail when there is no colon separator', () => {
			const result = RefreshToken.fromCombinedFormat(
				'no-colon-separator',
				VALID_UUID,
				VALID_FAMILY_ID,
				futureDate()
			);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTokenError);
			expect(result.error.message).toContain('format');
		});

		it('should handle JWTs that contain colons by splitting on first colon after JWT', () => {
			// JWT has dots (header.payload.signature), plaintext follows after the last colon
			// A real combined format: "header.payload.signature:plaintext"
			const jwt = 'header.payload.signature';
			const plaintext = 'my-plaintext-token';
			const combined = `${jwt}:${plaintext}`;
			const result = RefreshToken.fromCombinedFormat(
				combined,
				VALID_UUID,
				VALID_FAMILY_ID,
				futureDate()
			);

			expect(result.isOk).toBe(true);
			expect(result.value.jwt).toBe(jwt);
			expect(result.value.plaintext).toBe(plaintext);
		});

		it('should round-trip through toCombinedFormat and fromCombinedFormat', () => {
			const original = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(original.isOk).toBe(true);

			const combined = original.value.toCombinedFormat();
			const parsed = RefreshToken.fromCombinedFormat(
				combined,
				VALID_UUID,
				VALID_FAMILY_ID,
				futureDate()
			);

			expect(parsed.isOk).toBe(true);
			expect(parsed.value.jwt).toBe(VALID_JWT);
			expect(parsed.value.plaintext).toBe(VALID_PLAINTEXT);
		});
	});

	describe('equals', () => {
		it('should return true for tokens with same jwt, plaintext, and userId', () => {
			const props = {
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			};

			const a = RefreshToken.create(props);
			const b = RefreshToken.create(props);

			expect(a.isOk).toBe(true);
			expect(b.isOk).toBe(true);
			expect(a.value.equals(b.value)).toBe(true);
		});

		it('should return false for tokens with different jwt', () => {
			const a = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			const b = RefreshToken.create({
				jwt: 'other.jwt.token',
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt: futureDate()
			});

			expect(a.isOk).toBe(true);
			expect(b.isOk).toBe(true);
			expect(a.value.equals(b.value)).toBe(false);
		});
	});

	describe('expiresAt getter', () => {
		it('should return a defensive copy of the date', () => {
			const expiresAt = futureDate();
			const result = RefreshToken.create({
				jwt: VALID_JWT,
				plaintext: VALID_PLAINTEXT,
				userId: VALID_UUID,
				familyId: VALID_FAMILY_ID,
				expiresAt
			});

			expect(result.isOk).toBe(true);

			const copy1 = result.value.expiresAt;
			const copy2 = result.value.expiresAt;

			// Should be equal in value
			expect(copy1.getTime()).toBe(copy2.getTime());
			// But not the same object reference
			expect(copy1).not.toBe(copy2);
		});
	});
});
