// GraphQL Operations: Notifications (Dual-Channel: Email + In-App)
// Feature: 019-we-need-to - Task T016
// Purpose: Notification center with read/unread tracking and recipient-only RLS
// Refactored: Moved to src/lib/graphql/notifications/

export * from './notifications/queries';
export * from './notifications/mutations';
export * from './notifications/types';
export * from './notifications/utils';
export * from './notifications/operations';