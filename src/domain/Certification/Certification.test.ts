// src/domain/Certification/Certification.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Certification } from './Certification';
import { CertificationName } from './value-objects/CertificationName';
import { IssuingOrganization } from './value-objects/IssuingOrganization';
import { CredentialId } from './value-objects/CredentialId';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_EMPLOYEE_UUID = '223e4567-e89b-12d3-a456-426614174000';

function createValidCertData() {
	const name = CertificationName.create('AWS Certified Developer').value;
	const org = IssuingOrganization.create('Amazon Web Services').value;
	const cred = CredentialId.create('AWS-CD-12345').value;

	return {
		id: VALID_UUID,
		employeeId: VALID_EMPLOYEE_UUID,
		name,
		issuingOrganization: org,
		issueDate: new Date('2023-01-01'),
		expirationDate: new Date('2026-01-01'),
		credentialId: cred,
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2023-06-01')
	};
}

describe('Certification', () => {
	describe('create', () => {
		it('should create a valid certification', () => {
			const data = createValidCertData();
			const result = Certification.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
			expect(result.value.employeeId).toBe(VALID_EMPLOYEE_UUID);
			expect(result.value.name.value).toBe('AWS Certified Developer');
			expect(result.value.issuingOrganization.value).toBe('Amazon Web Services');
			expect(result.value.credentialId?.value).toBe('AWS-CD-12345');
		});

		it('should create certification without expiration date', () => {
			const data = { ...createValidCertData(), expirationDate: null };
			const result = Certification.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.expirationDate).toBeNull();
		});

		it('should create certification without credential ID', () => {
			const data = { ...createValidCertData(), credentialId: null };
			const result = Certification.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.credentialId).toBeNull();
		});

		it('should reject invalid certification ID', () => {
			const data = { ...createValidCertData(), id: 'not-a-uuid' };
			const result = Certification.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid certification ID');
		});

		it('should reject invalid employee ID', () => {
			const data = { ...createValidCertData(), employeeId: 'invalid' };
			const result = Certification.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid employee ID');
		});

		it('should reject invalid issueDate', () => {
			const data = { ...createValidCertData(), issueDate: new Date('invalid') };
			const result = Certification.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('issueDate');
		});

		it('should reject invalid expirationDate', () => {
			const data = { ...createValidCertData(), expirationDate: new Date('invalid') };
			const result = Certification.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('expirationDate');
		});

		it('should reject expirationDate before issueDate', () => {
			const data = {
				...createValidCertData(),
				issueDate: new Date('2023-06-01'),
				expirationDate: new Date('2023-01-01')
			};
			const result = Certification.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('expirationDate must be after issueDate');
		});

		it('should reject expirationDate equal to issueDate', () => {
			const sameDate = new Date('2023-01-01');
			const data = {
				...createValidCertData(),
				issueDate: sameDate,
				expirationDate: new Date(sameDate)
			};
			const result = Certification.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('expirationDate must be after issueDate');
		});

		it('should reject invalid createdAt date', () => {
			const data = { ...createValidCertData(), createdAt: new Date('invalid') };
			const result = Certification.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('createdAt');
		});

		it('should reject invalid updatedAt date', () => {
			const data = { ...createValidCertData(), updatedAt: new Date('invalid') };
			const result = Certification.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('updatedAt');
		});

		it('should make defensive copies of dates', () => {
			const issueDate = new Date(2023, 0, 1); // local date to avoid UTC offset issues
			const expirationDate = new Date(2026, 0, 2); // must be after issueDate
			const data = { ...createValidCertData(), issueDate, expirationDate };
			const cert = Certification.create(data).value;

			issueDate.setFullYear(2099);
			expirationDate.setFullYear(2099);

			expect(cert.issueDate.getFullYear()).toBe(2023);
			expect(cert.expirationDate?.getFullYear()).toBe(2026);
		});

		it('should return defensive copies from getters', () => {
			const data = {
				...createValidCertData(),
				issueDate: new Date(2023, 0, 1),
				expirationDate: new Date(2026, 0, 2)
			};
			const cert = Certification.create(data).value;
			const issueDate = cert.issueDate;
			issueDate.setFullYear(2099);

			expect(cert.issueDate.getFullYear()).toBe(2023);
		});
	});

	describe('isExpired', () => {
		it('should return false for future expiration date', () => {
			const data = {
				...createValidCertData(),
				expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
			};
			const cert = Certification.create(data).value;

			expect(cert.isExpired()).toBe(false);
		});

		it('should return true for past expiration date', () => {
			const data = {
				...createValidCertData(),
				issueDate: new Date('2020-01-01'),
				expirationDate: new Date('2022-01-01')
			};
			const cert = Certification.create(data).value;

			expect(cert.isExpired()).toBe(true);
		});

		it('should return false when no expiration date', () => {
			const data = { ...createValidCertData(), expirationDate: null };
			const cert = Certification.create(data).value;

			expect(cert.isExpired()).toBe(false);
		});
	});

	describe('isValid', () => {
		it('should return true for non-expired certification', () => {
			const data = {
				...createValidCertData(),
				expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
			};
			const cert = Certification.create(data).value;

			expect(cert.isValid()).toBe(true);
		});

		it('should return false for expired certification', () => {
			const data = {
				...createValidCertData(),
				issueDate: new Date('2020-01-01'),
				expirationDate: new Date('2022-01-01')
			};
			const cert = Certification.create(data).value;

			expect(cert.isValid()).toBe(false);
		});

		it('should return true when no expiration date', () => {
			const data = { ...createValidCertData(), expirationDate: null };
			const cert = Certification.create(data).value;

			expect(cert.isValid()).toBe(true);
		});
	});

	describe('daysUntilExpiration', () => {
		it('should return null when no expiration date', () => {
			const data = { ...createValidCertData(), expirationDate: null };
			const cert = Certification.create(data).value;

			expect(cert.daysUntilExpiration()).toBeNull();
		});

		it('should return positive number for future expiration', () => {
			const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
			const data = { ...createValidCertData(), expirationDate: futureDate };
			const cert = Certification.create(data).value;

			const days = cert.daysUntilExpiration();
			expect(days).not.toBeNull();
			expect(days!).toBeGreaterThan(0);
			expect(days!).toBeLessThanOrEqual(31);
		});

		it('should return negative number for past expiration', () => {
			const data = {
				...createValidCertData(),
				issueDate: new Date('2020-01-01'),
				expirationDate: new Date('2022-01-01')
			};
			const cert = Certification.create(data).value;

			const days = cert.daysUntilExpiration();
			expect(days).not.toBeNull();
			expect(days!).toBeLessThan(0);
		});
	});
});

