import { Result } from '$domain/Result';
import { InvalidTokenError } from '../errors/TokenErrors';

interface RefreshTokenProps {
	jwt: string;
	plaintext: string;
	userId: string;
	familyId: string;
	expiresAt: Date;
}

export class RefreshToken {
	private constructor(private readonly props: RefreshTokenProps) {}

	static create(props: RefreshTokenProps): Result<RefreshToken, InvalidTokenError> {
		if (!props.jwt || !props.jwt.includes('.')) {
			return Result.error(new InvalidTokenError('JWT must be in valid format (must contain dots)'));
		}

		if (!props.plaintext || props.plaintext.length < 8) {
			return Result.error(new InvalidTokenError('Plaintext token must be at least 8 characters'));
		}

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(props.userId)) {
			return Result.error(new InvalidTokenError('User ID must be a valid UUID'));
		}

		if (!props.familyId || props.familyId.trim().length === 0) {
			return Result.error(new InvalidTokenError('Family ID cannot be empty'));
		}

		if (!(props.expiresAt instanceof Date) || isNaN(props.expiresAt.getTime())) {
			return Result.error(new InvalidTokenError('Expiration date must be a valid date'));
		}

		return Result.ok(new RefreshToken(props));
	}

	static fromCombinedFormat(
		combined: string,
		userId: string,
		familyId: string,
		expiresAt: Date
	): Result<RefreshToken, InvalidTokenError> {
		const colonIndex = combined.lastIndexOf(':');
		if (colonIndex === -1) {
			return Result.error(new InvalidTokenError('Combined token must be in format jwt:plaintext'));
		}

		const jwt = combined.substring(0, colonIndex);
		const plaintext = combined.substring(colonIndex + 1);

		return RefreshToken.create({ jwt, plaintext, userId, familyId, expiresAt });
	}

	get jwt(): string {
		return this.props.jwt;
	}

	get plaintext(): string {
		return this.props.plaintext;
	}

	get userId(): string {
		return this.props.userId;
	}

	get familyId(): string {
		return this.props.familyId;
	}

	get expiresAt(): Date {
		return new Date(this.props.expiresAt);
	}

	toCombinedFormat(): string {
		return `${this.props.jwt}:${this.props.plaintext}`;
	}

	isExpired(): boolean {
		return Date.now() >= this.props.expiresAt.getTime();
	}

	equals(other: RefreshToken): boolean {
		return (
			this.props.jwt === other.props.jwt &&
			this.props.plaintext === other.props.plaintext &&
			this.props.userId === other.props.userId
		);
	}
}
