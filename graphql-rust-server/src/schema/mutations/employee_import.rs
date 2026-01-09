use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use chrono::{DateTime, Utc, NaiveDate};
use csv::ReaderBuilder;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set, QuerySelect,
};
use serde::Serialize;
use serde_json::json;

use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    error::AppError,
    integrations::intuit::IntuitClientManager,
    models::{
        employee::{
            import_job::{self, ImportJobStatus},
            import_row::{self, ImportRowStatus},
        },
        user,
    },
    services::{
        permission_checker::{PermissionChecker, SyncPermission},
        validation_engine::ValidationEngine,
    },
};

// ============================================================================
// Input Types
// ============================================================================

#[derive(InputObject)]
pub struct UploadEmployeeImportInput {
    pub csv_content: String,
    /// Optional: Pre-defined mapping config if known
    pub mapping_config: Option<String>, // JSON string
}

#[derive(InputObject)]
pub struct CommitEmployeeImportInput {
    pub job_id: Uuid,
    /// Temporary password for new users
    pub temporary_password: String,
}

// ============================================================================
// Mutations
// ============================================================================

#[derive(Default)]
pub struct EmployeeImportMutations;

#[derive(InputObject, Serialize)]
pub struct ImportMappingInput {
    pub job_id: Uuid,
    pub first_name_column: Option<String>,
    pub last_name_column: Option<String>,
    pub full_name_column: Option<String>,
    pub email_column: Option<String>, // Can be auto-generated
    pub hire_date_column: Option<String>,
    pub role_column: Option<String>,
    pub birth_date_column: Option<String>,
    pub phone_column: Option<String>,
    pub home_phone_column: Option<String>,
    pub work_phone_column: Option<String>,
    pub mobile_phone_column: Option<String>,
    pub nickname_column: Option<String>,
    pub social_media_release_column: Option<String>,
    pub address_column: Option<String>,
}

#[Object]
impl EmployeeImportMutations {
    /// Step 1: Upload CSV and create an import job
    async fn upload_employee_import(
        &self,
        ctx: &Context<'_>,
        input: UploadEmployeeImportInput,
    ) -> Result<import_job::Model> {
        let db = get_db_from_context(ctx)?;
        
        // Basic CSV Validation
        let mut reader = ReaderBuilder::new()
            .has_headers(true)
            .from_reader(input.csv_content.as_bytes());
            
        let headers = reader.headers()
            .map_err(|e| AppError::Validation(format!("Invalid CSV headers: {}", e)))?
            .clone();
            
        let header_list: Vec<String> = headers.iter().map(|s| s.to_string()).collect();
        
        // Create Job
        let job_id = Uuid::new_v4();
        let job = import_job::ActiveModel {
            id: Set(job_id),
            status: Set(ImportJobStatus::Pending),
            total_rows: Set(0),
            valid_rows: Set(0),
            error_rows: Set(0),
            mapping_config: Set(input.mapping_config.map(|s| serde_json::from_str(&s).unwrap_or(json!({})))),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            ..Default::default()
        };
        
        let job = job.insert(&db).await?;
        
        // Process Rows
        let mut rows_to_insert = Vec::new();
        let mut total_count = 0;
        
        for (idx, result) in reader.records().enumerate() {
            total_count += 1;
            let record = result.map_err(|e| AppError::Validation(format!("CSV error at row {}: {}", idx + 1, e)))?;
            
            // Convert record to JSON Map
            let mut row_data = serde_json::Map::new();
            for (i, field) in record.iter().enumerate() {
                if let Some(header) = header_list.get(i) {
                    row_data.insert(header.clone(), json!(field));
                }
            }
            
            rows_to_insert.push(import_row::ActiveModel {
                id: Set(Uuid::new_v4()),
                job_id: Set(job_id),
                raw_data: Set(json!(row_data)),
                status: Set(ImportRowStatus::Pending),
                row_number: Set((idx + 1) as i32),
                ..Default::default()
            });
            
            if rows_to_insert.len() >= 100 {
                import_row::Entity::insert_many(rows_to_insert).exec(&db).await?;
                rows_to_insert = Vec::new();
            }
        }
        
        if !rows_to_insert.is_empty() {
            import_row::Entity::insert_many(rows_to_insert).exec(&db).await?;
        }
        
        let mut job: import_job::ActiveModel = job.into();
        job.total_rows = Set(total_count);
        let job = job.update(&db).await?;
        
        Ok(job)
    }

