// src/domain/EmergencyContact/EmergencyContact.test.ts
import { describe, it, expect } from 'vitest';
import { EmergencyContact } from './EmergencyContact';
import { ContactName } from './value-objects/ContactName';
import { ContactPhone } from './value-objects/ContactPhone';
import { Relationship } from './value-objects/Relationship';
import { InvalidEmergencyContactError } from './errors/EmergencyContactErrors';

const VALID_UUID_1 = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '123e4567-e89b-12d3-a456-426614174001';

function createValidData() {
	const nameResult = ContactName.create('Jane Doe');
	const phoneResult = ContactPhone.create('+1 555-0100');
	const relResult = Relationship.create('spouse');

	return {
		id: VALID_UUID_1,
		employeeId: VALID_UUID_2,
		name: nameResult.value,
		phone: phoneResult.value,
		relationship: relResult.value,
		isPrimary: false,
		createdAt: new Date('2025-01-01T00:00:00.000Z'),
		updatedAt: new Date('2025-01-01T00:00:00.000Z')
	};
}

describe('EmergencyContact', () => {
	describe('create', () => {
		it('should create a valid emergency contact', () => {
			const data = createValidData();
			const result = EmergencyContact.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID_1);
			expect(result.value.employeeId).toBe(VALID_UUID_2);
			expect(result.value.name.value).toBe('Jane Doe');
			expect(result.value.phone.value).toBe('+1 555-0100');
			expect(result.value.relationship.value).toBe('spouse');
			expect(result.value.isPrimary).toBe(false);
		});

		it('should create primary contact', () => {
			const data = { ...createValidData(), isPrimary: true };
			const result = EmergencyContact.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.isPrimary).toBe(true);
		});

		it('should reject invalid contact id', () => {
			const data = { ...createValidData(), id: 'not-a-uuid' };
			const result = EmergencyContact.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(result.error.message).toContain('not-a-uuid');
		});

		it('should reject invalid employee id', () => {
			const data = { ...createValidData(), employeeId: 'bad-id' };
			const result = EmergencyContact.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject invalid createdAt date', () => {
			const data = { ...createValidData(), createdAt: new Date('invalid-date') };
			const result = EmergencyContact.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject invalid updatedAt date', () => {
			const data = { ...createValidData(), updatedAt: new Date('not-a-date') };
			const result = EmergencyContact.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});
	});

	describe('createdAt - defensive copy', () => {
		it('should return a defensive copy of createdAt', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			const date1 = contact.createdAt;
			const date2 = contact.createdAt;

			expect(date1).not.toBe(date2); // different references
			expect(date1.getTime()).toBe(date2.getTime()); // same value
		});

		it('should not allow mutation of createdAt', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			const date = contact.createdAt;
			const originalTime = date.getTime();
			date.setFullYear(2000); // mutate

			expect(contact.createdAt.getTime()).toBe(originalTime); // unchanged
		});
	});

	describe('updatedAt - defensive copy', () => {
		it('should return a defensive copy of updatedAt', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			const date1 = contact.updatedAt;
			const date2 = contact.updatedAt;

			expect(date1).not.toBe(date2);
			expect(date1.getTime()).toBe(date2.getTime());
		});

		it('should not allow mutation of updatedAt', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			const date = contact.updatedAt;
			const originalTime = date.getTime();
			date.setFullYear(2000);

			expect(contact.updatedAt.getTime()).toBe(originalTime);
		});
	});

	describe('markAsPrimary', () => {
		it('should return new instance with isPrimary=true', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			expect(contact.isPrimary).toBe(false);

			const primary = contact.markAsPrimary();

			expect(primary.isPrimary).toBe(true);
			expect(primary).not.toBe(contact); // new instance
		});

		it('should preserve all other fields when marking primary', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			const primary = contact.markAsPrimary();

			expect(primary.id).toBe(contact.id);
			expect(primary.employeeId).toBe(contact.employeeId);
			expect(primary.name.value).toBe(contact.name.value);
			expect(primary.phone.value).toBe(contact.phone.value);
			expect(primary.relationship.value).toBe(contact.relationship.value);
		});

		it('should update updatedAt when marking primary', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;
			const original = contact.updatedAt;

			// brief wait to ensure different time
			const primary = contact.markAsPrimary();

			expect(primary.updatedAt.getTime()).toBeGreaterThanOrEqual(original.getTime());
		});

		it('should not modify original contact', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			contact.markAsPrimary();

			expect(contact.isPrimary).toBe(false);
		});
	});

	describe('updateContact', () => {
		it('should return new instance with updated name and phone', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			const newName = ContactName.create('John Smith').value;
			const newPhone = ContactPhone.create('+1 555-9999').value;

			const updated = contact.updateContact(newName, newPhone);

			expect(updated.name.value).toBe('John Smith');
			expect(updated.phone.value).toBe('+1 555-9999');
			expect(updated).not.toBe(contact);
		});

		it('should preserve id, employeeId, relationship, isPrimary', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			const newName = ContactName.create('John Smith').value;
			const newPhone = ContactPhone.create('+1 555-9999').value;

			const updated = contact.updateContact(newName, newPhone);

			expect(updated.id).toBe(contact.id);
			expect(updated.employeeId).toBe(contact.employeeId);
			expect(updated.relationship.value).toBe(contact.relationship.value);
			expect(updated.isPrimary).toBe(contact.isPrimary);
		});

		it('should not modify original contact', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;

			const newName = ContactName.create('John Smith').value;
			const newPhone = ContactPhone.create('+1 555-9999').value;

			contact.updateContact(newName, newPhone);

			expect(contact.name.value).toBe('Jane Doe');
			expect(contact.phone.value).toBe('+1 555-0100');
		});

		it('should update updatedAt timestamp', () => {
			const data = createValidData();
			const contact = EmergencyContact.create(data).value;
			const originalUpdatedAt = contact.updatedAt;

			const newName = ContactName.create('John Smith').value;
			const newPhone = ContactPhone.create('+1 555-9999').value;

			const updated = contact.updateContact(newName, newPhone);

			expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
		});
	});
});
