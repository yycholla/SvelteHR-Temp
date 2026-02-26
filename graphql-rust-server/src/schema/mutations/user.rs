use async_graphql::{Context, InputObject, Result, SimpleObject};
use chrono::Utc;
use csv::ReaderBuilder;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    error::AppError,
    models::{CreateUserInput, UpdateUserInput, User, UserStatus},
};

// ============================================================================
// CSV Import Types and Utilities
// ============================================================================

/// CSV row structure for employee import
/// Expected format: "Name,Hire Date,Role"
/// Name format: "LAST, FIRST" or "LAST, FIRST M"
#[derive(Debug, Deserialize)]
struct EmployeeCsvRow {
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "Hire Date")]
    hire_date: String,
    #[serde(rename = "Role")]
    role: String,
}

/// Parsed employee data from CSV
#[derive(Debug, Clone)]
struct ParsedEmployee {
    first_name: String,
    last_name: String,
    hire_date: Option<chrono::NaiveDate>,
    role: String,
}

/// Parse name from "LAST, FIRST" or "LAST, FIRST M" format
/// Drops middle initials/names
fn parse_name(name: &str) -> Result<(String, String)> {
    let parts: Vec<&str> = name.split(',').map(|s| s.trim()).collect();

    if parts.len() != 2 {
        return Err(AppError::Validation(format!(
            "Invalid name format: '{}'. Expected 'LAST, FIRST'",
            name
        ))
        .into());
    }

    let last_name = parts[0].to_string();

    // Take only the first word after the comma (drops middle initial/name)
    let first_name_parts: Vec<&str> = parts[1].split_whitespace().collect();
    let first_name = first_name_parts
        .first()
        .ok_or_else(|| AppError::Validation(format!("Missing first name in: '{}'", name)))?
        .to_string();

    Ok((first_name, last_name))
}

/// Parse hire date from string (supports multiple formats)
fn parse_hire_date(date_str: &str) -> Option<chrono::NaiveDate> {
    // Try ISO format (YYYY-MM-DD)
    if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        return Some(date);
    }

    // Try US format (MM/DD/YYYY)
    if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%m/%d/%Y") {
        return Some(date);
    }

    // Try alternate format (YYYY/MM/DD)
    if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y/%m/%d") {
        return Some(date);
    }

    None
}

/// Parse CSV content into employee data
fn parse_csv_content(csv_content: &str) -> Result<Vec<ParsedEmployee>> {
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .flexible(false)
        .trim(csv::Trim::All)
        .from_reader(csv_content.as_bytes());

    let mut employees = Vec::new();
    let mut row_number = 1; // Start from 1 (header is 0)

    for result in reader.deserialize::<EmployeeCsvRow>() {
        row_number += 1;

        let row = result.map_err(|e| {
            AppError::Validation(format!("CSV parsing error at row {}: {}", row_number, e))
        })?;

        // Parse name
        let (first_name, last_name) = parse_name(&row.name)
            .map_err(|e| AppError::Validation(format!("Row {}: {:?}", row_number, e)))?;

        // Parse hire date
        let hire_date = parse_hire_date(&row.hire_date);
        if hire_date.is_none() {
            tracing::warn!(
                "Row {}: Could not parse hire date '{}', setting to None",
                row_number,
                row.hire_date
            );
        }

        // Normalize role name
        let role = row.role.trim().to_string();

        employees.push(ParsedEmployee {
            first_name,
            last_name,
            hire_date,
            role,
        });
    }

    Ok(employees)
}

/// Map CSV role name to system role name
fn map_role_name(csv_role: &str) -> String {
    // Case-insensitive mapping to predefined roles
    match csv_role.to_lowercase().as_str() {
        "admin" | "administrator" | "system admin" => "Admin".to_string(),
        "hr" | "hr manager" | "hr_manager" => "HR Manager".to_string(),
        "manager" | "mgr" => "Manager".to_string(),
        "employee" | "emp" | "" => "Employee".to_string(),
        _ => {
            tracing::warn!("Unknown role '{}', defaulting to 'Employee'", csv_role);
            "Employee".to_string()
        }
    }
}

// ============================================================================
// GraphQL Import Types
// ============================================================================

/// Input for bulk employee import from CSV
#[derive(InputObject)]
pub struct ImportEmployeesInput {
    /// CSV content with headers: "Name,Hire Date,Role"
    pub csv_content: String,
    /// Temporary password to set for all imported employees
    /// Must be at least 8 characters
    pub temporary_password: String,
}

