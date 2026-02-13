// src/domain/Compensation/value-objects/Salary.ts
import { Result } from '$domain/Result';
import { InvalidSalaryError } from '../errors';

export type Currency = 'USD' | 'EUR' | 'GBP';

const VALID_CURRENCIES: ReadonlySet<Currency> = new Set(['USD', 'EUR', 'GBP']);

/**
 * Salary value object representing a monetary amount with currency.
 * Enforces non-negative amounts and valid currency codes.
 */
export class Salary {
	private constructor(
		private readonly _amount: number,
		private readonly _currency: Currency
	) {}

	static create(amount: number, currency: string): Result<Salary, InvalidSalaryError> {
		if (amount < 0) {
			return Result.error(new InvalidSalaryError('Salary amount must be non-negative', amount));
		}

		const normalizedCurrency = currency.toUpperCase() as Currency;
		if (!VALID_CURRENCIES.has(normalizedCurrency)) {
			return Result.error(
				new InvalidSalaryError(`Invalid currency: ${currency}. Must be USD, EUR, or GBP`, currency)
			);
		}

		return Result.ok(new Salary(amount, normalizedCurrency));
	}

	get amount(): number {
		return this._amount;
	}

	get currency(): Currency {
		return this._currency;
	}

	equals(other: Salary): boolean {
		return this._amount === other._amount && this._currency === other._currency;
	}

	toString(): string {
		return `${this._amount} ${this._currency}`;
	}
}
