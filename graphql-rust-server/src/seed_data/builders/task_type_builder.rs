//! Task Type Builder
//!
//! Seeds common task types with colors and priorities

use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::tasks::task_type;
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Pre-defined task types with colors and priorities
const DEFAULT_TASK_TYPES: &[(&str, &str, &str, &str)] = &[
    // (name, description, color_code, default_priority)
    (
        "Bug",
        "Software defects and issues that need fixing",
        "#EF4444",
        "high",
    ),
    (
        "Feature",
        "New functionality or capability requests",
        "#3B82F6",
        "medium",
    ),
    (
        "Enhancement",
        "Improvements to existing features",
        "#10B981",
        "medium",
    ),
    (
        "Documentation",
        "Documentation tasks and updates",
        "#8B5CF6",
        "low",
    ),
    (
        "Maintenance",
        "Code maintenance and refactoring",
        "#F59E0B",
        "medium",
    ),
    (
        "Research",
        "Research and investigation tasks",
        "#06B6D4",
        "medium",
    ),
];

/// Seed default task types
///
/// Creates 6 common task types with appropriate colors and priorities
pub async fn seed_task_types(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("task_types");

    for (name, description, color_code, default_priority) in DEFAULT_TASK_TYPES {
        // Check if task type already exists by name
        let existing = task_type::Entity::find()
            .filter(task_type::Column::Name.eq(*name))
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            tracing::debug!("Task type '{}' already exists, skipping", name);
            continue;
        }

        let task_type_id = Uuid::new_v4();
        let now = Utc::now();

        let new_task_type = task_type::ActiveModel {
            id: Set(task_type_id),
            name: Set(name.to_string()),
            description: Set(Some(description.to_string())),
            default_priority: Set(Some(default_priority.to_string())),
            color_code: Set(Some(color_code.to_string())),
            is_active: Set(true),
            created_at: Set(now),
            updated_at: Set(now),
        };

        match new_task_type.insert(db).await {
            Ok(_) => {
                result.created_count += 1;
                tracing::info!("Created task type: {} ({})", name, color_code);

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "task_type", task_type_id).await {
                    tracing::warn!("Failed to log audit entry for task type {}: {}", name, e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result
                    .errors
                    .push(format!("Failed to create task type {}: {}", name, e));
                tracing::error!("Failed to create task type {}: {}", name, e);
            }
        }
    }

    Ok(result)
}
