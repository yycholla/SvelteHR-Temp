// src/services/CertificationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CertificationService } from './CertificationService';
import { Result } from '$domain/Result';
import {
	Certification,
	CertificationName,
	IssuingOrganization,
	CredentialId,
	CertificationNotFoundError
} from '$domain/Certification';
import type { CertificationRepository } from './ports/CertificationRepository';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_EMPLOYEE_UUID = '223e4567-e89b-12d3-a456-426614174000';

function createMockCertification(): Certification {
	const name = CertificationName.create('AWS Certified Developer').value;
	const org = IssuingOrganization.create('Amazon Web Services').value;
	const cred = CredentialId.create('AWS-CD-12345').value;

	return Certification.create({
		id: VALID_UUID,
		employeeId: VALID_EMPLOYEE_UUID,
		name,
		issuingOrganization: org,
		issueDate: new Date('2023-01-01'),
		expirationDate: new Date('2026-01-01'),
		credentialId: cred,
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2023-06-01')
	}).value;
}

function createMockRepository(): CertificationRepository {
	return {
		findById: vi.fn(),
		findByEmployeeId: vi.fn(),
		findExpiring: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	};
}

describe('CertificationService', () => {
	let repository: CertificationRepository;
	let service: CertificationService;
	let mockCert: Certification;

	beforeEach(() => {
		repository = createMockRepository();
		service = new CertificationService(repository);
		mockCert = createMockCertification();
	});

	describe('getById', () => {
		it('should return certification when found', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockCert));

			const result = await service.getById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
			expect(repository.findById).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return CertificationNotFoundError when not found', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(null));

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CertificationNotFoundError);
		});

		it('should propagate repository errors', async () => {
			vi.mocked(repository.findById).mockResolvedValue(
				Result.error(new CertificationNotFoundError(VALID_UUID))
			);

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CertificationNotFoundError);
		});

		it('should handle thrown exceptions', async () => {
			vi.mocked(repository.findById).mockRejectedValue(new Error('DB error'));

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
		});
	});

	describe('getByEmployeeId', () => {
		it('should return all certifications for an employee', async () => {
			vi.mocked(repository.findByEmployeeId).mockResolvedValue(Result.ok([mockCert]));

			const result = await service.getByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].id).toBe(VALID_UUID);
		});

		it('should return empty array when no certifications', async () => {
			vi.mocked(repository.findByEmployeeId).mockResolvedValue(Result.ok([]));

			const result = await service.getByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle thrown exceptions', async () => {
			vi.mocked(repository.findByEmployeeId).mockRejectedValue(new Error('DB error'));

			const result = await service.getByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isError).toBe(true);
		});
	});

	describe('getExpiring', () => {
		it('should return certifications expiring before the given date', async () => {
			vi.mocked(repository.findExpiring).mockResolvedValue(Result.ok([mockCert]));

			const beforeDate = new Date('2026-06-01');
			const result = await service.getExpiring(beforeDate);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(repository.findExpiring).toHaveBeenCalledWith(beforeDate);
		});

		it('should return empty array when no expiring certifications', async () => {
			vi.mocked(repository.findExpiring).mockResolvedValue(Result.ok([]));

			const result = await service.getExpiring(new Date('2024-01-01'));

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle thrown exceptions', async () => {
			vi.mocked(repository.findExpiring).mockRejectedValue(new Error('DB error'));

			const result = await service.getExpiring(new Date());

			expect(result.isError).toBe(true);
		});
	});

	describe('create', () => {
		it('should create a valid certification', async () => {
			vi.mocked(repository.create).mockResolvedValue(Result.ok(mockCert));

			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: 'AWS Certified Developer',
				issuingOrganization: 'Amazon Web Services',
				issueDate: new Date('2023-01-01'),
				expirationDate: new Date('2026-01-01'),
				credentialId: 'AWS-CD-12345'
			});

			expect(result.isOk).toBe(true);
			expect(repository.create).toHaveBeenCalled();
		});

		it('should create certification without expiration date', async () => {
			vi.mocked(repository.create).mockResolvedValue(Result.ok(mockCert));

			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: 'AWS Certified Developer',
				issuingOrganization: 'Amazon Web Services',
				issueDate: new Date('2023-01-01'),
				expirationDate: null,
				credentialId: null
			});

			expect(result.isOk).toBe(true);
		});

		it('should return error for empty certification name', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: '',
				issuingOrganization: 'Amazon Web Services',
				issueDate: new Date('2023-01-01'),
				expirationDate: new Date('2026-01-01'),
				credentialId: null
			});

			expect(result.isError).toBe(true);
			expect(repository.create).not.toHaveBeenCalled();
		});

		it('should return error for empty issuing organization', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: 'AWS Certified Developer',
				issuingOrganization: '',
				issueDate: new Date('2023-01-01'),
				expirationDate: new Date('2026-01-01'),
				credentialId: null
			});

			expect(result.isError).toBe(true);
			expect(repository.create).not.toHaveBeenCalled();
		});

		it('should return error when expiration is before issue date', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: 'AWS Certified Developer',
				issuingOrganization: 'Amazon Web Services',
				issueDate: new Date('2023-06-01'),
				expirationDate: new Date('2023-01-01'),
				credentialId: null
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('update', () => {
		it('should update certification details', async () => {
			const updatedName = CertificationName.create('AWS Solutions Architect').value;
			const updatedOrg = IssuingOrganization.create('Amazon Web Services').value;
			const name2 = CertificationName.create('Updated Cert').value;
			const org2 = IssuingOrganization.create('Test Org').value;
			const cred2 = CredentialId.create(null).value;
			const updatedCert = Certification.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: updatedName,
				issuingOrganization: updatedOrg,
				issueDate: new Date('2023-01-01'),
				expirationDate: new Date('2027-01-01'),
				credentialId: null,
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date()
			}).value;

			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockCert));
			vi.mocked(repository.update).mockResolvedValue(Result.ok(updatedCert));

			const result = await service.update(VALID_UUID, {
				name: 'AWS Solutions Architect',
				issuingOrganization: 'Amazon Web Services',
				issueDate: new Date('2023-01-01'),
				expirationDate: new Date('2027-01-01'),
				credentialId: null
			});

			expect(result.isOk).toBe(true);
		});

		it('should return CertificationNotFoundError when not found', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(null));

			const result = await service.update(VALID_UUID, {
				name: 'AWS Certified Developer',
				issuingOrganization: 'AWS',
				issueDate: new Date('2023-01-01'),
				expirationDate: new Date('2026-01-01'),
				credentialId: null
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CertificationNotFoundError);
		});

		it('should return error for invalid name on update', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockCert));

			const result = await service.update(VALID_UUID, {
				name: '',
				issuingOrganization: 'AWS',
				issueDate: new Date('2023-01-01'),
				expirationDate: new Date('2026-01-01'),
				credentialId: null
			});

			expect(result.isError).toBe(true);
			expect(repository.update).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('should delete a certification', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockCert));
			vi.mocked(repository.delete).mockResolvedValue(Result.ok(undefined));

			const result = await service.delete(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(repository.delete).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return CertificationNotFoundError when not found', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(null));

			const result = await service.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CertificationNotFoundError);
			expect(repository.delete).not.toHaveBeenCalled();
		});

		it('should handle repository errors', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockCert));
			vi.mocked(repository.delete).mockResolvedValue(
				Result.error(new CertificationNotFoundError(VALID_UUID))
			);

			const result = await service.delete(VALID_UUID);

			expect(result.isError).toBe(true);
		});
	});
});
