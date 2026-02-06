//! Department Builder
//!
//! Seeds departments with two-phase approach to resolve Department ↔ User circular dependency:
//! Phase 1: Create departments with manager_id=NULL
//! Phase 2 (after users created): Update departments with actual manager_id

use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::department;
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Fixed departments for the organization
const DEPARTMENTS: &[(&str, &str)] = &[
    ("Engineering", "Software development and technical infrastructure"),
    ("Human Resources", "Employee relations, recruitment, and compliance"),
    ("Finance", "Financial planning, accounting, and payroll"),
    ("Marketing", "Brand management, campaigns, and market research"),
    ("Sales", "Customer acquisition and revenue generation"),
    ("Operations", "Business operations and process optimization"),
    ("Product Management", "Product strategy and roadmap planning"),
    ("Customer Support", "Customer service and technical support"),
    ("Legal", "Legal compliance and contract management"),
    ("IT", "Information technology infrastructure and support"),
];

/// Seed departments into the database (Phase 1: without managers)
///
/// Creates departments with manager_id=NULL to avoid circular dependency.
/// Call update_department_managers() after users are seeded to assign actual managers.
pub async fn seed_departments(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("departments");

    for (name, description) in DEPARTMENTS {
        // Check if department already exists (idempotency)
        let existing = department::Entity::find()
            .filter(department::Column::Name.eq(*name))
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            tracing::debug!("Department '{}' already exists, skipping", name);
            continue;
        }

        // Create new department (manager_id=NULL initially)
        let dept_id = Uuid::new_v4();
        let now = Utc::now();
        let new_department = department::ActiveModel {
            id: Set(dept_id),
            name: Set(name.to_string()),
            description: Set(Some(description.to_string())),
            parent_department_id: Set(None),
            manager_id: Set(None), // Will be updated after users are created
            intuit_department_id: Set(None),
            last_synced_at: Set(None),
            last_modified_at: Set(now),
            quickbooks_sync_token: Set(None),
            sync_status: Set("synced".to_string()),
            ancestor_ids: Set(vec![]), // Root departments have no ancestors
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_department.insert(db).await {
            Ok(_) => {
                result.created_count += 1;
                tracing::info!("Created department: {}", name);

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "department", dept_id).await {
                    tracing::warn!("Failed to log audit entry for department {}: {}", name, e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result
                    .errors
                    .push(format!("Failed to create department {}: {}", name, e));
                tracing::error!("Failed to create department {}: {}", name, e);
            }
        }
    }

    Ok(result)
}

/// Update department managers after users are seeded (Phase 2)
///
/// Assigns manager_id to departments by finding appropriate users.
/// Uses department name matching to assign managers (e.g., Engineering → first Engineer role user).
pub async fn update_department_managers(
    db: &DatabaseConnection,
    _context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("department_managers");

    // Find all departments without managers
    let departments = department::Entity::find()
        .filter(department::Column::ManagerId.is_null())
        .filter(department::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    for dept in departments {
        // Find first active user in this department to be manager
        let potential_manager = crate::models::user::Entity::find()
            .filter(crate::models::user::Column::DepartmentId.eq(dept.id))
            .filter(crate::models::user::Column::IsActive.eq(true))
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(db)
            .await?;

        if let Some(manager) = potential_manager {
            // Update department with manager_id
            let mut dept_active: department::ActiveModel = dept.into();
            dept_active.manager_id = Set(Some(manager.id));
            dept_active.updated_at = Set(Utc::now());

            match dept_active.update(db).await {
                Ok(_) => {
                    result.created_count += 1;
                    tracing::info!("Assigned manager {} to department", manager.display_name);
                }
                Err(e) => {
                    result.failed_count += 1;
                    result
                        .errors
                        .push(format!("Failed to update department manager: {}", e));
                    tracing::error!("Failed to update department manager: {}", e);
                }
            }
        } else {
            result.skipped_count += 1;
            tracing::debug!("No users found for department, skipping manager assignment");
        }
    }

    Ok(result)
}
