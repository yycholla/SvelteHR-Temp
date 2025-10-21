/**
 * Component Contracts for Events Calendar UI Integration
 * Feature: 027-we-need-to
 *
 * These interfaces define the contracts between UI components and their consumers.
 * All contracts are type-checked at compile time with TypeScript 5.0 strict mode.
 */

import type { Snippet } from 'svelte';

// ============================================================================
// Base Types
// ============================================================================

export type EventType = 'meeting' | 'training' | 'social' | 'conference' | 'other';
export type EventVisibility = 'public' | 'department' | 'private';
export type RsvpStatus = 'accepted' | 'declined' | 'tentative' | 'pending';
export type RsvpScope = 'single' | 'future';
export type AspectRatio = '16:9' | '9:16';
export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

// ============================================================================
// Calendar Event Model
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;

  // Classification
  type: EventType;
  visibility: EventVisibility;

  // Recurrence
  isRecurring: boolean;
  rrule: string | null;
  parentEventId: string | null;

  // Capacity
  capacity: number | null;
  attendeeCount: number;
  waitlistCount: number;
  waitlistEnabled: boolean;

  // User's RSVP status
  userRsvpStatus: RsvpStatus | null;
  userWaitlistPosition: number | null;

  // Image
  imageUrl: string | null;
  imageAspectRatio: AspectRatio | null;

  // Permissions
  createdBy: string;
  canEdit: boolean;
  canDelete: boolean;

  // Conflicts
  hasConflict: boolean;
  conflictingEventIds: string[];
}

// ============================================================================
// EventCalendar Component
// ============================================================================

export interface EventCalendarProps {
  /**
   * Initial date to display on calendar
   * Defaults to current month if not provided
   */
  initialDate?: Date;

  /**
   * Called when user clicks an event
   */
  onEventClick: (eventId: string) => void;

  /**
   * Called when user clicks a date to create new event
   */
  onDateSelect: (date: Date) => void;

  /**
   * Optional custom event render snippet
   */
  eventContent?: Snippet<[{ event: CalendarEvent }]>;
}

/**
 * Contract Test: EventCalendar must render with required props
 */
export function testEventCalendarMinimalProps(): void {
  const props: EventCalendarProps = {
    onEventClick: (id) => console.log('clicked', id),
    onDateSelect: (date) => console.log('selected', date)
  };
  // Contract satisfied
}

// ============================================================================
// EventDetailsDialog Component
// ============================================================================

export interface EventDetailsDialogProps {
  /**
   * Event ID to display
   */
  eventId: string;

  /**
   * Controls dialog visibility
   */
  open: boolean;

  /**
   * Called when dialog should close
   */
  onClose: () => void;
}

export interface Attendee {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  rsvpStatus: RsvpStatus;
  rsvpDate: Date;
  isCreator: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  text: string;
  createdAt: Date;
  mentions: string[];
}

export interface HistoryEntry {
  id: string;
  userId: string;
  userName: string;
  action: HistoryAction;
  changes: Record<string, { old: unknown; new: unknown }>;
  timestamp: Date;
}

export type HistoryAction =
  | 'created'
  | 'updated'
  | 'rescheduled'
  | 'capacity_changed'
  | 'attendee_added'
  | 'attendee_removed'
  | 'cancelled';

/**
 * Contract Test: EventDetailsDialog must accept valid event ID
 */
export function testEventDetailsDialogProps(): void {
  const props: EventDetailsDialogProps = {
    eventId: '123e4567-e89b-12d3-a456-426614174000',
    open: true,
    onClose: () => console.log('closed')
  };
  // Contract satisfied
}

// ============================================================================
// EventCreateDialog Component
// ============================================================================

export interface EventCreateDialogProps {
  /**
   * Controls dialog visibility
   */
  open: boolean;

  /**
   * Optional initial date for new event
   */
  initialDate?: Date;

  /**
   * Called when dialog should close
   */
  onClose: () => void;

  /**
   * Called after event is successfully created
   */
  onEventCreated: (eventId: string) => void;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek: number[] | null;  // 0-6 for weekly
  endDate: Date;
  rruleString: string;
}

