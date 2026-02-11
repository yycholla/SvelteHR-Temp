import { DomainError } from '$domain/errors';

export class TokenError extends DomainError {
	constructor(message: string, code: string = 'TOKEN_ERROR', context?: Record<string, unknown>) {
		super(message, code, context);
		this.name = 'TokenError';
	}
}

export class InvalidTokenError extends TokenError {
	constructor(reason: string) {
		super(`Invalid token: ${reason}`, 'INVALID_TOKEN', { reason });
		this.name = 'InvalidTokenError';
	}
}

export class ExpiredTokenError extends TokenError {
	constructor(reason: string = 'Token has expired') {
		super(reason, 'EXPIRED_TOKEN');
		this.name = 'ExpiredTokenError';
	}
}

export class RevokedTokenError extends TokenError {
	constructor(reason: string = 'Token has been revoked') {
		super(reason, 'REVOKED_TOKEN');
		this.name = 'RevokedTokenError';
	}
}
