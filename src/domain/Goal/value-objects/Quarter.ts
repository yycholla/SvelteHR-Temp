// src/domain/Goal/value-objects/Quarter.ts
import { Result } from '$domain/Result';
import { QuarterValidationError } from '../errors/GoalErrors';

type QuarterValue = 1 | 2 | 3 | 4;

const VALID_QUARTERS: QuarterValue[] = [1, 2, 3, 4];

interface QuarterProps {
	value: QuarterValue;
}

export class Quarter {
	private constructor(private readonly props: QuarterProps) {}

	static create(quarter: string | number): Result<Quarter, QuarterValidationError> {
		let quarterNum: number;

		if (typeof quarter === 'string') {
			const trimmed = quarter.trim().toUpperCase();
			if (trimmed.startsWith('Q')) {
				quarterNum = parseInt(trimmed.substring(1), 10);
			} else {
				quarterNum = parseInt(trimmed, 10);
			}
		} else {
			quarterNum = quarter;
		}

		if (isNaN(quarterNum) || !VALID_QUARTERS.includes(quarterNum as QuarterValue)) {
			return Result.error(
				new QuarterValidationError(`Invalid quarter: ${quarter}. Must be Q1, Q2, Q3, or Q4`)
			);
		}

		return Result.ok(new Quarter({ value: quarterNum as QuarterValue }));
	}

	get value(): QuarterValue {
		return this.props.value;
	}

	format(): string {
		return `Q${this.props.value}`;
	}

	getMonthRange(): [number, number] {
		const ranges: Record<QuarterValue, [number, number]> = {
			1: [1, 3],
			2: [4, 6],
			3: [7, 9],
			4: [10, 12]
		};
		return ranges[this.props.value];
	}

	equals(other: Quarter): boolean {
		return this.props.value === other.props.value;
	}

	toString(): string {
		return this.format();
	}
}
