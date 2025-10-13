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
const EventAttendeeFilterFixPlugin = (builder) => {
    builder.hook('GraphQLInputObjectType:fields', (fields, build, context) => {
        const { scope: { isInputType, isPgConnectionFilter }, fieldWithHooks } = context;
        // Only modify EventAttendeeFilter input type
        if (!isPgConnectionFilter || context.Self.name !== 'EventAttendeeFilter') {
            return fields;
        }
        const { graphql: { GraphQLInputObjectType } } = build;
        // Get filter types from schema
        const BooleanFilter = build.getTypeByName('BooleanFilter');
        const DatetimeFilter = build.getTypeByName('DatetimeFilter');
        const IntFilter = build.getTypeByName('IntFilter');
        const RsvpScopeFilter = build.getTypeByName('RsvpScopeFilter');
        return build.extend(fields, {
            isRequired: {
                description: 'Filter by whether attendance is required',
                type: BooleanFilter
            },
            createdAt: {
                description: 'Filter by when attendee was added to event',
                type: DatetimeFilter
            },
            reminderTime: {
                description: 'Filter by reminder time in minutes before event',
                type: IntFilter
            },
            scope: {
                description: 'Filter by RSVP scope (this_event or all_events)',
                type: RsvpScopeFilter
            },
            isOrganizer: {
                description: 'Filter by whether attendee is an event organizer',
                type: BooleanFilter
            }
        }, `Adding missing filter fields to EventAttendeeFilter`);
    });
};
export default EventAttendeeFilterFixPlugin;
//# sourceMappingURL=eventAttendeeFilterFix.js.map