    /// Step 2: Validate Rows based on Mapping
    async fn validate_employee_import(
        &self,
        ctx: &Context<'_>,
        input: ImportMappingInput,
    ) -> Result<import_job::Model> {
        let db = get_db_from_context(ctx)?;
        
        let job = import_job::Entity::find_by_id(input.job_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Import Job not found".to_string()))?;
            
        let rows = import_row::Entity::find()
            .filter(import_row::Column::JobId.eq(input.job_id))
            .all(&db)
            .await?;
            
        let mut valid_count = 0;
        let mut error_count = 0;
        
        // Cache existing emails for duplicate checking
        let existing_emails: Vec<String> = user::Entity::find()
            .select_only()
            .column(user::Column::Email)
            .into_tuple()
            .all(&db)
            .await?;
            
        for row in rows {
            let mut parsed_data = serde_json::Map::new();
            let mut validation_errors = Vec::new();
            let raw_data = row.raw_data.as_object().unwrap();
            
            // Helper to get string from JSON
            let get_val = |col: &str| raw_data.get(col).and_then(|v| v.as_str()).map(|s| s.trim());
            
            // Helper to parse dates with multiple formats
            let parse_date = |s: &str| -> Option<NaiveDate> {
                let formats = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"];
                for fmt in formats {
                    if let Ok(d) = NaiveDate::parse_from_str(s, fmt) {
                        return Some(d);
                    }
                }
                None
            };
            
            // 1. Name Logic (Full Name Split or Separate Columns)
            let (first_name, last_name) = if let Some(full_col) = &input.full_name_column {
                if let Some(val) = get_val(full_col) {
                    // Try "LAST, FIRST" format
                    if let Some((last, first)) = val.split_once(',') {
                        (Some(first.trim()), Some(last.trim()))
                    } else if let Some((first, last)) = val.split_once(' ') {
                        // Fallback "FIRST LAST"
                        (Some(first.trim()), Some(last.trim()))
                    } else {
                        // Fallback single word -> First name
                        (Some(val), Some("Unknown")) 
                    }
                } else {
                    (None, None)
                }
            } else {
                let f = input.first_name_column.as_ref().and_then(|c| get_val(c));
                let l = input.last_name_column.as_ref().and_then(|c| get_val(c));
                (f, l)
            };
            
            if let (Some(f), Some(l)) = (first_name, last_name) {
                if f.is_empty() { validation_errors.push("First name is empty".to_string()); }
                if l.is_empty() { validation_errors.push("Last name is empty".to_string()); }
                parsed_data.insert("first_name".to_string(), json!(f));
                parsed_data.insert("last_name".to_string(), json!(l));
            } else {
                validation_errors.push("Missing First or Last Name".to_string());
            }
            
            // 2. Email (Optional, Generated if missing)
            if let Some(col) = &input.email_column {
                if let Some(email) = get_val(col) {
                    if !email.contains('@') {
                        validation_errors.push("Invalid email format".to_string());
                    } else if existing_emails.contains(&email.to_string()) {
                         validation_errors.push(format!("Email {} already exists", email));
                    }
                    parsed_data.insert("email".to_string(), json!(email));
                }
            }
            
            // 3. Hire Date (Optional)
            if let Some(col) = &input.hire_date_column {
                if let Some(date_str) = get_val(col) {
                    if let Some(date) = parse_date(date_str) {
                        parsed_data.insert("hire_date".to_string(), json!(date.to_string()));
                    }
                    // If invalid format, silently ignore (treat as null) to allow import to proceed
                }
            }
            
            // 4. Birth Date (Optional)
            if let Some(col) = &input.birth_date_column {
                if let Some(date_str) = get_val(col) {
                    if let Some(date) = parse_date(date_str) {
                        parsed_data.insert("birth_date".to_string(), json!(date.to_string()));
                    }
                    // If invalid format, silently ignore (treat as null)
                }
            }

            // 5. Role (Optional)
             if let Some(col) = &input.role_column {
                if let Some(role) = get_val(col) {
                     parsed_data.insert("role".to_string(), json!(role));
                }
            }

            // 6. Phone Numbers (Optional)
            let home_phone = input.home_phone_column.as_ref()
                .or(input.phone_column.as_ref())
                .and_then(|col| get_val(col));
            if let Some(p) = home_phone { parsed_data.insert("home_phone".to_string(), json!(p)); }

            if let Some(col) = &input.work_phone_column {
                if let Some(p) = get_val(col) { parsed_data.insert("work_phone".to_string(), json!(p)); }
            }

            if let Some(col) = &input.mobile_phone_column {
                if let Some(p) = get_val(col) { parsed_data.insert("mobile_phone".to_string(), json!(p)); }
            }

            // 7. Nickname & Social
            if let Some(col) = &input.nickname_column {
                if let Some(n) = get_val(col) { parsed_data.insert("nickname".to_string(), json!(n)); }
            }
            
            if let Some(col) = &input.social_media_release_column {
                if let Some(val) = get_val(col) {
                    let is_agreed = ["yes", "y", "true", "1"].contains(&val.to_lowercase().as_str());
                    parsed_data.insert("social_media_release".to_string(), json!(is_agreed));
                }
            }

            // Update Row
            let mut row_active: import_row::ActiveModel = row.into();
            row_active.parsed_data = Set(Some(json!(parsed_data)));
            
            if validation_errors.is_empty() {
                row_active.status = Set(ImportRowStatus::Valid);
                valid_count += 1;
                row_active.validation_errors = Set(None);
            } else {
                row_active.status = Set(ImportRowStatus::Error);
                row_active.validation_errors = Set(Some(json!(validation_errors)));
                error_count += 1;
            }
            
            row_active.update(&db).await?;
        }
        
        // Update Job
        let mut job_active: import_job::ActiveModel = job.into();
        job_active.valid_rows = Set(valid_count);
        job_active.error_rows = Set(error_count);
        job_active.status = Set(ImportJobStatus::Validated);
        job_active.mapping_config = Set(Some(json!(input)));
        job_active.updated_at = Set(Utc::now());
        
        let updated_job = job_active.update(&db).await?;
        Ok(updated_job)
    }

    /// Step 3: Commit Import
    async fn commit_employee_import(
        &self,
        ctx: &Context<'_>,
        input: CommitEmployeeImportInput,
    ) -> Result<import_job::Model> {
        let db = get_db_from_context(ctx)?;
        
        let job = import_job::Entity::find_by_id(input.job_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Import Job not found".to_string()))?;
            
        if job.status == ImportJobStatus::Completed {
             return Err(AppError::Validation("Job already completed".to_string()).into());
        }
        
        let valid_rows = import_row::Entity::find()
            .filter(import_row::Column::JobId.eq(input.job_id))
            .filter(import_row::Column::Status.eq(ImportRowStatus::Valid))
            .all(&db)
            .await?;
            
        let password_hash = bcrypt::hash(&input.temporary_password, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?;
            
        for row in valid_rows {
            let parsed = row.parsed_data.as_ref().unwrap().as_object().unwrap();
            
            let first_name = parsed.get("first_name").unwrap().as_str().unwrap();
            let last_name = parsed.get("last_name").unwrap().as_str().unwrap();
            
            // Generate Email if not present
            let email = if let Some(e) = parsed.get("email") {
                e.as_str().unwrap().to_string()
            } else {
                format!("{}.{}@mountainhr.dev", first_name.to_lowercase(), last_name.to_lowercase())
            };
            
            let hire_date = parsed.get("hire_date").and_then(|s| s.as_str())
                .map(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap())
                .map(|d| DateTime::<Utc>::from_naive_utc_and_offset(d.and_hms_opt(0,0,0).unwrap(), Utc));

            let birth_date = parsed.get("birth_date").and_then(|s| s.as_str())
                .map(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap());
                
            let _role_name = parsed.get("role").and_then(|s| s.as_str()).unwrap_or("Employee");

            let home_phone = parsed.get("home_phone").and_then(|s| s.as_str());
            let work_phone = parsed.get("work_phone").and_then(|s| s.as_str());
            let mobile_phone = parsed.get("mobile_phone").and_then(|s| s.as_str());
            let nickname = parsed.get("nickname").and_then(|s| s.as_str());
            let social_media_release = parsed.get("social_media_release").and_then(|v| v.as_bool()).unwrap_or(false);

            // Insert User
            let user = user::ActiveModel {
                email: Set(email),
                password_hash: Set(password_hash.clone()),
                first_name: Set(first_name.to_string()),
                last_name: Set(last_name.to_string()),
                nickname: Set(nickname.map(String::from)),
                social_media_release: Set(social_media_release),
                hire_date: Set(hire_date),
                birth_date: Set(birth_date),
                phone_number: Set(home_phone.map(String::from)),
                alternate_phone: Set(work_phone.map(String::from)),
                mobile_number: Set(mobile_phone.map(String::from)),
                status: Set(Some("active".to_string())),
                is_active: Set(true),
                force_password_change: Set(true),
                theme_preference: Set("system".to_string()),
                ..Default::default()
            };
            
            // Transaction handling would be better here but keeping it simple for now
             match user.insert(&db).await {
                Ok(new_user) => {
                    // Assign Role... (omitted for brevity, reuse logic from user.rs)
                    let mut row_active: import_row::ActiveModel = row.into();
                    row_active.status = Set(ImportRowStatus::Imported);
                    row_active.matched_user_id = Set(Some(new_user.id));
                    row_active.update(&db).await?;
                },
                Err(e) => {
                     tracing::error!("Failed to insert user: {}", e);
                     let mut row_active: import_row::ActiveModel = row.into();
                     row_active.status = Set(ImportRowStatus::Error);
                     row_active.validation_errors = Set(Some(json!([format!("Insert Error: {}", e)])));
                     row_active.update(&db).await?;
                }
            }
        }
        
        let mut job_active: import_job::ActiveModel = job.into();
        job_active.status = Set(ImportJobStatus::Completed);
        job_active.completed_at = Set(Some(Utc::now()));
        let updated_job = job_active.update(&db).await?;

        Ok(updated_job)
    }

    /// Import a QuickBooks employee with a manually provided email address
    /// This is used to resolve validation errors where employees lack email in QuickBooks
    async fn import_employee_with_email(
        &self,
        ctx: &Context<'_>,
        quickbooks_id: String,
        email: String,
    ) -> Result<ImportEmployeeWithEmailResult> {
        let user_ctx = ctx.data::<UserContext>()?;
        let db = get_db_from_context(ctx)?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::TriggerEmployeeSync)
            .await?;

        // Validate email format
        if !email.contains('@') || email.trim().is_empty() {
            return Ok(ImportEmployeeWithEmailResult {
                success: false,
                message: "Invalid email address format".to_string(),
                employee_id: None,
                employee_name: None,
            });
        }

        // Check if email already exists
        let existing_user = user::Entity::find()
            .filter(user::Column::Email.eq(&email))
            .one(&db)
            .await?;

        if existing_user.is_some() {
            return Ok(ImportEmployeeWithEmailResult {
                success: false,
                message: format!("Email {} is already in use by another employee", email),
                employee_id: None,
                employee_name: None,
            });
        }

        // Get QuickBooks client
        let client_manager = IntuitClientManager::new(db.clone());
        let intuit_client = client_manager
            .get_client()
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to connect to QuickBooks: {}", e)))?;

        // Fetch employee from QuickBooks
        let qb_employee = match intuit_client.get_employee(&quickbooks_id).await {
            Ok(emp) => emp,
            Err(e) => {
                return Ok(ImportEmployeeWithEmailResult {
                    success: false,
                    message: format!("Failed to fetch employee from QuickBooks: {}", e),
                    employee_id: None,
                    employee_name: None,
                });
            }
        };

        // Check if employee already exists locally (by QB ID)
        let existing = user::Entity::find()
            .filter(user::Column::IntuitEmployeeId.eq(Some(quickbooks_id.clone())))
            .one(&db)
            .await?;

        if existing.is_some() {
            return Ok(ImportEmployeeWithEmailResult {
                success: false,
                message: format!(
                    "Employee {} is already linked to QuickBooks ID {}",
                    qb_employee.base.display_name.as_ref().unwrap_or(&"Unknown".to_string()),
                    quickbooks_id
                ),
                employee_id: None,
                employee_name: None,
            });
        }

        // Generate a random password that user must change on first login
        use bcrypt::{hash, DEFAULT_COST};
        let random_password = Uuid::new_v4().to_string();
        let password_hash = match hash(random_password, DEFAULT_COST) {
            Ok(hash) => hash,
            Err(e) => {
                return Ok(ImportEmployeeWithEmailResult {
                    success: false,
                    message: format!("Failed to hash password: {}", e),
                    employee_id: None,
                    employee_name: None,
                });
            }
        };

        // Create the employee with the provided email
        let new_employee_id = Uuid::new_v4();
        let employee_name = format!(
            "{} {}",
            qb_employee.base.given_name.as_ref().unwrap_or(&"Unknown".to_string()),
            qb_employee.base.family_name.as_ref().unwrap_or(&"".to_string())
        );

        let new_model = user::ActiveModel {
            id: Set(new_employee_id),
            first_name: Set(qb_employee.base.given_name.clone().unwrap_or_default()),
            last_name: Set(qb_employee.base.family_name.clone().unwrap_or_default()),
            email: Set(email.clone()),
            password_hash: Set(password_hash),
            force_password_change: Set(true),
            employee_number: Set(qb_employee.employee_number.clone()),
            is_active: Set(qb_employee.base.active.unwrap_or(true)),
            intuit_employee_id: Set(Some(quickbooks_id.clone())),
            quickbooks_sync_token: Set(qb_employee.base.sync_token),
            last_synced_at: Set(Some(Utc::now())),
            last_modified_at: Set(Utc::now()),
            sync_status: Set("synced".to_string()),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            ..Default::default()
        };

        match new_model.insert(&db).await {
            Ok(_) => {
                // Clear validation errors for this QB ID
                let validation_engine = ValidationEngine::new();
                if let Err(e) = validation_engine
                    .clear_errors_for_entity(&db, &quickbooks_id)
                    .await
                {
                    tracing::error!("Failed to clear validation errors: {}", e);
                }

                Ok(ImportEmployeeWithEmailResult {
                    success: true,
                    message: format!(
                        "Successfully imported {} with email {}",
                        employee_name, email
                    ),
                    employee_id: Some(new_employee_id.to_string()),
                    employee_name: Some(employee_name),
                })
            }
            Err(e) => Ok(ImportEmployeeWithEmailResult {
                success: false,
                message: format!("Failed to create employee: {}", e),
                employee_id: None,
                employee_name: None,
            }),
        }
    }
}

/// Result of importing an employee with email
#[derive(SimpleObject)]
pub struct ImportEmployeeWithEmailResult {
    pub success: bool,
    pub message: String,
    pub employee_id: Option<String>,
    pub employee_name: Option<String>,
}
