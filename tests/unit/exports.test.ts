import { describe, it, expect } from 'vitest';

describe('Module Exports', () => {
	describe('Domain Layer', () => {
		it('exports Result type', async () => {
			const { Result } = await import('$domain');
			expect(Result).toBeDefined();
			expect(Result.ok).toBeDefined();
			expect(Result.error).toBeDefined();
		});

		it('exports domain errors', async () => {
			const {
				DomainError,
				ValidationError,
				EmployeeNotFoundError,
				EmployeeAlreadyExistsError,
				EmployeeDeactivationError,
				InvalidEmailError,
				InvalidHireDateError,
				DepartmentNotFoundError,
				ServiceUnavailableError
			} = await import('$domain');
			expect(DomainError).toBeDefined();
			expect(ValidationError).toBeDefined();
			expect(EmployeeNotFoundError).toBeDefined();
			expect(EmployeeAlreadyExistsError).toBeDefined();
			expect(EmployeeDeactivationError).toBeDefined();
			expect(InvalidEmailError).toBeDefined();
			expect(InvalidHireDateError).toBeDefined();
			expect(DepartmentNotFoundError).toBeDefined();
			expect(ServiceUnavailableError).toBeDefined();
		});

		it('exports Employee domain', async () => {
			const { Employee, Email, PersonName, HireDate, EmployeeStatus } = await import('$domain');
			expect(Employee).toBeDefined();
			expect(Email).toBeDefined();
			expect(PersonName).toBeDefined();
			expect(HireDate).toBeDefined();
			expect(EmployeeStatus).toBeDefined();
		});

		it('exports Employee types', async () => {
			const module = await import('$domain');
			// Type exports can't be tested directly, but we can check the module
			expect(module).toBeDefined();
		});
	});

	describe('Services Layer', () => {
		it('exports EmployeeService', async () => {
			const { EmployeeService } = await import('$services');
			expect(EmployeeService).toBeDefined();
		});

		it('exports repository port types', async () => {
			const module = await import('$services');
			// Type exports can't be tested directly, but we can check the module
			expect(module).toBeDefined();
		});
	});

	describe('Adapters Layer', () => {
		it('exports repository implementations', async () => {
			const { MockEmployeeRepository, GraphQLEmployeeAdapter } = await import('$adapters');
			expect(MockEmployeeRepository).toBeDefined();
			expect(GraphQLEmployeeAdapter).toBeDefined();
		});
	});

	describe('Employee Domain Barrel Export', () => {
		it('exports all Employee domain entities and value objects', async () => {
			const { Employee, Email, PersonName, HireDate, EmployeeStatus } =
				await import('$domain/Employee');
			expect(Employee).toBeDefined();
			expect(Email).toBeDefined();
			expect(PersonName).toBeDefined();
			expect(HireDate).toBeDefined();
			expect(EmployeeStatus).toBeDefined();
		});

		it('exports Employee types', async () => {
			const module = await import('$domain/Employee');
			// Type exports can't be tested directly, but we can check the module
			expect(module).toBeDefined();
		});
	});
});
