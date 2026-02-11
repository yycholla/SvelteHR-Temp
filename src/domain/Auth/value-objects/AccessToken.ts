import { Result } from '$domain/Result';
import { InvalidTokenError } from '../errors/TokenErrors';

interface AccessTokenProps {
	token: string;
	userId: string;
	expiresAt: Date;
	permissions?: string[];
	roles?: string[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AccessToken {
	private constructor(private readonly props: AccessTokenProps) {}

	static create(props: AccessTokenProps): Result<AccessToken, InvalidTokenError> {
		if (!props.token || props.token.trim().length === 0) {
			return Result.error(new InvalidTokenError('Token cannot be empty'));
		}

		if (!props.userId || !UUID_REGEX.test(props.userId)) {
			return Result.error(new InvalidTokenError('User ID must be a valid UUID'));
		}

		if (!(props.expiresAt instanceof Date) || isNaN(props.expiresAt.getTime())) {
			return Result.error(new InvalidTokenError('Expiration date must be valid'));
		}

		return Result.ok(
			new AccessToken({
				...props,
				expiresAt: new Date(props.expiresAt.getTime())
			})
		);
	}

	get token(): string {
		return this.props.token;
	}

	get userId(): string {
		return this.props.userId;
	}

	get expiresAt(): Date {
		return new Date(this.props.expiresAt.getTime());
	}

	get permissions(): string[] {
		return this.props.permissions ?? [];
	}

	get roles(): string[] {
		return this.props.roles ?? [];
	}

	isExpired(): boolean {
		return Date.now() >= this.props.expiresAt.getTime();
	}

	isNearExpiry(thresholdSeconds: number = 60): boolean {
		const timeUntilExpiry = this.props.expiresAt.getTime() - Date.now();
		return timeUntilExpiry > 0 && timeUntilExpiry <= thresholdSeconds * 1000;
	}

	hasPermission(permission: string): boolean {
		return this.permissions.includes(permission);
	}

	hasRole(role: string): boolean {
		return this.roles.includes(role);
	}

	equals(other: AccessToken): boolean {
		return this.props.token === other.props.token && this.props.userId === other.props.userId;
	}
}
