// src/domain/Attendance/ShiftType.ts
import { Result } from '$domain/Result';
import { InvalidShiftTypeError } from '$domain/errors';

type ShiftTypeValue = 'morning' | 'afternoon' | 'night' | 'split';

const VALID_SHIFT_TYPES: ReadonlySet<string> = new Set(['morning', 'afternoon', 'night', 'split']);

export class ShiftType {
	private constructor(private readonly _value: ShiftTypeValue) {}

	static create(value: string): Result<ShiftType, InvalidShiftTypeError> {
		if (!VALID_SHIFT_TYPES.has(value)) {
			return Result.error(new InvalidShiftTypeError(value));
		}

		return Result.ok(new ShiftType(value as ShiftTypeValue));
	}

	get value(): ShiftTypeValue {
		return this._value;
	}

	get isMorning(): boolean {
		return this._value === 'morning';
	}

	get isNight(): boolean {
		return this._value === 'night';
	}

	equals(other: ShiftType): boolean {
		return this._value === other._value;
	}
}
