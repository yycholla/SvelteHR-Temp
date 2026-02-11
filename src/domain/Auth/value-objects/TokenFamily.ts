import { Result } from '$domain/Result';
import { InvalidTokenError } from '../errors/TokenErrors';

interface TokenFamilyProps {
	familyId: string;
	userId: string;
	createdAt: Date;
	revokedAt?: Date;
	revokedReason?: string;
}

export class TokenFamily {
	private constructor(private readonly props: TokenFamilyProps) {}

	static create(props: TokenFamilyProps): Result<TokenFamily, InvalidTokenError> {
		if (!props.familyId || props.familyId.trim().length === 0) {
			return Result.error(new InvalidTokenError('Family ID cannot be empty'));
		}

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(props.userId)) {
			return Result.error(new InvalidTokenError('User ID must be a valid UUID'));
		}

		if (!(props.createdAt instanceof Date) || isNaN(props.createdAt.getTime())) {
			return Result.error(new InvalidTokenError('Created date must be valid'));
		}

		return Result.ok(new TokenFamily({ ...props }));
	}

	get familyId(): string {
		return this.props.familyId;
	}

	get userId(): string {
		return this.props.userId;
	}

	get createdAt(): Date {
		return new Date(this.props.createdAt);
	}

	get isRevoked(): boolean {
		return this.props.revokedAt !== undefined;
	}

	get revokedAt(): Date | undefined {
		return this.props.revokedAt ? new Date(this.props.revokedAt) : undefined;
	}

	get revokedReason(): string | undefined {
		return this.props.revokedReason;
	}

	revoke(reason: string): TokenFamily {
		return new TokenFamily({
			...this.props,
			revokedAt: new Date(),
			revokedReason: reason
		});
	}

	equals(other: TokenFamily): boolean {
		return this.familyId === other.familyId && this.userId === other.userId;
	}
}
