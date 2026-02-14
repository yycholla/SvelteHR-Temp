import { describe, expect, it } from 'vitest';
import { LateReason } from './LateReason';
import { ValidationError } from '$domain/errors';

describe('LateReason', () => {
	describe('create', () => {
		it('returns Ok with valid reason', () => {
			const reason = 'Traffic delay';
			const result = LateReason.create(reason);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(reason);
		});

		it('returns Ok with empty string', () => {
			const result = LateReason.create('');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('');
		});

		it('returns Ok with null', () => {
			const result = LateReason.create(null);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBeNull();
		});

		it('returns ValidationError when reason exceeds 500 characters', () => {
			const longReason = 'a'.repeat(501);
			const result = LateReason.create(longReason);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ValidationError);
			expect(result.error.message).toContain('500');
		});

		it('returns Ok with exactly 500 characters', () => {
			const reason = 'a'.repeat(500);
			const result = LateReason.create(reason);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(reason);
		});

		it('trims whitespace', () => {
			const result = LateReason.create('  Traffic  ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Traffic');
		});

		it('converts whitespace-only string to empty', () => {
			const result = LateReason.create('   ');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('');
		});
	});

	describe('equals', () => {
		it('returns true for same reason', () => {
			const reason1 = LateReason.create('Traffic').value;
			const reason2 = LateReason.create('Traffic').value;

			expect(reason1.equals(reason2)).toBe(true);
		});

		it('returns false for different reasons', () => {
			const reason1 = LateReason.create('Traffic').value;
			const reason2 = LateReason.create('Sick').value;

			expect(reason1.equals(reason2)).toBe(false);
		});

		it('returns true for both empty', () => {
			const reason1 = LateReason.create('').value;
			const reason2 = LateReason.create('').value;

			expect(reason1.equals(reason2)).toBe(true);
		});

		it('returns true for both null', () => {
			const reason1 = LateReason.create(null).value;
			const reason2 = LateReason.create(null).value;

			expect(reason1.equals(reason2)).toBe(true);
		});

		it('returns false for null vs empty', () => {
			const reason1 = LateReason.create(null).value;
			const reason2 = LateReason.create('').value;

			expect(reason1.equals(reason2)).toBe(false);
		});
	});

	describe('isEmpty', () => {
		it('returns true for empty string', () => {
			const reason = LateReason.create('').value;
			expect(reason.isEmpty).toBe(true);
		});

		it('returns true for null', () => {
			const reason = LateReason.create(null).value;
			expect(reason.isEmpty).toBe(true);
		});

		it('returns false for non-empty reason', () => {
			const reason = LateReason.create('Traffic').value;
			expect(reason.isEmpty).toBe(false);
		});
	});
});
