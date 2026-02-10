//! User Builder
//!
//! Seeds users with realistic names, emails, and role assignments using fake-rs

use chrono::{Duration, Utc};
use fake::faker::name::en::{FirstName, LastName};
use fake::Fake;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::{department, role, user, user_role_assignment};
use crate::models::user::{CompensationType, PaySchedule};
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::config::EntityType;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Pre-computed bcrypt hash for "admin123" (work factor 10)
/// All seeded users will use this password for easy testing
const DEFAULT_PASSWORD_HASH: &str =
    "$2b$10$RAc0JwycgH8Hpq8lRmmb.OXArEiS5Pklvzm5j4RqdQAw5zsNlH8JG";

/// Generates a valid phone number in international format for seed data
///
/// IMPORTANT: We don't use fake::PhoneNumber().fake() because it intentionally generates
/// varied/problematic data (including addresses) to test validation logic. While this is
/// useful for fuzzing/testing, seed data should contain clean, valid data for better DX.
///
/// The fake crate may return:
/// - Addresses: "1805 E Overland Rd Apt 3224, Meridian, ID 83642-6891"
/// - Extensions: "280.766.3038 x335"
/// - Various formats: "555-123-4567", "(555) 123-4567"
///
/// This custom generator ensures seed data has consistent, valid phone numbers:
/// - Format: +1XXXXXXXXXX (US format with country code)
/// - Pattern: /^\+?[1-9]\d{9,14}$/
/// - Example: "+12085551234"
///
/// **Note**: The adapter layer (GraphQLEmployeeAdapter) validates and flags invalid phone
/// data, so the system remains resilient even if bad data reaches the database.
fn generate_valid_phone() -> String {
    // Generate valid US phone number: +1 + area code (200-999) + exchange (200-999) + subscriber (0000-9999)
    let area_code = 200 + (rand::random::<u16>() % 800); // 200-999
    let exchange = 200 + (rand::random::<u16>() % 800);   // 200-999
    let subscriber = rand::random::<u16>() % 10000;        // 0000-9999
    format!("+1{:03}{:03}{:04}", area_code, exchange, subscriber)
}

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
        // Generate hire date within last 3 years (always in the past)
        // Use u32 to ensure positive values, preventing future dates
        let hire_date = now - Duration::days((rand::random::<u32>() % 1095) as i64);
        let phone: String = generate_valid_phone(); // Use custom generator instead of fake::PhoneNumber

        // Assign to random department
        let dept_index = i % departments.len();
        let department_id = departments[dept_index].id;

        // Generate realistic compensation data based on job title
        let job_title = generate_job_title(i);
        let compensation = generate_compensation(&job_title, i);

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
            mobile_number: Set(None),
            nickname: Set(None),
            social_media_release: Set(false),
            job_title: Set(Some(job_title)),
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
            birth_date: Set(None),
            intuit_employee_id: Set(None),
            employee_number: Set(None),
            last_synced_at: Set(None),
            last_modified_at: Set(now),
            quickbooks_sync_token: Set(None),
            sync_status: Set("synced".to_string()),
            // Payroll fields with realistic compensation data
            compensation_type: Set(compensation.compensation_type),
            annual_salary: Set(compensation.annual_salary),
            hourly_rate: Set(compensation.hourly_rate),
            pay_schedule: Set(compensation.pay_schedule),
            commission_rate: Set(compensation.commission_rate),
            bonus_eligible: Set(compensation.bonus_eligible),
            quickbooks_payroll_item_id: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
            tokens_valid_after: Set(now),
            deleted_at: Set(None),
        };

        match new_user.insert(db).await {
            Ok(_) => {
                result.created_count += 1;
                let comp_type = compensation.compensation_type.map(|ct| format!("{:?}", ct)).unwrap_or("NO".to_string());
                tracing::info!("Created user: {} with {} compensation", email, comp_type);

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

/// Compensation data structure for seed generation
#[derive(Debug)]
struct CompensationData {
    compensation_type: Option<CompensationType>,
    annual_salary: Option<rust_decimal::Decimal>,
    hourly_rate: Option<rust_decimal::Decimal>,
    pay_schedule: Option<PaySchedule>,
    commission_rate: Option<rust_decimal::Decimal>,
    bonus_eligible: bool,
}

/// Generate realistic compensation data based on job title and index
///
/// Compensation Strategy:
/// - Salaried roles: Engineering Manager, Product Manager, HR Specialist, Finance Analyst, Legal Counsel
/// - Hourly roles: IT Support, Operations Coordinator, Content Writer, UX Designer
/// - Commission roles: Sales Representative, Account Executive
/// - Contract roles: Every 10th employee (regardless of title)
///
/// Pay ranges are realistic for US market (2025):
/// - Entry-level: $45k-$65k salary / $20-$30/hr
/// - Mid-level: $65k-$95k salary / $30-$45/hr
/// - Senior: $95k-$140k salary / $45-$70/hr
/// - Executive/Manager: $120k-$180k salary
fn generate_compensation(job_title: &str, index: usize) -> CompensationData {
    use rust_decimal::Decimal;
    use std::str::FromStr;

    // Contract workers (every 10th employee)
    if index % 10 == 0 {
        return CompensationData {
            compensation_type: Some(CompensationType::Contract),
            annual_salary: None,
            hourly_rate: Some(Decimal::from_str(&format!("{}", 75 + (index % 50))).unwrap()),
            pay_schedule: None, // Contracts typically invoice, not on pay schedule
            commission_rate: None,
            bonus_eligible: false,
        };
    }

    // Sales roles with commission
    if job_title.contains("Sales") || job_title.contains("Account Executive") {
        let base_salary = 55000 + ((index * 1234) % 25000); // $55k-$80k base
        return CompensationData {
            compensation_type: Some(CompensationType::Commission),
            annual_salary: Some(Decimal::from(base_salary)),
            hourly_rate: None,
            pay_schedule: Some(PaySchedule::Semimonthly),
            commission_rate: Some(Decimal::from_str("15.00").unwrap()), // 15% commission
            bonus_eligible: true,
        };
    }

    // Determine if salaried or hourly based on role
    let is_manager = job_title.contains("Manager");
    let is_senior = job_title.contains("Senior") || job_title.contains("Staff");
    let is_hourly_role = job_title.contains("IT Support")
        || job_title.contains("Operations Coordinator")
        || job_title.contains("Content Writer")
        || job_title.contains("UX Designer");

    if is_hourly_role {
        // Hourly workers
        let base_rate = if is_senior { 45 } else { 25 };
        let hourly_rate = base_rate + ((index * 7) % 20); // Varies by $0-$20
        CompensationData {
            compensation_type: Some(CompensationType::Hourly),
            annual_salary: None,
            hourly_rate: Some(Decimal::from(hourly_rate)),
            pay_schedule: Some(PaySchedule::Biweekly),
            commission_rate: None,
            bonus_eligible: is_senior,
        }
    } else {
        // Salaried workers
        let base_salary = if is_manager {
            140000 // Managers start at $140k
        } else if is_senior {
            95000 // Senior ICs start at $95k
        } else {
            60000 // Entry/mid-level start at $60k
        };

        let salary_variance = (index * 3456) % 30000; // Varies up to $30k
        let annual_salary = base_salary + salary_variance;

        // Determine pay schedule (vary for realism)
        let pay_schedule = match index % 3 {
            0 => PaySchedule::Biweekly,
            1 => PaySchedule::Semimonthly,
            _ => PaySchedule::Monthly,
        };

        CompensationData {
            compensation_type: Some(CompensationType::Salary),
            annual_salary: Some(Decimal::from(annual_salary)),
            hourly_rate: None,
            pay_schedule: Some(pay_schedule),
            commission_rate: None,
            bonus_eligible: is_senior || is_manager,
        }
    }
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
