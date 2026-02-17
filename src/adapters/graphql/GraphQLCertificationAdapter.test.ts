// src/adapters/graphql/GraphQLCertificationAdapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLCertificationAdapter } from './GraphQLCertificationAdapter';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import {
	Certification,
	CertificationName,
	IssuingOrganization,
	CredentialId,
	CertificationNotFoundError
} from '$domain/Certification';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_EMPLOYEE_UUID = '223e4567-e89b-12d3-a456-426614174000';

const validGraphQLCert = {
	id: VALID_UUID,
	employeeId: VALID_EMPLOYEE_UUID,
	name: 'AWS Certified Developer',
	issuingOrganization: 'Amazon Web Services',
	issueDate: '2023-01-01T00:00:00.000Z',
	expirationDate: '2026-01-01T00:00:00.000Z',
	credentialId: 'AWS-CD-12345',
	createdAt: '2023-01-01T00:00:00.000Z',
	updatedAt: '2023-06-01T00:00:00.000Z'
};

function createMockGraphQLPort(): GraphQLPort {
	return {
		query: vi.fn(),
		mutation: vi.fn()
	};
}

function createMockCert(): Certification {
	return Certification.create({
		id: VALID_UUID,
		employeeId: VALID_EMPLOYEE_UUID,
		name: CertificationName.create('AWS Certified Developer').value,
		issuingOrganization: IssuingOrganization.create('Amazon Web Services').value,
		issueDate: new Date('2023-01-01'),
		expirationDate: new Date('2026-01-01'),
		credentialId: CredentialId.create('AWS-CD-12345').value,
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2023-06-01')
	}).value;
}

describe('GraphQLCertificationAdapter', () => {
	let graphql: GraphQLPort;
	let adapter: GraphQLCertificationAdapter;

	beforeEach(() => {
		graphql = createMockGraphQLPort();
		adapter = new GraphQLCertificationAdapter(graphql);
	});

	describe('findById', () => {
		it('should return certification when found', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ certification: validGraphQLCert });

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value?.id).toBe(VALID_UUID);
			expect(result.value?.name.value).toBe('AWS Certified Developer');
		});

		it('should return null when certification not found', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ certification: null });

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when query throws', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('Network error'));

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid certification data', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				certification: { ...validGraphQLCert, name: '' }
			});

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('findByEmployeeId', () => {
		it('should return certifications for employee', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				certificationsByEmployee: [validGraphQLCert]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].name.value).toBe('AWS Certified Developer');
		});

		it('should return empty array when no certifications', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ certificationsByEmployee: [] });

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid certifications (resilient)', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				certificationsByEmployee: [
					validGraphQLCert,
					{ ...validGraphQLCert, issuingOrganization: '' }
				]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error when query throws', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('Network error'));

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isError).toBe(true);
		});

		it('should handle null/undefined response gracefully', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ certificationsByEmployee: null });

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('findExpiring', () => {
		it('should return expiring certifications', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				expiringCertifications: [validGraphQLCert]
			});

			const beforeDate = new Date('2026-06-01');
			const result = await adapter.findExpiring(beforeDate);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(graphql.query).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ beforeDate: beforeDate.toISOString() })
			);
		});

		it('should return empty array when no expiring certifications', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ expiringCertifications: [] });

			const result = await adapter.findExpiring(new Date('2024-01-01'));

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return error when query throws', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('Network error'));

			const result = await adapter.findExpiring(new Date());

			expect(result.isError).toBe(true);
		});

		it('should filter invalid certifications from results', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				expiringCertifications: [validGraphQLCert, { ...validGraphQLCert, name: '' }]
			});

			const result = await adapter.findExpiring(new Date('2026-06-01'));

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});
	});

	describe('create', () => {
		it('should create and return certification', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ createCertification: validGraphQLCert });

			const cert = createMockCert();
			const result = await adapter.create(cert);

			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('AWS Certified Developer');
			expect(graphql.mutation).toHaveBeenCalled();
		});

		it('should return error when mutation returns null', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ createCertification: null });

			const cert = createMockCert();
			const result = await adapter.create(cert);

			expect(result.isError).toBe(true);
		});

		it('should return error when mutation throws', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Network error'));

			const cert = createMockCert();
			const result = await adapter.create(cert);

			expect(result.isError).toBe(true);
		});

		it('should handle null expirationDate and credentialId in create', async () => {
			const certWithNulls = Certification.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: CertificationName.create('Lifelong Cert').value,
				issuingOrganization: IssuingOrganization.create('Test Org').value,
				issueDate: new Date('2023-01-01'),
				expirationDate: null,
				credentialId: CredentialId.create(null).value,
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2023-06-01')
			}).value;

			const noExpirationResponse = {
				...validGraphQLCert,
				expirationDate: null,
				credentialId: null
			};
			vi.mocked(graphql.mutation).mockResolvedValue({
				createCertification: noExpirationResponse
			});

			const result = await adapter.create(certWithNulls);

			expect(result.isOk).toBe(true);
			expect(result.value.expirationDate).toBeNull();
		});
	});

	describe('update', () => {
		it('should update and return certification', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ updateCertification: validGraphQLCert });

			const cert = createMockCert();
			const result = await adapter.update(cert);

			expect(result.isOk).toBe(true);
			expect(graphql.mutation).toHaveBeenCalled();
		});

		it('should return error when mutation returns null', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ updateCertification: null });

			const cert = createMockCert();
			const result = await adapter.update(cert);

			expect(result.isError).toBe(true);
		});

		it('should return error when mutation throws', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Network error'));

			const cert = createMockCert();
			const result = await adapter.update(cert);

			expect(result.isError).toBe(true);
		});
	});

	describe('delete', () => {
		it('should delete certification successfully', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ deleteCertification: true });

			const result = await adapter.delete(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(graphql.mutation).toHaveBeenCalled();
		});

		it('should return CertificationNotFoundError when mutation returns false', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ deleteCertification: false });

			const result = await adapter.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CertificationNotFoundError);
		});

		it('should return CertificationNotFoundError when mutation throws', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Network error'));

			const result = await adapter.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CertificationNotFoundError);
		});
	});

	describe('mapToEntity (via findByEmployeeId)', () => {
		it('should map all fields correctly', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				certificationsByEmployee: [validGraphQLCert]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			const cert = result.value[0];
			expect(cert.id).toBe(VALID_UUID);
			expect(cert.employeeId).toBe(VALID_EMPLOYEE_UUID);
			expect(cert.name.value).toBe('AWS Certified Developer');
			expect(cert.issuingOrganization.value).toBe('Amazon Web Services');
			expect(cert.credentialId?.value).toBe('AWS-CD-12345');
		});

		it('should map null expirationDate correctly', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				certificationsByEmployee: [{ ...validGraphQLCert, expirationDate: null }]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value[0].expirationDate).toBeNull();
		});

		it('should return null for invalid issueDate', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				certificationsByEmployee: [{ ...validGraphQLCert, issueDate: 'not-a-date' }]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return null for invalid createdAt', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				certificationsByEmployee: [{ ...validGraphQLCert, createdAt: 'invalid' }]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return null when expirationDate is before issueDate', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				certificationsByEmployee: [
					{
						...validGraphQLCert,
						issueDate: '2023-06-01T00:00:00.000Z',
						expirationDate: '2023-01-01T00:00:00.000Z'
					}
				]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});
});
