#!/bin/bash
# Script to run initial employee sync from QuickBooks
# This establishes the links and pulls employee_number for all employees

echo "=== Running Initial QuickBooks Employee Sync ==="
echo ""
echo "This will:"
echo "1. Pull ALL employees from QuickBooks"
echo "2. Match them to local employees by email"
echo "3. Update intuit_employee_id for matched employees"
echo "4. Pull employee_number from QuickBooks"
echo ""

# Run the GraphQL mutation
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { intuit { syncAllEmployees } }"
  }' | jq '.'

echo ""
echo "=== Checking Results ==="

# Check how many employees now have QuickBooks IDs and employee numbers
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "
SELECT
  COUNT(*) as total_active,
  COUNT(CASE WHEN intuit_employee_id IS NOT NULL THEN 1 END) as with_qb_id,
  COUNT(CASE WHEN employee_number IS NOT NULL THEN 1 END) as with_emp_number
FROM hr_public.users
WHERE deleted_at IS NULL AND is_active = true;"

echo ""
echo "=== Done ==="
echo "If employee_number count is > 0, you can now run bidirectional sync!"
