// src/domain/Compensation/CompensationRecord.ts
import { Result } from '$domain/Result';
import { Salary } from './value-objects/Salary';
import { SalaryGrade } from './value-objects/SalaryGrade';
import { CompensationType } from './value-objects/CompensationType';
import { PaymentFrequency } from './value-objects/PaymentFrequency';
import { EffectiveDate } from './value-objects/EffectiveDate';
import { InvalidCompensationError } from './errors';

interface CompensationRecordProps {
	readonly id: string;
	readonly employeeId: string;
	readonly salary: Salary;
	readonly salaryGrade: SalaryGrade;
	readonly compensationType: CompensationType;
	readonly paymentFrequency: PaymentFrequency;
	readonly effectiveDate: EffectiveDate;
	readonly endDate: EffectiveDate | null;
	readonly notes: string | null;
}

/**
 * CompensationRecord entity representing a single compensation entry for an employee.
 * Aggregate root for the Compensation domain.
 */
export class CompensationRecord {
	private constructor(private readonly props: CompensationRecordProps) {}

	static create(
		data: CompensationRecordProps
	): Result<CompensationRecord, InvalidCompensationError> {
		// Validate UUID format for IDs
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

		if (!uuidRegex.test(data.id)) {
			return Result.error(
				new InvalidCompensationError('CompensationRecord ID must be a valid UUID', data.id)
			);
		}

		if (!uuidRegex.test(data.employeeId)) {
			return Result.error(
				new InvalidCompensationError('Employee ID must be a valid UUID', data.employeeId)
			);
		}

		// Validate end date is after effective date if present
		if (data.endDate && !data.endDate.isAfter(data.effectiveDate)) {
			return Result.error(
				new InvalidCompensationError(
					'End date must be after effective date',
					data.endDate.toISOString()
				)
			);
		}

		return Result.ok(new CompensationRecord(data));
	}

	get id(): string {
		return this.props.id;
	}

	get employeeId(): string {
		return this.props.employeeId;
	}

	get salary(): Salary {
		return this.props.salary;
	}

	get salaryGrade(): SalaryGrade {
		return this.props.salaryGrade;
	}

	get compensationType(): CompensationType {
		return this.props.compensationType;
	}

	get paymentFrequency(): PaymentFrequency {
		return this.props.paymentFrequency;
	}

	get effectiveDate(): EffectiveDate {
		return this.props.effectiveDate;
	}

	get endDate(): EffectiveDate | null {
		return this.props.endDate;
	}

	get notes(): string | null {
		return this.props.notes;
	}

	/**
	 * Checks if this compensation record is currently active.
	 */
	get isActive(): boolean {
		const now = new Date();
		const isEffective = this.props.effectiveDate.value.getTime() <= now.getTime();
		const isNotEnded = !this.props.endDate || this.props.endDate.value.getTime() > now.getTime();

		return isEffective && isNotEnded;
	}

	/**
	 * Calculates the annual salary equivalent.
	 */
	getAnnualSalary(): number {
		return this.props.paymentFrequency.toAnnual(this.props.salary.amount);
	}

	/**
	 * Updates the salary, returning a new instance.
	 */
	updateSalary(newSalary: Salary): CompensationRecord {
		return new CompensationRecord({
			...this.props,
			salary: newSalary
		});
	}

	/**
	 * Updates the salary grade, returning a new instance.
	 */
	updateGrade(newGrade: SalaryGrade): CompensationRecord {
		return new CompensationRecord({
			...this.props,
			salaryGrade: newGrade
		});
	}

	/**
	 * Sets the end date, effectively terminating this compensation record.
	 */
	terminate(endDate: EffectiveDate): Result<CompensationRecord, InvalidCompensationError> {
		if (!endDate.isAfter(this.props.effectiveDate)) {
			return Result.error(
				new InvalidCompensationError('End date must be after effective date', endDate.toISOString())
			);
		}

		return Result.ok(
			new CompensationRecord({
				...this.props,
				endDate
			})
		);
	}

	/**
	 * Updates the notes, returning a new instance.
	 */
	updateNotes(notes: string | null): CompensationRecord {
		return new CompensationRecord({
			...this.props,
			notes: notes?.trim() || null
		});
	}

	equals(other: CompensationRecord): boolean {
		return this.props.id === other.props.id;
	}
}
