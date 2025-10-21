#!/usr/bin/env python3
"""
Comprehensive schema comparison between:
1. Frontend GraphQL expectations
2. PostgreSQL database schemas
3. Rust GraphQL models
"""

import subprocess
import re
from collections import defaultdict

# Frontend expectations extracted from previous analysis
FRONTEND_EXPECTATIONS = {
    'users': {
        'id', 'email', 'firstName', 'lastName', 'displayName', 'role', 'phone',
        'departmentId', 'managerId', 'hireDate', 'isActive', 'createdAt', 'updatedAt',
        'fullName', 'status', 'phoneNumber', 'mobileNumber', 'addressLine1', 'addressLine2',
        'city', 'stateProvince', 'postalCode', 'country', 'jobTitle', 'lastLogin',
        'alternatePhone', 'roleName'
    },
    'departments': {
        'id', 'name', 'description', 'parentDepartmentId', 'managerId',
        'createdAt', 'updatedAt'
    },
    'events': {
        'id', 'title', 'description', 'startTime', 'endTime', 'location',
        'isPublic', 'color', 'eventType', 'allDay'
    },
    'tasks': {
        'id', 'title', 'description', 'status', 'priority', 'dueDate',
        'assigneeId', 'creatorId', 'departmentId', 'createdAt', 'updatedAt',
        'taskTypeId', 'archived', 'archivedAt', 'archivedBy', 'parentTaskId'
    },
    'performance_reviews': {
        'id', 'employeeId', 'reviewerId', 'reviewPeriodStart', 'reviewPeriodEnd',
        'status', 'overallRating', 'goals', 'achievements', 'areasForImprovement',
        'managerFeedback', 'createdAt', 'updatedAt', 'reviewType', 'notes'
    },
    'leave_requests': {
        'id', 'employeeId', 'managerId', 'leaveType', 'startDate', 'endDate',
        'daysRequested', 'status', 'reason', 'managerComments', 'createdAt', 'updatedAt'
    },
    'event_attendees': {
        'id', 'eventId', 'employeeId', 'responseStatus', 'isRequired', 'createdAt',
        'reminderTime', 'scope', 'isOrganizer'
    },
    'notifications': {
        'id', 'recipientId', 'type', 'category', 'title', 'message',
        'relatedResourceType', 'relatedResourceId', 'readStatus',
        'deliveredAt', 'readAt', 'createdAt'
    }
}

def get_db_columns(table_name):
    """Get columns from PostgreSQL database"""
    try:
        result = subprocess.run([
            'docker', 'exec', 'sveltehr-postgres-dev',
            'psql', '-U', 'postgres', '-d', 'hr_system', '-c',
            f"\\d hr_public.{table_name}"
        ], capture_output=True, text=True)

        columns = set()
        for line in result.stdout.split('\n'):
            # Match column lines
            match = re.match(r'\s+(\w+)\s+\|', line)
            if match:
                columns.add(match.group(1))
        return columns
    except:
        return set()

def camel_to_snake(name):
    """Convert camelCase to snake_case"""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

print("="*80)
print("COMPREHENSIVE SCHEMA ALIGNMENT ANALYSIS")
print("="*80)
print()

mismatches = {}

for table, frontend_fields in FRONTEND_EXPECTATIONS.items():
    print(f"\n{'='*80}")
    print(f"TABLE: {table}")
    print(f"{'='*80}")

    # Get database columns
    db_columns = get_db_columns(table)

    # Convert frontend fields to snake_case for comparison
    frontend_fields_snake = {camel_to_snake(f) for f in frontend_fields}

    # Find missing columns
    missing_in_db = frontend_fields_snake - db_columns
    extra_in_db = db_columns - frontend_fields_snake

    if missing_in_db or extra_in_db:
        mismatches[table] = {
            'missing_in_db': missing_in_db,
            'extra_in_db': extra_in_db,
            'frontend_expects': frontend_fields,
            'db_has': db_columns
        }

    print(f"\nFrontend expects {len(frontend_fields)} fields")
    print(f"Database has {len(db_columns)} columns")

    if missing_in_db:
        print(f"\n❌ MISSING IN DATABASE ({len(missing_in_db)} columns):")
        for col in sorted(missing_in_db):
            # Find original camelCase name
            original = next((f for f in frontend_fields if camel_to_snake(f) == col), col)
            print(f"   - {col} (frontend expects: {original})")

    if extra_in_db:
        print(f"\n⚠️  EXTRA IN DATABASE ({len(extra_in_db)} columns not used by frontend):")
        for col in sorted(extra_in_db):
            print(f"   - {col}")

    if not missing_in_db and not extra_in_db:
        print("\n✅ PERFECT ALIGNMENT")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"\nTables analyzed: {len(FRONTEND_EXPECTATIONS)}")
print(f"Tables with mismatches: {len(mismatches)}")
print(f"Tables perfectly aligned: {len(FRONTEND_EXPECTATIONS) - len(mismatches)}")

if mismatches:
    print("\n" + "="*80)
    print("REQUIRED DATABASE CHANGES")
    print("="*80)

    for table, data in mismatches.items():
        if data['missing_in_db']:
            print(f"\nALTER TABLE hr_public.{table}")
            for col in sorted(data['missing_in_db']):
                # Suggest data type based on column name
                dtype = 'UUID' if col.endswith('_id') else \
                        'TIMESTAMP WITH TIME ZONE' if col.endswith('_at') or col.endswith('_date') or col == 'date' else \
                        'DATE' if col.startswith('start_') or col.startswith('end_') else \
                        'BOOLEAN' if col.startswith('is_') or col.startswith('has_') else \
                        'INTEGER' if 'days' in col or 'hours' in col or 'count' in col else \
                        'TEXT'
                print(f"  ADD COLUMN IF NOT EXISTS {col} {dtype};")