describe('CertificationName', () => {
	it('should create valid certification name', () => {
		const result = CertificationName.create('AWS Certified Developer');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('AWS Certified Developer');
	});

	it('should trim whitespace', () => {
		const result = CertificationName.create('  PMP  ');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('PMP');
	});

	it('should reject empty string', () => {
		const result = CertificationName.create('');
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('empty');
	});

	it('should reject whitespace-only string', () => {
		const result = CertificationName.create('   ');
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('empty');
	});

	it('should accept exactly 200 characters', () => {
		const name = 'a'.repeat(200);
		const result = CertificationName.create(name);
		expect(result.isOk).toBe(true);
	});

	it('should reject name longer than 200 characters', () => {
		const name = 'a'.repeat(201);
		const result = CertificationName.create(name);
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('200');
	});

	it('should support equals comparison', () => {
		const a = CertificationName.create('AWS Certified').value;
		const b = CertificationName.create('AWS Certified').value;
		const c = CertificationName.create('Azure Certified').value;

		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
	});

	it('should have correct toString', () => {
		const name = CertificationName.create('CISSP').value;
		expect(name.toString()).toBe('CISSP');
	});
});

describe('IssuingOrganization', () => {
	it('should create valid issuing organization', () => {
		const result = IssuingOrganization.create('Amazon Web Services');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('Amazon Web Services');
	});

	it('should trim whitespace', () => {
		const result = IssuingOrganization.create('  PMI  ');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('PMI');
	});

	it('should reject empty string', () => {
		const result = IssuingOrganization.create('');
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('empty');
	});

	it('should reject whitespace-only string', () => {
		const result = IssuingOrganization.create('   ');
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('empty');
	});

	it('should accept exactly 200 characters', () => {
		const org = 'a'.repeat(200);
		const result = IssuingOrganization.create(org);
		expect(result.isOk).toBe(true);
	});

	it('should reject organization longer than 200 characters', () => {
		const org = 'a'.repeat(201);
		const result = IssuingOrganization.create(org);
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('200');
	});

	it('should support equals comparison', () => {
		const a = IssuingOrganization.create('AWS').value;
		const b = IssuingOrganization.create('AWS').value;
		const c = IssuingOrganization.create('Microsoft').value;

		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
	});

	it('should have correct toString', () => {
		const org = IssuingOrganization.create('CompTIA').value;
		expect(org.toString()).toBe('CompTIA');
	});
});

describe('CredentialId', () => {
	it('should create credential ID with value', () => {
		const result = CredentialId.create('AWS-CD-12345');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('AWS-CD-12345');
		expect(result.value.hasValue()).toBe(true);
	});

	it('should create null credential ID', () => {
		const result = CredentialId.create(null);
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBeNull();
		expect(result.value.hasValue()).toBe(false);
	});

	it('should create undefined as null', () => {
		const result = CredentialId.create(undefined);
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBeNull();
	});

	it('should trim empty string to null', () => {
		const result = CredentialId.create('   ');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBeNull();
	});

	it('should trim whitespace from value', () => {
		const result = CredentialId.create('  CERT-123  ');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('CERT-123');
	});

	it('should accept exactly 100 characters', () => {
		const id = 'a'.repeat(100);
		const result = CredentialId.create(id);
		expect(result.isOk).toBe(true);
	});

	it('should reject credential ID longer than 100 characters', () => {
		const id = 'a'.repeat(101);
		const result = CredentialId.create(id);
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('100');
	});

	it('should support equals comparison', () => {
		const a = CredentialId.create('CERT-123').value;
		const b = CredentialId.create('CERT-123').value;
		const c = CredentialId.create('CERT-456').value;
		const d = CredentialId.create(null).value;

		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
		expect(a.equals(d)).toBe(false);
	});

	it('should have correct toString for value', () => {
		const id = CredentialId.create('CERT-123').value;
		expect(id.toString()).toBe('CERT-123');
	});

	it('should have empty string toString for null', () => {
		const id = CredentialId.create(null).value;
		expect(id.toString()).toBe('');
	});
});