export interface EventCreateFormData {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  type: EventType;
  visibility: EventVisibility;
  selectedDepartments: string[];
  selectedAttendees: string[];
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
  hasCapacityLimit: boolean;
  capacity: number | null;
  waitlistEnabled: boolean;
  uploadedImageId: string | null;
}

/**
 * Contract Test: EventCreateDialog must handle creation callback
 */
export function testEventCreateDialogProps(): void {
  const props: EventCreateDialogProps = {
    open: true,
    onClose: () => console.log('closed'),
    onEventCreated: (id) => console.log('created', id)
  };
  // Contract satisfied
}

// ============================================================================
// ImageUploadWidget Component
// ============================================================================

export interface ImageUploadWidgetProps {
  /**
   * Called after image is successfully uploaded and processed
   */
  onImageUploaded: (imageId: string, imageUrl: string, aspectRatio: AspectRatio) => void;

  /**
   * Called when upload fails or validation error occurs
   */
  onError: (error: string) => void;

  /**
   * Initial aspect ratio selection
   * Defaults to '16:9'
   */
  initialAspectRatio?: AspectRatio;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Contract Test: ImageUploadWidget must handle upload callback
 */
export function testImageUploadWidgetProps(): void {
  const props: ImageUploadWidgetProps = {
    onImageUploaded: (id, url, ratio) => console.log('uploaded', id, url, ratio),
    onError: (error) => console.error('error', error)
  };
  // Contract satisfied
}

// ============================================================================
// ConflictWarningDialog Component
// ============================================================================

export interface ConflictWarningDialogProps {
  /**
   * Controls dialog visibility
   */
  open: boolean;

  /**
   * Event user is trying to RSVP to or create
   */
  targetEvent: CalendarEvent;

  /**
   * Events that conflict with target event
   */
  conflictingEvents: ConflictingEvent[];

  /**
   * Action that triggered conflict check
   */
  action: 'rsvp' | 'create';

  /**
   * Called when user confirms action despite conflicts
   */
  onConfirm: () => void;

  /**
   * Called when user cancels action
   */
  onCancel: () => void;
}

export interface ConflictingEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  overlapDuration: number;  // minutes
  overlapPercentage: number;  // 0-100
  severity: 'minor' | 'major';  // <30% = minor, ≥30% = major
}

/**
 * Contract Test: ConflictWarningDialog must handle confirmation
 */
export function testConflictWarningDialogProps(): void {
  const mockEvent: CalendarEvent = {
    id: '1',
    title: 'Test Event',
    startDate: new Date(),
    endDate: new Date(),
    allDay: false,
    type: 'meeting',
    visibility: 'public',
    isRecurring: false,
    rrule: null,
    parentEventId: null,
    capacity: null,
    attendeeCount: 0,
    waitlistCount: 0,
    waitlistEnabled: false,
    userRsvpStatus: null,
    userWaitlistPosition: null,
    imageUrl: null,
    imageAspectRatio: null,
    createdBy: 'user1',
    canEdit: false,
    canDelete: false,
    hasConflict: true,
    conflictingEventIds: []
  };

  const props: ConflictWarningDialogProps = {
    open: true,
    targetEvent: mockEvent,
    conflictingEvents: [],
    action: 'rsvp',
    onConfirm: () => console.log('confirmed'),
    onCancel: () => console.log('cancelled')
  };
  // Contract satisfied
}

// ============================================================================
// AttendeePickerModal Component
// ============================================================================

export interface AttendeePickerModalProps {
  /**
   * Controls dialog visibility
   */
  open: boolean;

  /**
   * Currently selected user IDs
   */
  selectedUserIds: string[];

  /**
   * Called when selection changes
   */
  onSelectionChange: (userIds: string[]) => void;

  /**
   * Called when dialog should close
   */
  onClose: () => void;
}

export interface EmployeeSearchResult {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  department: string;
}

/**
 * Contract Test: AttendeePickerModal must handle selection
 */
