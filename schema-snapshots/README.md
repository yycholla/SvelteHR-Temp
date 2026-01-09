# Schema Snapshots

This directory contains authoritative baseline schema snapshots used for drift detection.

## Purpose

The baseline schema snapshot (`baseline-schema.json`) represents the **expected state** of the database as defined by our migrations in version control. The drift detection system compares the live database against this baseline to identify any differences.

## Workflow

### 1. Creating a Baseline Snapshot

When you want to capture the current database schema as the new baseline:

```bash
npm run db:snapshot
```

This creates/updates `baseline-schema.json` with the current database schema.

### 2. Committing the Baseline

**Important:** The baseline snapshot MUST be committed to version control so all developers use the same baseline:

```bash
git add schema-snapshots/baseline-schema.json
git commit -m "feat: update baseline schema snapshot"
git push
```

### 3. Running Drift Detection

To check if the live database matches the baseline:

```bash
npm run db:verify
```

This will:

- Load the baseline from `baseline-schema.json`
- Capture the current database schema
- Compare them and report differences
- Exit with code 0 (PASS), 1 (WARN/FAIL), or 2 (ERROR)

## When to Update the Baseline

Update the baseline snapshot when:

1. **After applying new migrations** - Once new migrations are tested and verified
2. **During migration development** - To capture incremental schema changes
3. **After schema corrections** - When fixing drift or inconsistencies

## Drift Detection Verdicts

- **✅ PASS**: No differences found - database matches baseline
- **⚠️ WARN**: Minor differences detected (extra columns, indexes)
- **❌ FAIL**: Critical differences (missing/extra tables, column type changes)
- **❌ ERROR**: Comparison failed due to system error

## Multi-Machine Consistency

**Critical:** All developers must use the SAME baseline snapshot. This is why `baseline-schema.json` is committed to git.

If you pull changes that include a new baseline:

```bash
git pull
npm run db:verify  # Check if your local DB matches the new baseline
```

## File Structure

```
schema-snapshots/
├── baseline-schema.json  # Authoritative baseline (committed to git)
└── README.md            # This file
```

## Troubleshooting

### "Baseline schema snapshot not found!"

**Solution:** Create the baseline:

```bash
npm run db:snapshot
git add schema-snapshots/baseline-schema.json
git commit -m "feat: add baseline schema snapshot"
```

### Drift detected after git pull

**Cause:** Your local database is out of sync with the new baseline.

**Solution:** Apply missing migrations or rebuild your database:

```bash
# Option 1: Apply migrations
npm run db:migrate  # If you have this script

# Option 2: Rebuild database
npm run db:reset  # If you have this script
npm run db:init
```

### Machines have different baselines

**Cause:** Baseline not committed to git or different branches.

**Solution:** Ensure baseline is committed and pulled on all machines:

```bash
git pull origin main
npm run db:verify
```
