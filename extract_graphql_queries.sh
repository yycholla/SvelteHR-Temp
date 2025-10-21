#!/bin/bash

# Extract all GraphQL queries from frontend and organize by table/type

echo "=== EXTRACTING GRAPHQL QUERIES FROM FRONTEND ==="
echo ""

# Find all .server.ts files with queries
SERVER_FILES=$(find src/routes -name "*.server.ts" 2>/dev/null)

# Create output file
OUTPUT="graphql_query_analysis.txt"
> "$OUTPUT"

echo "Found $(echo "$SERVER_FILES" | wc -l) server files to analyze" | tee -a "$OUTPUT"
echo "" | tee -a "$OUTPUT"

# Extract users/employees queries
echo "=== USERS/EMPLOYEES QUERIES ===" | tee -a "$OUTPUT"
grep -A 20 "query.*users\|query.*GetEmployees\|query.*GetUser" $SERVER_FILES 2>/dev/null | grep -E "^\s+(id|email|firstName|lastName|displayName|role|phone|departmentId|managerId|hireDate|isActive|createdAt|updatedAt|status|fullName|termination)" | sort | uniq | tee -a "$OUTPUT"
echo "" | tee -a "$OUTPUT"

# Extract departments queries
echo "=== DEPARTMENTS QUERIES ===" | tee -a "$OUTPUT"
grep -A 15 "query.*departments\|query.*GetDepartments" $SERVER_FILES 2>/dev/null | grep -E "^\s+(id|name|description|parentDepartmentId|managerId|createdAt|updatedAt)" | sort | uniq | tee -a "$OUTPUT"
echo "" | tee -a "$OUTPUT"

# Extract events queries
echo "=== EVENTS QUERIES ===" | tee -a "$OUTPUT"
grep -A 25 "query.*events\|query.*GetEvents\|allEvents" $SERVER_FILES 2>/dev/null | grep -E "^\s+(id|title|description|eventType|status|visibility|startTime|endTime|allDay|location|isPublic|color|organizerId|createdAt|updatedAt|rrule|recurrenceId|maxCapacity|waitlistEnabled|imageUrl)" | sort | uniq | tee -a "$OUTPUT"
echo "" | tee -a "$OUTPUT"

# Extract notifications queries
echo "=== NOTIFICATIONS QUERIES ===" | tee -a "$OUTPUT"
grep -A 20 "query.*notifications\|query.*GetNotifications" $SERVER_FILES 2>/dev/null | grep -E "^\s+(id|type|category|title|message|relatedResourceType|relatedResourceId|readStatus|deliveredAt|readAt|createdAt|recipientId)" | sort | uniq | tee -a "$OUTPUT"
echo "" | tee -a "$OUTPUT"

# Extract tasks queries
echo "=== TASKS QUERIES ===" | tee -a "$OUTPUT"
grep -A 25 "query.*tasks\|query.*GetTasks\|allTasks" $SERVER_FILES 2>/dev/null | grep -E "^\s+(id|title|description|status|priority|dueDate|assigneeId|createdBy|departmentId|tags|metadata|createdAt|updatedAt|completedAt|taskTypeId|estimatedHours|actualHours)" | sort | uniq | tee -a "$OUTPUT"
echo "" | tee -a "$OUTPUT"

# Extract leave requests queries
echo "=== LEAVE REQUESTS QUERIES ===" | tee -a "$OUTPUT"
grep -A 20 "query.*leave.*request\|query.*GetLeave" $SERVER_FILES 2>/dev/null | grep -E "^\s+(id|employeeId|managerId|leaveType|startDate|endDate|daysRequested|status|reason|managerComments|createdAt|updatedAt)" | sort | uniq | tee -a "$OUTPUT"
echo "" | tee -a "$OUTPUT"

# Extract performance reviews queries
echo "=== PERFORMANCE REVIEWS QUERIES ===" | tee -a "$OUTPUT"
grep -A 20 "query.*performance.*review\|query.*GetReview" $SERVER_FILES 2>/dev/null | grep -E "^\s+(id|employeeId|reviewerId|reviewPeriod|status|overallRating|goals|achievements|areasForImprovement|managerFeedback|createdAt|updatedAt)" | sort | uniq | tee -a "$OUTPUT"
echo "" | tee -a "$OUTPUT"

echo "Analysis complete. Results saved to $OUTPUT"
