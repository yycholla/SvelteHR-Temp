// src/services/EmergencyContactService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmergencyContactService } from './EmergencyContactService';
import { EmergencyContact, ContactName, ContactPhone, Relationship } from '$domain/EmergencyContact';
import {
	EmergencyContactNotFoundError,
	InvalidEmergencyContactError
} from '$domain/EmergencyContact';
import { Result } from '$domain/Result';
import type { EmergencyContactRepository } from './ports/EmergencyContactRepository';
import type { EmergencyContactError } from '$domain/EmergencyContact';

const VALID_UUID_1 = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '123e4567-e89b-12d3-a456-426614174001';
const VALID_UUID_3 = '123e4567-e89b-12d3-a456-426614174002';

function createMockContact(overrides: Partial<{
	id: string;
	employeeId: string;
	name: string;
	phone: string;
	relationship: string;
	isPrimary: boolean;
}> = {}): EmergencyContact {
	const data = {
		id: VALID_UUID_1,
		employeeId: VALID_UUID_2,
		name: 'Jane Doe',
		phone: '+1 555-0100',
		relationship: 'spouse',
		isPrimary: false,
		...overrides
	};

	const nameResult = ContactName.create(data.name);
	const phoneResult = ContactPhone.create(data.phone);
	const relResult = Relationship.create(data.relationship);

	const contactResult = EmergencyContact.create({
		id: data.id,
		employeeId: data.employeeId,
		name: nameResult.value,
		phone: phoneResult.value,
		relationship: relResult.value,
		isPrimary: data.isPrimary,
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01')
	});

	return contactResult.value;
}

class MockRepository implements EmergencyContactRepository {
	findById = vi.fn<(id: string) => Promise<Result<EmergencyContact | null, EmergencyContactError>>>();
	findByEmployeeId = vi.fn<(employeeId: string) => Promise<Result<EmergencyContact[], EmergencyContactError>>>();
	findPrimaryByEmployeeId = vi.fn<(employeeId: string) => Promise<Result<EmergencyContact | null, EmergencyContactError>>>();
	create = vi.fn<(contact: EmergencyContact) => Promise<Result<EmergencyContact, EmergencyContactError>>>();
	update = vi.fn<(contact: EmergencyContact) => Promise<Result<EmergencyContact, EmergencyContactError>>>();
	delete = vi.fn<(id: string) => Promise<Result<void, EmergencyContactError>>>();
	setPrimary = vi.fn<(id: string, employeeId: string) => Promise<Result<EmergencyContact, EmergencyContactError>>>();
}

