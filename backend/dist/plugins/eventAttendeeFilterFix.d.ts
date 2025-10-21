/**
 * Custom PostGraphile Plugin: Event Attendee Filter Fix
 *
 * Manually adds missing filter fields to EventAttendeeFilter type.
 * This fixes a bug in postgraphile-plugin-connection-filter v2.3.0 where
 * certain columns are not automatically included in filter types.
 *
 * Missing fields: isRequired, createdAt, reminderTime, scope, isOrganizer
 *
 * Investigation showed that only the first 4 columns (id, eventId, employeeId, responseStatus)
 * were included in EventAttendeeFilter, regardless of whether columns were added via
 * CREATE TABLE or ALTER TABLE statements.
 */
declare const EventAttendeeFilterFixPlugin: (builder: any) => void;
export default EventAttendeeFilterFixPlugin;