/// Result of a single employee import
#[derive(SimpleObject, Debug, Clone)]
pub struct EmployeeImportResult {
    /// Row number in CSV (1-indexed, excluding header)
    pub row_number: i32,
    /// Whether the import succeeded
    pub success: bool,
    /// Employee ID if successful
    pub employee_id: Option<String>,
    /// Employee name
    pub name: String,
    /// Email address (if generated or provided)
    pub email: Option<String>,
    /// Error message if failed
    pub error: Option<String>,
}

/// Response for bulk employee import
#[derive(SimpleObject)]
pub struct ImportEmployeesResponse {
    /// Total number of rows processed
    pub total_rows: i32,
    /// Number of successful imports
    pub successful: i32,
    /// Number of failed imports
    pub failed: i32,
    /// Detailed results for each row
    pub results: Vec<EmployeeImportResult>,
}

/// User mutations
pub struct UserMutations;

#[async_graphql::Object]
impl UserMutations {
    /// Create a new user
    async fn create_user(&self, ctx: &Context<'_>, input: CreateUserInput) -> Result<User> {
        let db = get_db_from_context(ctx)?;

        // Check if email already exists
        let existing_user = crate::models::user::Entity::find()
            .filter(crate::models::user::Column::Email.eq(&input.email))
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if existing_user.is_some() {
            return Err(
                AppError::Validation(format!("Email '{}' is already in use", input.email)).into(),
            );
        }

        // Use provided password or generate a temporary one
        let (password_to_hash, password_source) = if let Some(provided_password) = input.password {
            (provided_password, "provided")
        } else {
            // Generate a temporary secure password
            let temp_password = format!(
                "TempPass{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            );
            (temp_password, "generated")
        };

        let password_hash = bcrypt::hash(&password_to_hash, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?;

        // Log password info (in production, generated passwords should be sent via email)
        if password_source == "generated" {
            tracing::info!(
                "Created user {} with temporary password: {}",
                input.email,
                password_to_hash
            );
        } else {
            tracing::info!("Created user {} with provided password", input.email);
        }

        // Create SeaORM active model
        // Note: display_name and full_name are GENERATED columns in the database
        // and must NOT be set explicitly - they are automatically computed from first_name + last_name
        let user = crate::models::user::ActiveModel {
            email: Set(input.email.clone()),
            password_hash: Set(password_hash),
            first_name: Set(input.first_name.clone()),
            last_name: Set(input.last_name.clone()),
            // display_name: NotSet - generated column, don't set
            // full_name: NotSet - generated column, don't set
            phone_number: Set(input.phone.clone()),
            job_title: Set(input.job_title.clone()),
            department_id: Set(input.department_id),
            manager_id: Set(input.manager_id),
            hire_date: Set(input.hire_date),
            status: Set(Some(input.status.as_str().to_string())),
            is_active: Set(true),
            ..Default::default()
        };

        let user = user.insert(&db).await?;

        // Assign role to new user via RBAC (use provided role_name or default to "Employee")
        let role_name = input.role_name.as_deref().unwrap_or("Employee");
        let assigned_role = crate::models::role::Entity::find()
            .filter(crate::models::role::Column::Name.eq(role_name))
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if let Some(role) = assigned_role {
            let role_assignment = crate::models::user_role_assignment::ActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(user.id),
                role_id: Set(role.id),
                ..Default::default()
            };
            role_assignment.insert(&db).await?;
            tracing::info!("Assigned '{}' role to new user {}", role_name, input.email);
        } else {
            tracing::warn!(
                "Role '{}' not found, user {} created without role assignment",
                role_name,
                input.email
            );
        }

        Ok(user)
    }

    /// Update an existing user
    async fn update_user(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateUserInput,
    ) -> Result<User> {
        let db = get_db_from_context(ctx)?;

        // Find existing user
        let existing_user = crate::models::user::Entity::find_by_id(id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        // Build active model with updates
        let mut user: crate::models::user::ActiveModel = existing_user.into();

        if let Some(email) = input.email {
            user.email = Set(email);
        }

        if let Some(first_name) = &input.first_name {
            user.first_name = Set(first_name.clone());
        }

        if let Some(last_name) = &input.last_name {
            user.last_name = Set(last_name.clone());
        }

        // Note: display_name and full_name are GENERATED columns in the database
        // They are automatically computed from first_name + last_name, so we don't set them

        if let Some(phone) = input.phone {
            user.phone_number = Set(Some(phone));
        }

        if let Some(department_id) = input.department_id {
            user.department_id = Set(Some(department_id));
        }

        if let Some(manager_id) = input.manager_id {
            user.manager_id = Set(Some(manager_id));
        }

        if let Some(hire_date) = input.hire_date {
            user.hire_date = Set(Some(hire_date));
        }

        if let Some(termination_date) = input.termination_date {
            user.termination_date = Set(Some(termination_date));
        }

        if let Some(status) = input.status {
            user.status = Set(Some(status.as_str().to_string()));
            // Also update is_active based on status
            user.is_active = Set(matches!(status, UserStatus::Active));
        }

        if let Some(theme_preference) = input.theme_preference {
            user.theme_preference = Set(theme_preference);
        }

        // Update timestamp
        user.updated_at = Set(Utc::now());

        // Save changes
        let updated_user = user.update(&db).await?;
        Ok(updated_user)
    }

    /// Soft delete a user (sets deleted_at timestamp)
    async fn delete_user(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the user first to ensure it exists
        let user = crate::models::user::Entity::find_by_id(id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if user.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut user: crate::models::user::ActiveModel = user.unwrap().into();
        user.deleted_at = Set(Some(Utc::now()));

        user.update(&db).await?;

        Ok(true)
    }

    /// Change user password (requires current password verification)
    /// Clears force_password_change flag upon successful password change
    async fn change_password(
        &self,
        ctx: &Context<'_>,
        current_password: String,
        new_password: String,
    ) -> Result<ChangePasswordResponse> {
        let db = get_db_from_context(ctx)?;

        // Get current authenticated user from context
        let user_context = ctx.data::<UserContext>()?;

        // Fetch user from database
        let user = crate::models::user::Entity::find_by_id(user_context.user_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        // Verify current password
        let password_valid = bcrypt::verify(&current_password, &user.password_hash)
            .map_err(|e| AppError::Internal(format!("Password verification failed: {}", e)))?;

        if !password_valid {
            return Err(
                AppError::Authentication("Current password is incorrect".to_string()).into(),
            );
        }

        // Validate new password (min 8 characters)
        if new_password.len() < 8 {
            return Err(AppError::Validation(
                "New password must be at least 8 characters long".to_string(),
            )
            .into());
        }

        // Hash new password
        let new_password_hash = bcrypt::hash(&new_password, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError::Internal(format!("Failed to hash new password: {}", e)))?;

        // Update user with new password and clear force_password_change flag
        let mut user: crate::models::user::ActiveModel = user.into();
        user.password_hash = Set(new_password_hash);
        user.force_password_change = Set(false);
        user.updated_at = Set(Utc::now());

        user.update(&db).await?;

        tracing::info!(
            "Password changed successfully for user ID: {}",
            user_context.user_id
        );

        Ok(ChangePasswordResponse {
            success: true,
            message: "Password changed successfully".to_string(),
        })
    }

    /// Bulk import employees from CSV file
    /// CSV format: "Name,Hire Date,Role" where Name is "LAST, FIRST" or "LAST, FIRST M"
    /// All imported employees will have force_password_change=true
    async fn import_employees(
        &self,
        ctx: &Context<'_>,
        input: ImportEmployeesInput,
    ) -> Result<ImportEmployeesResponse> {
        let db = get_db_from_context(ctx)?;

        // Validate temporary password
        if input.temporary_password.len() < 8 {
            return Err(AppError::Validation(
                "Temporary password must be at least 8 characters".to_string(),
            )
            .into());
        }

        // Parse CSV content
        let parsed_employees = parse_csv_content(&input.csv_content)?;

        if parsed_employees.is_empty() {
            return Err(
                AppError::Validation("CSV file contains no employee data".to_string()).into(),
            );
        }

        tracing::info!(
            "Starting bulk import of {} employees",
            parsed_employees.len()
        );

        // Hash temporary password once (reused for all employees)
        let password_hash = bcrypt::hash(&input.temporary_password, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?;

        let mut results = Vec::new();
        let mut successful = 0;
        let mut failed = 0;

        // Process each employee (no transaction - partial success is allowed)
        for (index, employee) in parsed_employees.iter().enumerate() {
            let row_number = (index + 2) as i32; // +2 because row 1 is header, 0-indexed
            let full_name = format!("{} {}", employee.first_name, employee.last_name);

            // Generate email: first.last@mountainhr.dev (lowercase, no spaces)
            let email = format!(
                "{}.{}@mountainhr.dev",
                employee.first_name.to_lowercase().replace(' ', ""),
                employee.last_name.to_lowercase().replace(' ', "")
            );

            // Check for duplicate email
            let existing_user = crate::models::user::Entity::find()
                .filter(crate::models::user::Column::Email.eq(&email))
                .filter(crate::models::user::Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            if existing_user.is_some() {
                tracing::warn!(
                    "Row {}: Email '{}' already exists, skipping",
                    row_number,
                    email
                );
                results.push(EmployeeImportResult {
                    row_number,
                    success: false,
                    employee_id: None,
                    name: full_name.clone(),
                    email: Some(email.clone()),
                    error: Some(format!("Email '{}' already exists", email)),
                });
                failed += 1;
                continue;
            }

            // Map role name
            let role_name = map_role_name(&employee.role);

            // Convert NaiveDate to DateTime<Utc> for hire_date
            let hire_date_utc = employee.hire_date.map(|d| {
                chrono::DateTime::<Utc>::from_naive_utc_and_offset(
                    d.and_hms_opt(0, 0, 0).unwrap(),
                    Utc,
                )
            });

            // Create user with force_password_change=true
            let user = crate::models::user::ActiveModel {
                email: Set(email.clone()),
                password_hash: Set(password_hash.clone()),
                first_name: Set(employee.first_name.clone()),
                last_name: Set(employee.last_name.clone()),
                hire_date: Set(hire_date_utc),
                status: Set(Some(UserStatus::Active.as_str().to_string())),
                is_active: Set(true),
                force_password_change: Set(true), // CRITICAL: Force password change on first login
                theme_preference: Set("system".to_string()),
                ..Default::default()
            };

            match user.insert(&db).await {
                Ok(created_user) => {
                    // Assign role via RBAC
                    let assigned_role = crate::models::role::Entity::find()
                        .filter(crate::models::role::Column::Name.eq(&role_name))
                        .filter(crate::models::role::Column::DeletedAt.is_null())
                        .one(&db)
                        .await?;

                    if let Some(role) = assigned_role {
                        let role_assignment = crate::models::user_role_assignment::ActiveModel {
                            id: Set(Uuid::new_v4()),
                            user_id: Set(created_user.id),
                            role_id: Set(role.id),
                            ..Default::default()
                        };

                        if let Err(e) = role_assignment.insert(&db).await {
                            tracing::error!(
                                "Row {}: Failed to assign role '{}' to user {}: {}",
                                row_number,
                                role_name,
                                email,
                                e
                            );
                            // User created but role assignment failed - still count as partial success
                        } else {
                            tracing::info!(
                                "Row {}: Successfully created user {} with role '{}'",
                                row_number,
                                email,
                                role_name
                            );
                        }
                    } else {
                        tracing::warn!(
                            "Row {}: Role '{}' not found, user created without role",
                            row_number,
                            role_name
                        );
                    }

                    results.push(EmployeeImportResult {
                        row_number,
                        success: true,
                        employee_id: Some(created_user.id.to_string()),
                        name: full_name.clone(),
                        email: Some(email.clone()),
                        error: None,
                    });
                    successful += 1;
                }
                Err(e) => {
                    tracing::error!("Row {}: Failed to create user {}: {}", row_number, email, e);
                    results.push(EmployeeImportResult {
                        row_number,
                        success: false,
                        employee_id: None,
                        name: full_name.clone(),
                        email: Some(email.clone()),
                        error: Some(format!("Database error: {}", e)),
                    });
                    failed += 1;
                }
            }
        }

        tracing::info!(
            "Bulk import completed: {} successful, {} failed out of {} total",
            successful,
            failed,
            parsed_employees.len()
        );

        Ok(ImportEmployeesResponse {
            total_rows: parsed_employees.len() as i32,
            successful,
            failed,
            results,
        })
    }
}

/// Response for password change mutation
#[derive(SimpleObject)]
pub struct ChangePasswordResponse {
    pub success: bool,
    pub message: String,
}
