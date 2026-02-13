import { Result } from '$domain/Result';
import { NotificationValidationError } from '../errors/NotificationErrors';
import type { NotificationType } from '../value-objects/NotificationType';
import type { NotificationCategory } from '../value-objects/NotificationCategory';
import type { NotificationPriority } from '../value-objects/NotificationPriority';
import type { NotificationTitle } from '../value-objects/NotificationTitle';
import type { NotificationMessage } from '../value-objects/NotificationMessage';
import { ReadStatus } from '../value-objects/ReadStatus';
import type { ResourceLink } from '../value-objects/ResourceLink';

export interface NotificationProps {
	id: string;
	recipientId: string;
	type: NotificationType;
	category: NotificationCategory;
	priority: NotificationPriority;
	title: NotificationTitle;
	message: NotificationMessage;
	readStatus: ReadStatus;
	resourceLink?: ResourceLink;
	createdAt: Date;
	deliveredAt?: Date;
	readAt?: Date;
}

export class Notification {
	private constructor(
		private readonly props: {
			id: string;
			recipientId: string;
			type: NotificationType;
			category: NotificationCategory;
			priority: NotificationPriority;
			title: NotificationTitle;
			message: NotificationMessage;
			readStatus: ReadStatus;
			resourceLink?: ResourceLink;
			createdAt: Date;
			deliveredAt?: Date;
			readAt?: Date;
		}
	) {}

	static create(props: NotificationProps): Result<Notification, NotificationValidationError> {
		// Validate required fields
		if (!props.id || props.id.trim().length === 0) {
			return Result.error(
				new NotificationValidationError('Invalid notification: id cannot be empty')
			);
		}

		if (!props.recipientId || props.recipientId.trim().length === 0) {
			return Result.error(
				new NotificationValidationError('Invalid notification: recipientId cannot be empty')
			);
		}

		// Create defensive copies of dates
		return Result.ok(
			new Notification({
				id: props.id,
				recipientId: props.recipientId,
				type: props.type,
				category: props.category,
				priority: props.priority,
				title: props.title,
				message: props.message,
				readStatus: props.readStatus,
				resourceLink: props.resourceLink,
				createdAt: new Date(props.createdAt.getTime()),
				deliveredAt: props.deliveredAt ? new Date(props.deliveredAt.getTime()) : undefined,
				readAt: props.readAt ? new Date(props.readAt.getTime()) : undefined
			})
		);
	}

	// Business methods
	markAsRead(readAt?: Date): Notification {
		const timestamp = readAt ? new Date(readAt.getTime()) : new Date();

		return new Notification({
			...this.props,
			readStatus: ReadStatus.create('read').value,
			readAt: timestamp,
			createdAt: new Date(this.props.createdAt.getTime()),
			deliveredAt: this.props.deliveredAt ? new Date(this.props.deliveredAt.getTime()) : undefined
		});
	}

	markAsUnread(): Notification {
		return new Notification({
			...this.props,
			readStatus: ReadStatus.create('unread').value,
			readAt: undefined,
			createdAt: new Date(this.props.createdAt.getTime()),
			deliveredAt: this.props.deliveredAt ? new Date(this.props.deliveredAt.getTime()) : undefined
		});
	}

	isUnread(): boolean {
		return !this.props.readStatus.isRead();
	}

	hasHighPriority(): boolean {
		return this.props.priority.isHighPriority();
	}

	// Getters with defensive copies
	get id(): string {
		return this.props.id;
	}

	get recipientId(): string {
		return this.props.recipientId;
	}

	get type(): NotificationType {
		return this.props.type;
	}

	get category(): NotificationCategory {
		return this.props.category;
	}

	get priority(): NotificationPriority {
		return this.props.priority;
	}

	get title(): NotificationTitle {
		return this.props.title;
	}

	get message(): NotificationMessage {
		return this.props.message;
	}

	get readStatus(): ReadStatus {
		return this.props.readStatus;
	}

	get resourceLink(): ResourceLink | undefined {
		return this.props.resourceLink;
	}

	get createdAt(): Date {
		return new Date(this.props.createdAt.getTime());
	}

	get deliveredAt(): Date | undefined {
		return this.props.deliveredAt ? new Date(this.props.deliveredAt.getTime()) : undefined;
	}

	get readAt(): Date | undefined {
		return this.props.readAt ? new Date(this.props.readAt.getTime()) : undefined;
	}
}
