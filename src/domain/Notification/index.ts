// Notification Domain Module - Public API
// Re-exports all public types, classes, and interfaces from the Notification domain

// Entities
export { Notification } from './entities/Notification';
export type { NotificationProps } from './entities/Notification';

// Value Objects
export { NotificationType } from './value-objects/NotificationType';
export { NotificationCategory } from './value-objects/NotificationCategory';
export { NotificationPriority } from './value-objects/NotificationPriority';
export { NotificationTitle } from './value-objects/NotificationTitle';
export { NotificationMessage } from './value-objects/NotificationMessage';
export { ReadStatus } from './value-objects/ReadStatus';
export { ResourceLink } from './value-objects/ResourceLink';

// Errors
export {
	NotificationError,
	NotificationTypeValidationError,
	NotificationCategoryValidationError,
	NotificationPriorityValidationError,
	NotificationTitleValidationError,
	NotificationMessageValidationError,
	ReadStatusValidationError,
	ResourceLinkValidationError,
	NotificationNotFoundError,
	NotificationValidationError
} from './errors/NotificationErrors';
