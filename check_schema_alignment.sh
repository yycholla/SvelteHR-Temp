#!/bin/bash

# Script to check database schema alignment
# For each table, show: DB columns, Rust struct fields, and common queries

TABLES=("notifications" "tasks" "events" "leave_requests" "performance_reviews" "event_attendees" "time_off_balances" "attendance_records")

for table in "${TABLES[@]}"; do
    echo "========================================"
    echo "TABLE: $table"
    echo "========================================"

    # Show database columns
    echo ""
    echo "DATABASE COLUMNS:"
    docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "\d hr_public.$table" 2>&1 | grep -A 100 "Column" | head -30

    echo ""
    echo "----------------------------------------"
done
