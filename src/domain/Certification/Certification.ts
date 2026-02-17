// src/domain/Certification/Certification.ts
import { Result } from '$domain/Result';
import { CertificationName } from './value-objects/CertificationName';
import { IssuingOrganization } from './value-objects/IssuingOrganization';
import { CredentialId } from './value-objects/CredentialId';
import { CertificationError, InvalidCertificationError } from './errors/CertificationErrors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
	return UUID_PATTERN.test(value);
}

export interface CreateCertificationData {
	id: string;
	employeeId: string;
	name: CertificationName;
	issuingOrganization: IssuingOrganization;
	issueDate: Date;
	expirationDate: Date | null;
	credentialId: CredentialId | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Certification aggregate root entity.
 *
 * Represents a professional certification held by an employee.
 * Enforces business invariants:
 * - id and employeeId must be valid UUIDs
 * - issueDate must be a valid date
 * - expirationDate must be after issueDate when provided
 * - dates use defensive copies to prevent mutation
 *
 * @example
 * ```typescript
 * const nameResult = CertificationName.create('AWS Certified Developer');
 * const orgResult = IssuingOrganization.create('Amazon Web Services');
 * const credResult = CredentialId.create('AWS-CD-12345');
 *
 * const certResult = Certification.create({
 *   id: '123e4567-...',
 *   employeeId: '123e4567-...',
 *   name: nameResult.value,
 *   issuingOrganization: orgResult.value,
 *   issueDate: new Date('2023-01-01'),
 *   expirationDate: new Date('2026-01-01'),
 *   credentialId: credResult.value,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * });
 * ```
 */
export class Certification {
	private constructor(
		private readonly _id: string,
		private readonly _employeeId: string,
		private readonly _name: CertificationName,
		private readonly _issuingOrganization: IssuingOrganization,
		private readonly _issueDate: Date,
		private readonly _expirationDate: Date | null,
		private readonly _credentialId: CredentialId | null,
		private readonly _createdAt: Date,
		private readonly _updatedAt: Date
	) {}

	/**
	 * Create a Certification entity.
	 * @param data - Certification creation data with validated value objects
	 * @returns Result containing Certification or CertificationError
	 */
	static create(data: CreateCertificationData): Result<Certification, CertificationError> {
		if (!isValidUUID(data.id)) {
			return Result.error(
				new InvalidCertificationError(`Invalid certification ID: "${data.id}"`)
			);
		}

		if (!isValidUUID(data.employeeId)) {
			return Result.error(
				new InvalidCertificationError(`Invalid employee ID: "${data.employeeId}"`)
			);
		}

		if (isNaN(data.issueDate.getTime())) {
			return Result.error(new InvalidCertificationError('issueDate must be a valid date'));
		}

		if (data.expirationDate !== null) {
			if (isNaN(data.expirationDate.getTime())) {
				return Result.error(
					new InvalidCertificationError('expirationDate must be a valid date')
				);
			}

			if (data.expirationDate <= data.issueDate) {
				return Result.error(
					new InvalidCertificationError('expirationDate must be after issueDate')
				);
			}
		}

		if (isNaN(data.createdAt.getTime())) {
			return Result.error(new InvalidCertificationError('createdAt must be a valid date'));
		}

		if (isNaN(data.updatedAt.getTime())) {
			return Result.error(new InvalidCertificationError('updatedAt must be a valid date'));
		}

		return Result.ok(
			new Certification(
				data.id,
				data.employeeId,
				data.name,
				data.issuingOrganization,
				new Date(data.issueDate), // defensive copy
				data.expirationDate !== null ? new Date(data.expirationDate) : null, // defensive copy
				data.credentialId,
				new Date(data.createdAt), // defensive copy
				new Date(data.updatedAt) // defensive copy
			)
		);
	}

	get id(): string {
		return this._id;
	}

	get employeeId(): string {
		return this._employeeId;
	}

	get name(): CertificationName {
		return this._name;
	}

	get issuingOrganization(): IssuingOrganization {
		return this._issuingOrganization;
	}

	/** Returns a defensive copy of the issue date */
	get issueDate(): Date {
		return new Date(this._issueDate);
	}

	/** Returns a defensive copy of the expiration date, or null if no expiration */
	get expirationDate(): Date | null {
		return this._expirationDate !== null ? new Date(this._expirationDate) : null;
	}

	get credentialId(): CredentialId | null {
		return this._credentialId;
	}

	/** Returns a defensive copy of the creation date */
	get createdAt(): Date {
		return new Date(this._createdAt);
	}

	/** Returns a defensive copy of the last updated date */
	get updatedAt(): Date {
		return new Date(this._updatedAt);
	}

	/**
	 * Returns true if the certification has expired (expirationDate is in the past).
	 * Returns false if there is no expiration date.
	 */
	isExpired(): boolean {
		if (this._expirationDate === null) {
			return false;
		}
		return this._expirationDate < new Date();
	}

	/**
	 * Returns true if the certification is valid (not expired or has no expiration).
	 */
	isValid(): boolean {
		return !this.isExpired();
	}

	/**
	 * Returns the number of days until expiration, or null if no expiration date.
	 * Returns negative values for already-expired certifications.
	 */
	daysUntilExpiration(): number | null {
		if (this._expirationDate === null) {
			return null;
		}

		const now = new Date();
		const diffMs = this._expirationDate.getTime() - now.getTime();
		return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	}
}
