//! User Builder
//!
//! Seeds users with realistic names, emails, and role assignments using fake-rs

use chrono::{Duration, Utc};
use fake::faker::name::en::{FirstName, LastName};
use fake::faker::phone_number::en::PhoneNumber;
use fake::Fake;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::{department, role, user, user_role_assignment};
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::config::EntityType;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Pre-computed bcrypt hash for "admin123" (work factor 10)
/// All seeded users will use this password for easy testing
const DEFAULT_PASSWORD_HASH: &str =
    "$2b$10$RAc0JwycgH8Hpq8lRmmb.OXArEiS5Pklvzm5j4RqdQAw5zsNlH8JG";

/// Seed users with realistic data
///
/// Creates 10-50 users (based on config) with:
/// - Realistic names via fake-rs
/// - Email pattern: firstname.lastname@mountainhr.dev
/// - Random department assignments
/// - Manager hierarchy (some users have managers)
/// - Default password: "password123"
pub async fn seed_users(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("users");
    let target_count = context.config.get_target_count(EntityType::Users);

    // Get all departments for assignment
    let departments = department::Entity::find()
        .filter(department::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if departments.is_empty() {
        result.errors.push("No departments found for user assignment".to_string());
        return Ok(result);
    }

    // Check existing user count
    let existing_count = user::Entity::find()
        .filter(user::Column::DeletedAt.is_null())
        .count(db)
        .await? as usize;

    if existing_count >= target_count {
        result.skipped_count = target_count;
        tracing::info!("Already have {} users, skipping", existing_count);
        return Ok(result);
    }

    let users_to_create = target_count - existing_count;

    for i in 0..users_to_create {
        let first_name: String = FirstName().fake();
        let last_name: String = LastName().fake();
        let email = format!(
            "{}.{}@mountainhr.dev",
            first_name.to_lowercase(),
            last_name.to_lowercase()
        );

        // Check if user with this email already exists
        let existing = user::Entity::find()
            .filter(user::Column::Email.eq(&email))
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            tracing::debug!("User with email '{}' already exists, skipping", email);
            continue;
        }

        let user_id = Uuid::new_v4();
        let now = Utc::now();
        let hire_date = now - Duration::days(rand::random::<i64>() % 1095); // Random hire date within last 3 years
        let phone: String = PhoneNumber().fake();

        // Assign to random department
        let dept_index = i % departments.len();
        let department_id = departments[dept_index].id;

        let new_user = user::ActiveModel {
            id: Set(user_id),
            email: Set(email.clone()),
            password_hash: Set(DEFAULT_PASSWORD_HASH.to_string()),
            first_name: Set(first_name),
            last_name: Set(last_name),
            display_name: sea_orm::NotSet, // GENERATED column (computed from first_name + last_name)
            full_name: sea_orm::NotSet,   // GENERATED column (computed from first_name + last_name)
            phone_number: Set(Some(phone)),
            alternate_phone: Set(None),
            job_title: Set(Some(generate_job_title(i))),
            status: Set(Some("active".to_string())),
            department_id: Set(Some(department_id)),
            manager_id: Set(None), // Will be assigned in separate function
            hire_date: Set(Some(hire_date)),
            termination_date: Set(None),
            is_active: Set(true),
            failed_login_attempts: Set(0),
            locked_until: Set(None),
            last_login: Set(None),
            theme_preference: Set("system".to_string()),
            force_password_change: Set(false),
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_user.insert(db).await {
            Ok(_) => {
                result.created_count += 1;
                tracing::info!("Created user: {}", email);

                // Assign default "Employee" role via RBAC
                let employee_role = role::Entity::find()
                    .filter(role::Column::Name.eq("Employee"))
                    .filter(role::Column::DeletedAt.is_null())
                    .one(db)
                    .await;

                match employee_role {
                    Ok(Some(role)) => {
                        let role_assignment = user_role_assignment::ActiveModel {
                            id: Set(Uuid::new_v4()),
                            user_id: Set(user_id),
                            role_id: Set(role.id),
                            created_at: Set(now),
                            updated_at: Set(now),
                            deleted_at: Set(None),
                        };

                        if let Err(e) = role_assignment.insert(db).await {
                            tracing::warn!("Failed to assign Employee role to {}: {}", email, e);
                        } else {
                            tracing::debug!("Assigned Employee role to {}", email);
                        }
                    }
                    Ok(None) => {
                        tracing::warn!("Employee role not found for user {}", email);
                    }
                    Err(e) => {
                        tracing::warn!("Failed to query Employee role for {}: {}", email, e);
                    }
                }

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "user", user_id).await {
                    tracing::warn!("Failed to log audit entry for user {}: {}", email, e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result.errors.push(format!("Failed to create user {}: {}", email, e));
                tracing::error!("Failed to create user {}: {}", email, e);
            }
        }
    }

    Ok(result)
}

/// Generate varied job titles based on index
fn generate_job_title(index: usize) -> String {
    let titles = vec![
        "Software Engineer",
        "Senior Software Engineer",
        "Staff Engineer",
        "Engineering Manager",
        "Product Manager",
        "Senior Product Manager",
        "UX Designer",
        "Senior UX Designer",
        "Data Analyst",
        "Senior Data Analyst",
        "Marketing Manager",
        "Sales Representative",
        "Account Executive",
        "Customer Success Manager",
        "HR Specialist",
        "Finance Analyst",
        "Operations Coordinator",
        "IT Support Specialist",
        "Legal Counsel",
        "Content Writer",
    ];

    titles[index % titles.len()].to_string()
}

/// Assign manager hierarchy to users
///
/// Some users get assigned managers within their department.
/// Uses simple heuristic: every 3rd user in a department becomes a manager for next 2 users.
pub async fn assign_user_managers(
    db: &DatabaseConnection,
    _context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("user_managers");

    // Get all departments
    let departments = department::Entity::find()
        .filter(department::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    for dept in departments {
        // Get users in this department
        let users = user::Entity::find()
            .filter(user::Column::DepartmentId.eq(dept.id))
            .filter(user::Column::IsActive.eq(true))
            .filter(user::Column::DeletedAt.is_null())
            .all(db)
            .await?;

        if users.len() < 2 {
            continue; // Need at least 2 users for manager relationship
        }

        // Assign every 3rd user as manager for next 2 users
        for i in 0..users.len() {
            if i % 3 == 0 && i + 2 < users.len() {
                let manager_id = users[i].id;

                // Assign this manager to next 2 users
                for j in (i + 1)..=(i + 2).min(users.len() - 1) {
                    let mut user_active: user::ActiveModel = users[j].clone().into();
                    user_active.manager_id = Set(Some(manager_id));
                    user_active.updated_at = Set(Utc::now());

                    match user_active.update(db).await {
                        Ok(_) => {
                            result.created_count += 1;
                            tracing::debug!("Assigned manager to user {}", users[j].email);
                        }
                        Err(e) => {
                            result.failed_count += 1;
                            result
                                .errors
                                .push(format!("Failed to assign manager: {}", e));
                        }
                    }
                }
            }
        }
    }

    Ok(result)
}

/// Seed user role assignments (user_role_assignments table)
///
/// Distributes roles across users:
/// - 1 Admin
/// - 2-3 HR Managers
/// - 5-8 Managers
/// - Rest are Employees
pub async fn seed_user_role_assignments(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("user_role_assignments");

    // Get all roles
    let admin_role = role::Entity::find()
        .filter(role::Column::Name.eq("Admin"))
        .one(db)
        .await?
        .ok_or_else(|| crate::seed_data::SeedError::SeedOperation("Admin role not found".to_string()))?;

    let hr_manager_role = role::Entity::find()
        .filter(role::Column::Name.eq("HR Manager"))
        .one(db)
        .await?
        .ok_or_else(|| crate::seed_data::SeedError::SeedOperation("HR Manager role not found".to_string()))?;

    let manager_role = role::Entity::find()
        .filter(role::Column::Name.eq("Manager"))
        .one(db)
        .await?
        .ok_or_else(|| crate::seed_data::SeedError::SeedOperation("Manager role not found".to_string()))?;

    let employee_role = role::Entity::find()
        .filter(role::Column::Name.eq("Employee"))
        .one(db)
        .await?
        .ok_or_else(|| crate::seed_data::SeedError::SeedOperation("Employee role not found".to_string()))?;

    // Get all active users
    let users = user::Entity::find()
        .filter(user::Column::IsActive.eq(true))
        .filter(user::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    if users.is_empty() {
        result.errors.push("No users found for role assignment".to_string());
        return Ok(result);
    }

    // Assign roles:
    // - User 0: Admin
    // - Users 1-3: HR Managers
    // - Users 4-11: Managers
    // - Rest: Employees
    for (i, user_model) in users.iter().enumerate() {
        let role_id = if i == 0 {
            admin_role.id
        } else if i >= 1 && i <= 3 {
            hr_manager_role.id
        } else if i >= 4 && i <= 11 {
            manager_role.id
        } else {
            employee_role.id
        };

        // Check if user_role_assignment already exists
        let existing = user_role_assignment::Entity::find()
            .filter(user_role_assignment::Column::UserId.eq(user_model.id))
            .filter(user_role_assignment::Column::RoleId.eq(role_id))
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            continue;
        }

        // Create user_role_assignment
        let assignment_id = Uuid::new_v4();
        let now = Utc::now();
        let new_assignment = user_role_assignment::ActiveModel {
            id: Set(assignment_id),
            user_id: Set(user_model.id),
            role_id: Set(role_id),
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_assignment.insert(db).await {
            Ok(_) => {
                result.created_count += 1;
                tracing::info!("Assigned role to user {}", user_model.email);

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "user_role_assignment", assignment_id).await {
                    tracing::warn!("Failed to log audit entry for role assignment: {}", e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result.errors.push(format!("Failed to assign role: {}", e));
                tracing::error!("Failed to assign role: {}", e);
            }
        }
    }

    Ok(result)
}
