# Fix Plan for AttendeeSubset Scope Issue

The `AttendeeSubset` interface was defined inside the `load` function scope, but I'm trying to use it in `updateRsvpStatus` and `setEventReminder` actions which are outside that scope.

## Fix

Move `AttendeeSubset` definition to the top level of the module so it's accessible everywhere in the file.
