# Quickstart Guide: Comprehensive Sample Data System

**Feature**: Comprehensive Sample Data System
**Branch**: 018-please-put-10
**Date**: 2025-10-01

## Overview

This quickstart guide validates the complete sample data generation system for SvelteHR. It covers installation, configuration, data generation, and verification across different development environments.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- SvelteHR backend set up with PostGraphile
- Access to `hr_public` schema
- Make command available

## Quick Start (3 Minutes)

### 1. Generate Sample Data

```bash
# From repository root
make dev-sample-data
```

**Expected Output**:
```
Generating sample data...
🔍 Discovering database schema... ✓ (15 tables found)
📊 Building dependency graph... ✓
🎯 Generating 750+ sample records...
  ├── Users (50 records)... ✓
  ├── Departments (50 records)... ✓
  ├── Employees (50 records)... ✓
  ├── Performance Reviews (30 records)... ✓
  ├── Employee Goals (20 records)... ✓
  ├── Time Off Requests (20 records)... ✓
  └── [Additional tables]... ✓
✅ Sample data generation complete! (3.2s)
   📈 Created: 742 records
   🔄 Updated: 8 records
   ⚡ No errors
```

### 2. Verify Data in Application

```bash
# Start the development server
npm run dev

# Navigate to key pages:
# - http://localhost:5173/dashboard (should show employee metrics)
# - http://localhost:5173/dashboard/management/goals (should show sample goals)
# - http://localhost:5173/dashboard/management/leave-approvals (should show leave requests)
```

### 3. Check Sample Data Status

```bash
make sample-data-status
```

**Expected Output**:
```
Sample Data Status Report
=======================
✓ Sample data detected: Yes
📊 Tables with sample data: 15/15
🗓️  Last generated: 2025-10-01 10:30:45

Table Statistics:
┌─────────────────────┬─────────┬───────┬──────────┐
│ Table               │ Sample  │ Total │ Priority │
├─────────────────────┼─────────┼───────┼──────────┤
│ users               │ 50      │ 52    │ CORE     │
│ departments         │ 50      │ 53    │ CORE     │
│ employees           │ 50      │ 52    │ SECONDARY│
│ performance_reviews │ 30      │ 35    │ AUXILIARY│
│ employee_goals      │ 20      │ 24    │ AUXILIARY│
│ time_off_requests   │ 20      │ 28    │ AUXILIARY│
└─────────────────────┴─────────┴───────┴──────────┘

Overall: 742 sample records across 15 tables
```

## Detailed Workflow Validation

### Scenario 1: Fresh Database Setup

**Goal**: Validate sample data generation on an empty database.

```bash
# 1. Reset database (WARNING: This deletes all data)
make clean-sample-data --force

# 2. Generate fresh sample data
make dev-sample-data

# 3. Verify all tables populated
npm run sample-data-status --detailed
```

**Success Criteria**:
- All 15 tables have expected record counts
- No foreign key constraint violations
- All sample records use obvious naming patterns
- Generation completes in under 5 seconds

### Scenario 2: Incremental Data Addition

**Goal**: Validate merging behavior with existing data.

```bash
# 1. Start with existing sample data
make sample-data-status

# 2. Add new sample data
make dev-sample-data

# 3. Verify merge behavior
npm run sample-data-status --format=json > after.json
```

**Success Criteria**:
- No duplicate sample records created
- Existing sample records updated with deterministic data
- Non-sample records preserved unchanged
- Total sample record count matches expected values

### Scenario 3: Cross-Machine Consistency

**Goal**: Validate identical results across different environments.

```bash
# Machine A
make dev-sample-data > output_a.log
npm run sample-data-status --format=json > status_a.json

# Machine B (different OS/environment)
make dev-sample-data > output_b.log
npm run sample-data-status --format=json > status_b.json

# Compare results
diff status_a.json status_b.json
```

**Success Criteria**:
- Identical record counts across machines
- Same sample data IDs and naming patterns
- Same foreign key relationships
- Deterministic generation confirmed

### Scenario 4: Error Recovery

**Goal**: Validate error handling and recovery mechanisms.

```bash
# 1. Simulate database constraint violation
# (Temporarily modify a constraint)

# 2. Attempt sample data generation
make dev-sample-data

# 3. Verify error reporting
echo $? # Should be non-zero exit code

# 4. Fix constraint and retry
make dev-sample-data
```

**Success Criteria**:
- Clear error messages for constraint violations
- Partial success does not corrupt existing data
- Retry succeeds after fixing issues
- Transaction rollback prevents inconsistent state

## Advanced Usage

### Custom Configuration

