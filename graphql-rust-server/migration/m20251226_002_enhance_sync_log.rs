//! # Enhance Sync Log with Detailed Tracking Metrics
//!
//! This migration extends the intuit_sync_log table with comprehensive tracking
//! fields for bidirectional sync operations, conflict management, retry logic,
//! and detailed sync statistics. Enables robust monitoring and debugging of
//! QuickBooks synchronization operations.
//!
//! ## SeaORM Builder Usage
//! **Conversion: 100% MigrationHelpers (idempotent operations)**
//! - Uses MigrationHelpers::add_columns_if_not_exist for batch column additions
//! - Uses MigrationHelpers::execute_idempotent for batch column drops
//!
//! ## Operations Summary
//!
//! ### Sync Direction & Conflict Tracking (3 columns):
//! 1. **change_direction** (TEXT, nullable) - Sync direction: 'push', 'pull', 'bidirectional'
//! 2. **conflict_detected** (BOOLEAN, NOT NULL, default: FALSE) - Flag for detected conflicts
//! 3. **conflict_resolution** (TEXT, nullable) - Resolution strategy: 'local_wins', 'remote_wins', 'manual'
//!
//! ### Sync Statistics (6 columns):
//! 4. **pushed_count** (INTEGER, NOT NULL, default: 0) - Records pushed to QuickBooks
//! 5. **pulled_count** (INTEGER, NOT NULL, default: 0) - Records pulled from QuickBooks
//! 6. **updated_count** (INTEGER, NOT NULL, default: 0) - Records updated (bidirectional)
//! 7. **skipped_count** (INTEGER, NOT NULL, default: 0) - Records skipped (unchanged)
//!
//! ### Retry & Error Recovery (2 columns):
//! 8. **retry_count** (INTEGER, NOT NULL, default: 0) - Number of retry attempts
//! 9. **next_retry_at** (TIMESTAMPTZ, nullable) - Scheduled retry timestamp
//!
//! ### QuickBooks Metadata (1 column):
//! 10. **quickbooks_metadata** (JSONB, nullable) - Raw QB API response, rate limits, warnings
//!
//! ## Migration Strategy
//! - **Idempotent**: All operations use IF NOT EXISTS/IF EXISTS guards
//! - **Batch Operations**: All 10 columns added in single ALTER TABLE (performance)
//! - **Zero Downtime**: All columns nullable or have defaults
//! - **Rollback Safe**: Down migration drops columns in reverse order
//!
//! ## Sync Monitoring Workflows
//!
//! ### Sync Performance Analysis:
//! ```sql
//! -- Calculate sync efficiency
//! SELECT
//!   change_direction,
//!   AVG(pushed_count + pulled_count + updated_count) as avg_changes,
//!   AVG(skipped_count) as avg_skipped,
//!   AVG(retry_count) as avg_retries
//! FROM hr_public.intuit_sync_log
//! WHERE status = 'completed'
//! GROUP BY change_direction;
//! ```
//!
//! ### Conflict Detection & Resolution:
//! ```sql
//! -- Find unresolved conflicts
//! SELECT * FROM hr_public.intuit_sync_log
//! WHERE conflict_detected = TRUE
//! AND conflict_resolution IS NULL
//! ORDER BY created_at DESC;
//! ```
//!
//! ### Retry Queue Management:
//! ```sql
//! -- Find sync logs ready for retry
//! SELECT * FROM hr_public.intuit_sync_log
//! WHERE status = 'error'
//! AND next_retry_at <= NOW()
//! AND retry_count < 3
//! ORDER BY next_retry_at ASC;
//! ```
//!
//! ### QuickBooks Metadata Analysis:
//! ```sql
//! -- Extract rate limit info from QB metadata
//! SELECT
//!   id,
//!   quickbooks_metadata->>'requestId' as request_id,
//!   quickbooks_metadata->>'rateLimitRemaining' as rate_limit
//! FROM hr_public.intuit_sync_log
//! WHERE quickbooks_metadata IS NOT NULL;
//! ```
//!
//! ## Change Direction Values
//! - **push**: Local to QuickBooks (HR → QB)
//! - **pull**: QuickBooks to Local (QB → HR)
//! - **bidirectional**: Two-way sync with conflict resolution
//! - **NULL**: Legacy sync logs (pre-migration)
//!
//! ## Conflict Resolution Strategies
//! - **local_wins**: Prefer local HR data (override QB)
//! - **remote_wins**: Prefer QuickBooks data (override local)
//! - **manual**: Requires human intervention
//! - **latest_timestamp**: Use most recently modified version
//! - **NULL**: No conflict or unresolved
//!
//! ## Retry Strategy
//! - **retry_count**: Incremented on each retry attempt
//! - **next_retry_at**: Exponential backoff (5min, 15min, 1hr)
//! - **Max retries**: 3 attempts before manual intervention required
//! - **Status**: 'error' → retry → 'completed' or 'failed'
//!
//! ## QuickBooks Metadata Schema (JSONB)
//! ```json
//! {
//!   "requestId": "uuid",
//!   "rateLimitRemaining": 450,
//!   "rateLimitTotal": 500,
//!   "syncToken": "12",
//!   "warnings": ["field_deprecated", "value_truncated"],
//!   "responseTime": 234
//! }
//! ```
//!
//! ## Related Migrations
//! - m20251222_create_intuit_integration: Creates base intuit_sync_log table
//! - m20251226_001_add_sync_tracking: Adds entity-level sync tracking
//! - m20251229_004_incremental_sync: Uses change_direction for incremental syncs
//! - m20251229_005_create_sync_health_monitoring: Aggregates sync statistics
//!
//! ## Performance Impact
//! - **No new indexes**: Statistics columns used for reporting only
//! - **JSONB storage**: Efficient storage for variable QB metadata
//! - **Integer counters**: Minimal storage overhead
//! - **Nullable timestamps**: No storage when retry not needed

