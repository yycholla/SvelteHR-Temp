#!/usr/bin/env bash
# Migration Sequence Fix Script
# Renames all migrations to eliminate duplicate sequences and follow naming convention

set -e

cd /home/chanway/Projects/SvelteHR/migrations

echo "=== Step 1: Rename legacy files to bootstrap date (20250925) ==="
[ -f "01-roles.sql" ] && git mv "01-roles.sql" "20250925_001_create_roles.sql"
[ -f "02-schema.sql" ] && git mv "02-schema.sql" "20250925_002_create_schema.sql"
[ -f "03-data.sql" ] && git mv "03-data.sql" "20250925_003_seed_initial_data.sql"
[ -f "04-indexes.sql" ] && git mv "04-indexes.sql" "20250925_004_create_indexes.sql"
[ -f "03_create_tasks_table.sql" ] && git mv "03_create_tasks_table.sql" "20250925_005_create_tasks_table.sql"
[ -f "04_create_current_user_function.sql" ] && git mv "04_create_current_user_function.sql" "20250925_006_create_current_user_function.sql"
[ -f "05_add_missing_tables.sql" ] && git mv "05_add_missing_tables.sql" "20250925_007_add_missing_tables.sql"
[ -f "06_create_event_attendees.sql" ] && git mv "06_create_event_attendees.sql" "20250925_008_create_event_attendees.sql"
[ -f "07_add_employee_details.sql" ] && git mv "07_add_employee_details.sql" "20250925_009_add_employee_details.sql"

echo "=== Step 2: Rename September 30 files (add sequence numbers) ==="
[ -f "20250930_add_performance_indexes.sql" ] && git mv "20250930_add_performance_indexes.sql" "20250930_001_add_performance_indexes.sql"
[ -f "20250930_add_rls_policies.sql" ] && git mv "20250930_add_rls_policies.sql" "20250930_002_add_rls_policies.sql"
[ -f "20250930_create_hr_reports_table.sql" ] && git mv "20250930_create_hr_reports_table.sql" "20250930_003_create_hr_reports_table.sql"
[ -f "20250930_create_notifications_table.sql" ] && git mv "20250930_create_notifications_table.sql" "20250930_004_create_notifications_table.sql"
[ -f "20250930_validate_schema.sql" ] && git mv "20250930_validate_schema.sql" "20250930_005_validate_schema.sql"

echo "=== Step 3: Fix October 2 duplicates ==="
[ -f "20251002_003_remove_hr_prefix_from_roles.sql" ] && git mv "20251002_003_remove_hr_prefix_from_roles.sql" "20251002_004_remove_hr_prefix_from_roles.sql"
[ -f "20251002_004_cleanup_old_roles.sql" ] && git mv "20251002_004_cleanup_old_roles.sql" "20251002_005_cleanup_old_roles.sql"
[ -f "20251002_004_comprehensive_audit_logging.sql" ] && git mv "20251002_004_comprehensive_audit_logging.sql" "20251002_006_comprehensive_audit_logging.sql"

echo "=== Step 4: Fix October 3 (add missing sequence) ==="
[ -f "20251003_add_historical_data.sql" ] && git mv "20251003_add_historical_data.sql" "20251003_004_add_historical_data.sql"

echo "=== Step 5: Fix October 7 - Renumber document migrations (biggest fix) ==="
# Events stay as 001-013, documents get renumbered to 014-022

# Document migrations (renumber from their current positions to 014-022)
[ -f "20251007_001_add_review_types_metadata.sql" ] && git mv "20251007_001_add_review_types_metadata.sql" "20251007_014_add_review_types_metadata.sql"
[ -f "20251007_008_create_documents_table.sql" ] && git mv "20251007_008_create_documents_table.sql" "20251007_015_create_documents_table.sql"
[ -f "20251007_009_create_document_assignments.sql" ] && git mv "20251007_009_create_document_assignments.sql" "20251007_016_create_document_assignments.sql"
[ -f "20251007_010_create_access_logs.sql" ] && git mv "20251007_010_create_access_logs.sql" "20251007_017_create_access_logs.sql"
[ -f "20251007_011_create_document_categories.sql" ] && git mv "20251007_011_create_document_categories.sql" "20251007_018_create_document_categories.sql"
[ -f "20251007_012_add_encryption_keys.sql" ] && git mv "20251007_012_add_encryption_keys.sql" "20251007_019_add_encryption_keys.sql"
[ -f "20251007_013_create_document_versions.sql" ] && git mv "20251007_013_create_document_versions.sql" "20251007_020_create_document_versions.sql"
[ -f "20251007_014_add_rls_policies.sql" ] && git mv "20251007_014_add_rls_policies.sql" "20251007_021_add_rls_policies.sql"
[ -f "20251007_015_add_document_indexes.sql" ] && git mv "20251007_015_add_document_indexes.sql" "20251007_022_add_document_indexes.sql"

echo "=== Step 6: Fix October 9 task system (internal duplicates) ==="
# Fix the duplicate sequence 001
[ -f "20251009_001_add_task_assignees_junction.sql" ] && git mv "20251009_001_add_task_assignees_junction.sql" "20251009_002_add_task_assignees_junction.sql"

# Renumber everything after
[ -f "20251009_002_create_task_types_table.sql" ] && git mv "20251009_002_create_task_types_table.sql" "20251009_003_create_task_types_table.sql"
[ -f "20251009_003_create_tasks_table.sql" ] && git mv "20251009_003_create_tasks_table.sql" "20251009_004_create_tasks_table.sql"
[ -f "20251009_004_create_task_audit_entries.sql" ] && git mv "20251009_004_create_task_audit_entries.sql" "20251009_005_create_task_audit_entries.sql"
[ -f "20251009_005_create_task_dependencies.sql" ] && git mv "20251009_005_create_task_dependencies.sql" "20251009_006_create_task_dependencies.sql"
[ -f "20251009_006_create_linked_resources.sql" ] && git mv "20251009_006_create_linked_resources.sql" "20251009_007_create_linked_resources.sql"
[ -f "20251009_007_create_rls_policies.sql" ] && git mv "20251009_007_create_rls_policies.sql" "20251009_008_create_rls_policies.sql"

echo "=== Step 7: Remove/move special files ==="
[ -f "apply_new_task_schema.sql" ] && git rm "apply_new_task_schema.sql"
[ -f "seed-development-data.sql" ] && git mv "seed-development-data.sql" "../seeds/development-data.sql"

echo "✅ Migration renaming complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes with: git status"
echo "2. Run validation: npm run db:validate-migrations"
echo "3. If validation passes, commit changes"