export function testAttendeePickerModalProps(): void {
  const props: AttendeePickerModalProps = {
    open: true,
    selectedUserIds: ['user1', 'user2'],
    onSelectionChange: (ids) => console.log('selected', ids),
    onClose: () => console.log('closed')
  };
  // Contract satisfied
}

// ============================================================================
// AttendeeListView Component
// ============================================================================

export interface AttendeeListViewProps {
  /**
   * Event ID for attendee list
   */
  eventId: string;

  /**
   * List of attendees
   */
  attendees: Attendee[];

  /**
   * Whether current user can remove attendees
   */
  canRemoveAttendees: boolean;

  /**
   * Called when attendee should be removed
   */
  onRemoveAttendee?: (userId: string) => void;
}

/**
 * Contract Test: AttendeeListView must render attendees
 */
export function testAttendeeListViewProps(): void {
  const mockAttendees: Attendee[] = [
    {
      userId: 'user1',
      fullName: 'John Doe',
      avatarUrl: null,
      rsvpStatus: 'accepted',
      rsvpDate: new Date(),
      isCreator: true
    }
  ];

  const props: AttendeeListViewProps = {
    eventId: 'event1',
    attendees: mockAttendees,
    canRemoveAttendees: true,
    onRemoveAttendee: (id) => console.log('removed', id)
  };
  // Contract satisfied
}

// ============================================================================
// NotificationPreferencesPage Component
// ============================================================================

export interface NotificationPreferencesProps {
  /**
   * User ID for preferences
   */
  userId: string;
}

export interface NotificationPreferences {
  eventInvitations: boolean;
  eventChanges: boolean;
  eventCancellations: boolean;
  commentMentions: boolean;
  reminderTimes: ReminderTime[];
  reminderScope: ReminderScope;
  customEventIds: string[];
}

export type ReminderTime = '15min' | '1hour' | '1day';
export type ReminderScope = 'all' | 'accepted' | 'custom';

/**
 * Contract Test: NotificationPreferences must accept user ID
 */
export function testNotificationPreferencesProps(): void {
  const props: NotificationPreferencesProps = {
    userId: 'user1'
  };
  // Contract satisfied
}

// ============================================================================
// RecurrenceScopeDialog Component (existing from 025)
// ============================================================================

export interface RecurrenceScopeDialogProps {
  /**
   * Controls dialog visibility
   */
  open: boolean;

  /**
   * Event title to display in prompt
   */
  eventTitle: string;

  /**
   * Action being performed
   */
  action: 'rsvp' | 'edit' | 'delete' | 'reschedule';

  /**
   * Called when user selects a scope
   */
  onConfirm: (scope: RsvpScope) => void;

  /**
   * Called when user cancels
   */
  onCancel: () => void;
}

// ============================================================================
// Contract Validation Functions
// ============================================================================

/**
 * Validates that all required props are provided
 */
export function validateComponentProps<T>(props: T, requiredKeys: (keyof T)[]): void {
  for (const key of requiredKeys) {
    if (props[key] === undefined) {
      throw new Error(`Missing required prop: ${String(key)}`);
    }
  }
}

/**
 * Validates event ID format (UUID v4)
 */
export function validateEventId(id: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid event ID format: ${id}`);
  }
}

/**
 * Validates date range (end must be after start)
 */
export function validateDateRange(startDate: Date, endDate: Date): void {
  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }
}

/**
 * Validates aspect ratio value
 */
export function validateAspectRatio(ratio: string): asserts ratio is AspectRatio {
  if (ratio !== '16:9' && ratio !== '9:16') {
    throw new Error(`Invalid aspect ratio: ${ratio}`);
  }
}

/**
 * Validates RSVP status value
 */
export function validateRsvpStatus(status: string): asserts status is RsvpStatus {
  const validStatuses: RsvpStatus[] = ['accepted', 'declined', 'tentative', 'pending'];
  if (!validStatuses.includes(status as RsvpStatus)) {
    throw new Error(`Invalid RSVP status: ${status}`);
  }
}