use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification: Add enhanced tracking fields to intuit_sync_log table
        // Enables bidirectional sync tracking, conflict management, and retry logic
        MigrationHelpers::add_columns_if_not_exist(
            manager,
            "hr_public.intuit_sync_log",
            &[
                "change_direction TEXT", // push, pull, bidirectional
                "conflict_detected BOOLEAN NOT NULL DEFAULT FALSE", // Conflict flag
                "conflict_resolution TEXT", // local_wins, remote_wins, manual
                "pushed_count INTEGER NOT NULL DEFAULT 0", // Records pushed to QB
                "pulled_count INTEGER NOT NULL DEFAULT 0", // Records pulled from QB
                "updated_count INTEGER NOT NULL DEFAULT 0", // Records updated
                "skipped_count INTEGER NOT NULL DEFAULT 0", // Records skipped (unchanged)
                "retry_count INTEGER NOT NULL DEFAULT 0", // Number of retry attempts
                "next_retry_at TIMESTAMPTZ", // Scheduled retry timestamp
                "quickbooks_metadata JSONB", // Raw QB API response metadata
            ],
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Drop enhanced tracking fields from intuit_sync_log table
        // Drops in reverse order for clarity (matches addition order)
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.intuit_sync_log
                DROP COLUMN IF EXISTS quickbooks_metadata,
                DROP COLUMN IF EXISTS next_retry_at,
                DROP COLUMN IF EXISTS retry_count,
                DROP COLUMN IF EXISTS skipped_count,
                DROP COLUMN IF EXISTS updated_count,
                DROP COLUMN IF EXISTS pulled_count,
                DROP COLUMN IF EXISTS pushed_count,
                DROP COLUMN IF EXISTS conflict_resolution,
                DROP COLUMN IF EXISTS conflict_detected,
                DROP COLUMN IF EXISTS change_direction",
            "Drop enhanced tracking fields from intuit_sync_log",
        )
        .await?;

        Ok(())
    }
}
