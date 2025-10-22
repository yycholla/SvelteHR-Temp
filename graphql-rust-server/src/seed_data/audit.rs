//! Audit Logging Integration
//!
//! Helper functions for creating activity log entries during seed operations.

use chrono::Utc;
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set};
use serde_json::json;
use uuid::Uuid;

use super::context::SeedContext;
use super::Result;
use crate::models::system::activity_log;

/// Log a seed data creation operation to the activity log
pub async fn log_seed_creation(
    db: &DatabaseConnection,
    context: &SeedContext,
    resource_type: &str,
    resource_id: Uuid,
) -> Result<()> {
    if !context.config.enable_audit_logging {
        return Ok(());
    }

    let log = activity_log::ActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(context.system_user_id),
        employee_id: Set(None),
        action: Set("CREATE".to_string()),
        resource_type: Set(resource_type.to_string()),
        resource_id: Set(Some(resource_id)),
        details: Set(Some(json!({
            "source": "seed_data",
            "batch_id": context.batch_id.to_string()
        }))),
        before_snapshot: Set(None),
        after_snapshot: Set(None),
        is_rollback: Set(false),
        rolled_back_log_id: Set(None),
        ip_address: Set(Some("127.0.0.1".to_string())),
        user_agent: Set(Some("seed-data-binary".to_string())),
        signature_id: Set(None),
        batch_id: Set(Some(context.batch_id)),
        created_at: Set(Utc::now()),
    };

    log.insert(db).await?;
    Ok(())
}
