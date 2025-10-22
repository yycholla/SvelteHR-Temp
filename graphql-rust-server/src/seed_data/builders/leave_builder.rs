//! Leave Builder
//!
//! Seeds leave types, leave balances, and leave requests

use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::leave::leave_type;
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Fixed leave types for the system
const LEAVE_TYPES: &[(&str, f64, &str)] = &[
    ("Annual Leave", 20.0, "Standard annual vacation days"),
    ("Sick Leave", 10.0, "Medical and health-related absences"),
    ("Personal Leave", 5.0, "Personal days for family or personal matters"),
    ("Parental Leave", 60.0, "Maternity and paternity leave"),
    ("Bereavement Leave", 3.0, "Time off for family bereavement"),
    ("Public Holiday", 0.0, "Statutory public holidays"),
    ("Unpaid Leave", 0.0, "Leave without pay"),
];

/// Seed leave types into the database
///
/// Uses skip-existing strategy based on leave type name.
pub async fn seed_leave_types(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("leave_types");

    for (name, default_days, description) in LEAVE_TYPES {
        // Check if leave type already exists (idempotency)
        let existing = leave_type::Entity::find()
            .filter(leave_type::Column::Name.eq(*name))
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            tracing::debug!("Leave type '{}' already exists, skipping", name);
            continue;
        }

        // Create new leave type
        let leave_type_id = Uuid::new_v4();
        let new_leave_type = leave_type::ActiveModel {
            id: Set(leave_type_id),
            name: Set(name.to_string()),
            default_days: Set(*default_days),
            description: Set(Some(description.to_string())),
            is_active: Set(true),
            ..Default::default()
        };

        match new_leave_type.insert(db).await {
            Ok(_) => {
                result.created_count += 1;
                tracing::info!("Created leave type: {}", name);

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "leave_type", leave_type_id).await {
                    tracing::warn!("Failed to log audit entry for leave type {}: {}", name, e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result.errors.push(format!("Failed to create leave type {}: {}", name, e));
                tracing::error!("Failed to create leave type {}: {}", name, e);
            }
        }
    }

    Ok(result)
}

/// Seed leave balances for all active users (user × leave_type matrix)
///
/// Creates a leave balance entry for each user × leave_type combination.
/// Uses the leave type's default_days as the initial balance.
pub async fn seed_leave_balances(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("leave_balances");

    // Get all active users
    let users = crate::models::user::Entity::find()
        .filter(crate::models::user::Column::IsActive.eq(true))
        .filter(crate::models::user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result.errors.push("No users found for leave balance creation".to_string());
        return Ok(result);
    }

    // Get all active leave types
    let leave_types = leave_type::Entity::find()
        .filter(leave_type::Column::IsActive.eq(true))
        .all(db)
        .await?;

    if leave_types.is_empty() {
        result.errors.push("No leave types found for leave balance creation".to_string());
        return Ok(result);
    }

    // Create leave balance for each user × leave_type combination
    for user_model in &users {
        for lt in &leave_types {
            // Check if leave balance already exists (idempotency)
            let existing = crate::models::leave::leave_balance::Entity::find()
                .filter(crate::models::leave::leave_balance::Column::UserId.eq(user_model.id))
                .filter(crate::models::leave::leave_balance::Column::LeaveTypeId.eq(lt.id))
                .one(db)
                .await?;

            if existing.is_some() {
                result.skipped_count += 1;
                continue;
            }

            // Create new leave balance with default days
            let balance_id = Uuid::new_v4();
            let now = chrono::Utc::now();
            let new_balance = crate::models::leave::leave_balance::ActiveModel {
                id: Set(balance_id),
                user_id: Set(user_model.id),
                leave_type_id: Set(lt.id),
                total_days: Set(lt.default_days),
                used_days: Set(0.0),
                remaining_days: Set(lt.default_days),
                year: Set(now.year() as i32),
                created_at: Set(now),
                updated_at: Set(now),
                deleted_at: Set(None),
            };

            match new_balance.insert(db).await {
                Ok(_) => {
                    result.created_count += 1;

                    // Log to audit system
                    if let Err(e) = log_seed_creation(db, context, "leave_balance", balance_id).await {
                        tracing::warn!("Failed to log audit entry for leave balance: {}", e);
                    }
                }
                Err(e) => {
                    result.failed_count += 1;
                    result.errors.push(format!("Failed to create leave balance: {}", e));
                }
            }
        }
    }

    tracing::info!(
        "Created {} leave balances for {} users × {} leave types",
        result.created_count,
        users.len(),
        leave_types.len()
    );

    Ok(result)
}

// TODO: seed_leave_requests() in Phase 6
