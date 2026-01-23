// src/domain/Result.ts

/**
 * Result type for operations that can fail
 * Inspired by Rust's Result<T, E>
 */
export class Result<T, E extends Error> {
	private constructor(
		private readonly _tag: 'ok' | 'error',
		private readonly _value?: T,
		private readonly _error?: E
	) {}

	static ok<T, E extends Error = Error>(value: T): Result<T, E> {
		return new Result<T, E>('ok', value, undefined);
	}

	static error<T, E extends Error = Error>(error: E): Result<T, E> {
		return new Result<T, E>('error', undefined, error);
	}

	get isOk(): boolean {
		return this._tag === 'ok';
	}

	get isError(): boolean {
		return this._tag === 'error';
	}

	get value(): T {
		if (this._tag === 'error') {
			throw new Error('Cannot get value from error result');
		}
		return this._value as T;
	}

	get error(): E {
		if (this._tag === 'ok') {
			throw new Error('Cannot get error from ok result');
		}
		return this._error as E;
	}

	map<U>(fn: (value: T) => U): Result<U, E> {
		if (this.isError) {
			return Result.error(this.error);
		}
		return Result.ok(fn(this.value));
	}

	flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
		if (this.isError) {
			return Result.error(this.error);
		}
		return fn(this.value);
	}
}
