#!/bin/bash
echo "=== Employee Sync Status ==="
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "
SELECT
  COUNT(*) as total_active,
  COUNT(CASE WHEN intuit_employee_id IS NOT NULL THEN 1 END) as with_qb_id,
  COUNT(CASE WHEN employee_number IS NOT NULL THEN 1 END) as with_emp_number,
  COUNT(CASE WHEN intuit_employee_id IS NULL THEN 1 END) as unlinked
FROM hr_public.users
WHERE deleted_at IS NULL AND is_active = true;"

echo ""
echo "Expected after successful sync:"
echo "- with_qb_id: ~169 (all employees linked)"
echo "- with_emp_number: > 0 (employee numbers pulled from QB)"
echo "- unlinked: 0 (all employees linked)"