```bash
# Generate with custom seed
SAMPLE_DATA_SEED=54321 make dev-sample-data

# Generate specific tables only
npm run generate-sample-data --tables=employees,departments

# Dry run mode
npm run generate-sample-data --dry-run
```

### Configuration File

Create `backend/config/sample-data.json`:

```json
{
  "version": "1.0.0",
  "config": {
    "seed": 12345,
    "batchSize": 100,
    "progressReporting": true,
    "tableConfigs": [
      {
        "tableName": "employees",
        "recordCount": 50,
        "priority": 2,
        "namingPattern": "Sample Employee {id:3}",
        "customFields": {},
        "skipIfExists": false
      }
    ]
  },
  "metadata": {
    "createdAt": "2025-10-01T00:00:00Z",
    "lastModified": "2025-10-01T00:00:00Z",
    "description": "Sample data configuration for SvelteHR development"
  }
}
```

### Performance Testing

```bash
# Generate large dataset
SAMPLE_DATA_BATCH_SIZE=500 make dev-sample-data

# Monitor memory usage
npm run generate-sample-data --verbose

# Time the operation
time make dev-sample-data
```

## Troubleshooting

### Common Issues

**Issue**: `make: command not found`
```bash
# Use npm script directly
cd backend && npm run generate-sample-data
```

**Issue**: Database connection failed
```bash
# Check environment variables
echo $DATABASE_URL
echo $GRAPHQL_ENDPOINT

# Test database connectivity
npm run discover-schema
```

**Issue**: Foreign key constraint violations
```bash
# Validate schema first
npm run validate-sample-config --check-schema

# Check table dependencies
npm run discover-schema --include-relations
```

**Issue**: Memory or performance problems
```bash
# Reduce batch size
npm run generate-sample-data --batch-size=50

# Generate tables incrementally
npm run generate-sample-data --tables=users
npm run generate-sample-data --tables=departments
```

### Debug Mode

```bash
# Enable verbose logging
SAMPLE_DATA_DEBUG=true make dev-sample-data

# Check specific table generation
npm run generate-sample-data --tables=employees --verbose
```

## Integration Test Scenarios

### Test 1: Full Workflow Integration

```bash
#!/bin/bash
# Full integration test script

echo "=== SvelteHR Sample Data Integration Test ==="

# Clean slate
make clean-sample-data --force

# Generate data
make dev-sample-data
if [ $? -ne 0 ]; then
  echo "❌ Sample data generation failed"
  exit 1
fi

# Verify in application
npm run dev &
SERVER_PID=$!
sleep 5

# Test key endpoints
curl -f http://localhost:5173/dashboard || {
  echo "❌ Dashboard not accessible"
  kill $SERVER_PID
  exit 1
}

kill $SERVER_PID

# Verify data consistency
npm run sample-data-status --format=json | jq '.data.overallStats.totalSampleRecords' | grep -q "7[0-9][0-9]" || {
  echo "❌ Unexpected sample record count"
  exit 1
}

echo "✅ All integration tests passed"
```

### Test 2: Performance Validation

```bash
# Performance benchmark
start_time=$(date +%s%3N)
make dev-sample-data >/dev/null 2>&1
end_time=$(date +%s%3N)
duration=$((end_time - start_time))

if [ $duration -gt 5000 ]; then
  echo "⚠️ Generation took ${duration}ms (target: <5000ms)"
else
  echo "✅ Performance target met: ${duration}ms"
fi
```

## Validation Checklist

- [ ] Sample data generates successfully with `make dev-sample-data`
- [ ] All 15+ database tables populated with appropriate record counts
- [ ] Sample records use obvious naming patterns (Sample Employee 001, etc.)
- [ ] Foreign key relationships maintained correctly
- [ ] Generation completes in under 5 seconds
- [ ] Status command shows accurate statistics
- [ ] Application pages display sample data correctly
- [ ] Incremental generation merges properly with existing data
- [ ] Cross-machine consistency verified
- [ ] Error scenarios handled gracefully
- [ ] Memory usage remains under 100MB during generation
- [ ] Cleanup command removes only sample data
- [ ] Configuration validation works correctly
- [ ] Schema discovery identifies all tables and relationships

## Next Steps

After validating the quickstart:

1. **Development Workflow**: Use `make dev-sample-data` for new environment setup
2. **Testing Integration**: Include sample data generation in CI/CD pipelines
3. **Team Onboarding**: Share quickstart guide with new developers
4. **Performance Monitoring**: Track generation times across different environments
5. **Configuration Management**: Customize table configurations for specific testing needs

---

**Quickstart Guide Complete**: All validation scenarios and usage patterns documented for immediate implementation and testing.