describe('EmergencyContactService', () => {
	let service: EmergencyContactService;
	let mockRepo: MockRepository;

	beforeEach(() => {
		mockRepo = new MockRepository();
		service = new EmergencyContactService(mockRepo);
	});

	describe('getById', () => {
		it('should return contact when found', async () => {
			const contact = createMockContact();
			mockRepo.findById.mockResolvedValue(Result.ok(contact));

			const result = await service.getById(VALID_UUID_1);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(contact);
			expect(mockRepo.findById).toHaveBeenCalledWith(VALID_UUID_1);
		});

		it('should return EmergencyContactNotFoundError when not found', async () => {
			mockRepo.findById.mockResolvedValue(Result.ok(null));

			const result = await service.getById(VALID_UUID_1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmergencyContactNotFoundError);
		});

		it('should propagate repository errors', async () => {
			const repoError = new EmergencyContactNotFoundError(VALID_UUID_1);
			mockRepo.findById.mockResolvedValue(Result.error(repoError));

			const result = await service.getById(VALID_UUID_1);

			expect(result.isError).toBe(true);
			expect(result.error).toBe(repoError);
		});
	});

	describe('getByEmployeeId', () => {
		it('should return all contacts for employee', async () => {
			const contacts = [
				createMockContact({ id: VALID_UUID_1 }),
				createMockContact({ id: VALID_UUID_3 })
			];
			mockRepo.findByEmployeeId.mockResolvedValue(Result.ok(contacts));

			const result = await service.getByEmployeeId(VALID_UUID_2);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(mockRepo.findByEmployeeId).toHaveBeenCalledWith(VALID_UUID_2);
		});

		it('should return empty array when no contacts exist', async () => {
			mockRepo.findByEmployeeId.mockResolvedValue(Result.ok([]));

			const result = await service.getByEmployeeId(VALID_UUID_2);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should propagate repository errors', async () => {
			const repoError = new EmergencyContactNotFoundError(VALID_UUID_2);
			mockRepo.findByEmployeeId.mockResolvedValue(Result.error(repoError));

			const result = await service.getByEmployeeId(VALID_UUID_2);

			expect(result.isError).toBe(true);
		});
	});

	describe('getPrimary', () => {
		it('should return primary contact when exists', async () => {
			const contact = createMockContact({ isPrimary: true });
			mockRepo.findPrimaryByEmployeeId.mockResolvedValue(Result.ok(contact));

			const result = await service.getPrimary(VALID_UUID_2);

			expect(result.isOk).toBe(true);
			expect(result.value?.isPrimary).toBe(true);
		});

		it('should return null when no primary contact exists', async () => {
			mockRepo.findPrimaryByEmployeeId.mockResolvedValue(Result.ok(null));

			const result = await service.getPrimary(VALID_UUID_2);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should propagate repository errors', async () => {
			const repoError = new EmergencyContactNotFoundError(VALID_UUID_2);
			mockRepo.findPrimaryByEmployeeId.mockResolvedValue(Result.error(repoError));

			const result = await service.getPrimary(VALID_UUID_2);

			expect(result.isError).toBe(true);
		});
	});

	describe('create', () => {
		it('should create emergency contact with valid input', async () => {
			const contact = createMockContact();
			mockRepo.create.mockResolvedValue(Result.ok(contact));

			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				name: 'Jane Doe',
				phone: '+1 555-0100',
				relationship: 'spouse',
				isPrimary: false
			});

			expect(result.isOk).toBe(true);
			expect(mockRepo.create).toHaveBeenCalledOnce();
		});

		it('should return error for invalid name', async () => {
			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				name: '',
				phone: '+1 555-0100',
				relationship: 'spouse',
				isPrimary: false
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(mockRepo.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid phone', async () => {
			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				name: 'Jane Doe',
				phone: '123', // too short
				relationship: 'spouse',
				isPrimary: false
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(mockRepo.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid relationship', async () => {
			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				name: 'Jane Doe',
				phone: '+1 555-0100',
				relationship: 'coworker',
				isPrimary: false
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(mockRepo.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid UUID', async () => {
			const result = await service.create({
				id: 'not-a-uuid',
				employeeId: VALID_UUID_2,
				name: 'Jane Doe',
				phone: '+1 555-0100',
				relationship: 'spouse',
				isPrimary: false
			});

			expect(result.isError).toBe(true);
			expect(mockRepo.create).not.toHaveBeenCalled();
		});

		it('should propagate repository errors on create', async () => {
			const repoError = new EmergencyContactNotFoundError(VALID_UUID_1);
			mockRepo.create.mockResolvedValue(Result.error(repoError));

			const result = await service.create({
				id: VALID_UUID_1,
				employeeId: VALID_UUID_2,
				name: 'Jane Doe',
				phone: '+1 555-0100',
				relationship: 'spouse',
				isPrimary: false
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('update', () => {
		it('should update contact name and phone', async () => {
			const existing = createMockContact();
			const updated = createMockContact({ name: 'John Smith', phone: '+1 555-9999' });
			mockRepo.findById.mockResolvedValue(Result.ok(existing));
			mockRepo.update.mockResolvedValue(Result.ok(updated));

			const result = await service.update(VALID_UUID_1, {
				name: 'John Smith',
				phone: '+1 555-9999'
			});

			expect(result.isOk).toBe(true);
			expect(mockRepo.update).toHaveBeenCalledOnce();
		});

		it('should return error when contact not found for update', async () => {
			mockRepo.findById.mockResolvedValue(Result.ok(null));

			const result = await service.update(VALID_UUID_1, {
				name: 'John Smith',
				phone: '+1 555-9999'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmergencyContactNotFoundError);
			expect(mockRepo.update).not.toHaveBeenCalled();
		});

		it('should return error for invalid name on update', async () => {
			const existing = createMockContact();
			mockRepo.findById.mockResolvedValue(Result.ok(existing));

			const result = await service.update(VALID_UUID_1, {
				name: '',
				phone: '+1 555-9999'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(mockRepo.update).not.toHaveBeenCalled();
		});

		it('should return error for invalid phone on update', async () => {
			const existing = createMockContact();
			mockRepo.findById.mockResolvedValue(Result.ok(existing));

			const result = await service.update(VALID_UUID_1, {
				name: 'John Smith',
				phone: '123' // too short
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(mockRepo.update).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('should delete existing contact', async () => {
			const contact = createMockContact();
			mockRepo.findById.mockResolvedValue(Result.ok(contact));
			mockRepo.delete.mockResolvedValue(Result.ok(undefined));

			const result = await service.delete(VALID_UUID_1);

			expect(result.isOk).toBe(true);
			expect(mockRepo.delete).toHaveBeenCalledWith(VALID_UUID_1);
		});

		it('should return error when contact not found for delete', async () => {
			mockRepo.findById.mockResolvedValue(Result.ok(null));

			const result = await service.delete(VALID_UUID_1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmergencyContactNotFoundError);
			expect(mockRepo.delete).not.toHaveBeenCalled();
		});

		it('should propagate repository errors on delete', async () => {
			const repoError = new EmergencyContactNotFoundError(VALID_UUID_1);
			mockRepo.findById.mockResolvedValue(Result.error(repoError));

			const result = await service.delete(VALID_UUID_1);

			expect(result.isError).toBe(true);
		});
	});

	describe('setPrimary', () => {
		it('should set contact as primary', async () => {
			const contact = createMockContact();
			const primaryContact = createMockContact({ isPrimary: true });
			mockRepo.findById.mockResolvedValue(Result.ok(contact));
			mockRepo.setPrimary.mockResolvedValue(Result.ok(primaryContact));

			const result = await service.setPrimary(VALID_UUID_1, VALID_UUID_2);

			expect(result.isOk).toBe(true);
			expect(result.value.isPrimary).toBe(true);
			expect(mockRepo.setPrimary).toHaveBeenCalledWith(VALID_UUID_1, VALID_UUID_2);
		});

		it('should return error when contact not found for setPrimary', async () => {
			mockRepo.findById.mockResolvedValue(Result.ok(null));

			const result = await service.setPrimary(VALID_UUID_1, VALID_UUID_2);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EmergencyContactNotFoundError);
			expect(mockRepo.setPrimary).not.toHaveBeenCalled();
		});

		it('should propagate repository errors on setPrimary', async () => {
			const contact = createMockContact();
			const repoError = new EmergencyContactNotFoundError(VALID_UUID_1);
			mockRepo.findById.mockResolvedValue(Result.ok(contact));
			mockRepo.setPrimary.mockResolvedValue(Result.error(repoError));

			const result = await service.setPrimary(VALID_UUID_1, VALID_UUID_2);

			expect(result.isError).toBe(true);
		});
	});
});
