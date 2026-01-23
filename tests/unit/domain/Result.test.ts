// tests/unit/domain/Result.test.ts
import { describe, it, expect } from 'vitest';
import { Result } from '$domain/Result';
import { DomainError } from '$domain/errors';

describe('Result', () => {
	describe('ok', () => {
		it('creates successful result', () => {
			const result = Result.ok(42);

			expect(result.isOk).toBe(true);
			expect(result.isError).toBe(false);
			expect(result.value).toBe(42);
		});

		it('stores undefined as valid success value', () => {
			const result = Result.ok<undefined, DomainError>(undefined);
			expect(result.isOk).toBe(true);
			expect(result.isError).toBe(false);
			expect(result.value).toBe(undefined);
		});
	});

	describe('error', () => {
		it('creates error result', () => {
			const error = new DomainError('Test error', 'TEST_ERROR');
			const result = Result.error(error);

			expect(result.isOk).toBe(false);
			expect(result.isError).toBe(true);
			expect(result.error).toBe(error);
		});

		it('throws when accessing value on error result', () => {
			const error = new DomainError('Test error', 'TEST_ERROR');
			const result = Result.error(error);

			expect(() => result.value).toThrow('Cannot get value from error result');
		});
	});

	describe('map', () => {
		it('transforms ok value', () => {
			const result = Result.ok(5);
			const mapped = result.map((x) => x * 2);

			expect(mapped.value).toBe(10);
		});

		it('preserves error', () => {
			const error = new DomainError('Test', 'TEST');
			const result = Result.error<number, DomainError>(error);
			const mapped = result.map((x) => x * 2);

			expect(mapped.error).toBe(error);
		});
	});

	describe('flatMap', () => {
		it('chains ok results', () => {
			const result = Result.ok(5);
			const chained = result.flatMap((x) => Result.ok(x * 2));

			expect(chained.value).toBe(10);
		});

		it('short-circuits on error', () => {
			const error = new DomainError('Test', 'TEST');
			const result = Result.error<number, DomainError>(error);
			const chained = result.flatMap((x) => Result.ok(x * 2));

			expect(chained.error).toBe(error);
		});
	});
});
