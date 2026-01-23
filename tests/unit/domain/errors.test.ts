import { describe, it, expect } from 'vitest';
import { DomainError, EmployeeNotFoundError, ValidationError } from '$domain/errors';

describe('DomainError', () => {
	it('should create error with message, code, and context', () => {
		const error = new DomainError('Test error', 'TEST_ERROR', { foo: 'bar' });

		expect(error.message).toBe('Test error');
		expect(error.code).toBe('TEST_ERROR');
		expect(error.context).toEqual({ foo: 'bar' });
		expect(error.name).toBe('DomainError');
	});

	it('should extend Error', () => {
		const error = new DomainError('Test', 'TEST');

		expect(error).toBeInstanceOf(Error);
	});
});

describe('EmployeeNotFoundError', () => {
	it('should create error with employee ID in context', () => {
		const error = new EmployeeNotFoundError('123');

		expect(error.message).toBe('Employee with ID 123 not found');
		expect(error.code).toBe('EMPLOYEE_NOT_FOUND');
		expect(error.context).toEqual({ employeeId: '123' });
	});
});

describe('ValidationError', () => {
	it('should create error with field and validation rule', () => {
		const error = new ValidationError('email', 'must be valid email', 'invalid@');

		expect(error.message).toBe('Validation failed for email: must be valid email');
		expect(error.code).toBe('VALIDATION_ERROR');
		expect(error.context).toEqual({
			field: 'email',
			rule: 'must be valid email',
			value: 'invalid@'
		});
	});
});
