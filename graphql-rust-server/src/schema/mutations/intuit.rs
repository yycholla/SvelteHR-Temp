//! Intuit QuickBooks Integration Mutations and Queries
//!
//! Handles OAuth flow, connection management, and employee synchronization

use async_graphql::{Context, Object, Result, SimpleObject};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, Set, ActiveModelTrait};
use uuid::Uuid;
use chrono::Utc;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    integrations::intuit::{self as intuit, IntuitClient},
    models::intuit_connection::{Entity as IntuitConnectionEntity, Column as IntuitConnectionColumn, ActiveModel as IntuitConnectionActiveModel},
};
use sea_orm::QueryOrder;

/// Authorization URL and state for OAuth flow
#[derive(SimpleObject)]
pub struct AuthorizationUrlResponse {
    pub url: String,
    pub state: String,
}

/// Connection status information
#[derive(SimpleObject)]
pub struct ConnectionInfo {
    pub is_connected: bool,
    pub company_name: Option<String>,
    pub realm_id: Option<String>,
    pub last_sync_at: Option<chrono::DateTime<Utc>>,
}

/// Connection result
#[derive(SimpleObject)]
pub struct ConnectResult {
    pub success: bool,
    pub company_name: Option<String>,
    pub error: Option<String>,
}

/// Disconnect result
#[derive(SimpleObject)]
pub struct DisconnectResult {
    pub success: bool,
    pub error: Option<String>,
}

/// Sync result
#[derive(SimpleObject)]
pub struct SyncResult {
    pub success: bool,
    pub synced_count: i32,
    pub errors: Vec<String>,
}

/// Intuit query operations
pub struct IntuitQueries;

#[Object]
impl IntuitQueries {
    /// Get authorization URL for OAuth flow
    async fn authorization_url(&self, ctx: &Context<'_>) -> Result<AuthorizationUrlResponse> {
        // Verify user is authenticated and is admin
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        if !user_context.is_admin() && !user_context.is_system() {
            return Err(async_graphql::Error::new("Admin access required"));
        }

        let (url, csrf_token) = intuit::get_authorization_url()
            .map_err(|e| async_graphql::Error::new(format!("Failed to generate authorization URL: {}", e)))?;

        Ok(AuthorizationUrlResponse {
            url,
            state: csrf_token.secret().to_string(),
        })
    }

    /// Get current connection status
    async fn connection(&self, ctx: &Context<'_>) -> Result<ConnectionInfo> {
        let db = get_db_from_context(ctx)?;

        // Verify user is authenticated and is admin
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        if !user_context.is_admin() && !user_context.is_system() {
            return Err(async_graphql::Error::new("Admin access required"));
        }

        // Get the most recent active connection
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .order_by_desc(IntuitConnectionColumn::CreatedAt)
            .one(&db)
            .await?;

        match connection {
            Some(conn) => Ok(ConnectionInfo {
                is_connected: true,
                company_name: conn.company_name,
                realm_id: Some(conn.realm_id),
                last_sync_at: conn.last_sync_at.map(|dt| dt.to_utc()),
            }),
            None => Ok(ConnectionInfo {
                is_connected: false,
                company_name: None,
                realm_id: None,
                last_sync_at: None,
            }),
        }
    }
}

/// Intuit mutation operations
pub struct IntuitMutations;

#[Object]
impl IntuitMutations {
    /// Connect to QuickBooks using OAuth code and realm ID
    async fn connect(&self, ctx: &Context<'_>, code: String, realm_id: String) -> Result<ConnectResult> {
        let db = get_db_from_context(ctx)?;

        // Verify user is authenticated and is admin
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        if !user_context.is_admin() && !user_context.is_system() {
            return Err(async_graphql::Error::new("Admin access required"));
        }

        // Exchange code for tokens
        let tokens = match intuit::exchange_code_for_tokens(code).await {
            Ok(t) => t,
            Err(e) => {
                return Ok(ConnectResult {
                    success: false,
                    company_name: None,
                    error: Some(format!("Failed to exchange code for tokens: {}", e)),
                });
            }
        };

        // Get company name from QuickBooks
        let client = IntuitClient::new(tokens.access_token.clone(), realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create Intuit client: {}", e)))?;

        let company_name = match client.get_company_info().await {
            Ok(info) => info.company_name,
            Err(e) => {
                tracing::warn!("Failed to fetch company name: {}", e);
                Some("QuickBooks Company".to_string())
            }
        };

        // Calculate token expiration time
        let expires_at = Utc::now() + chrono::Duration::seconds(tokens.expires_in);

        // Save connection to database
        let connection = IntuitConnectionActiveModel {
            id: Set(Uuid::new_v4()),
            realm_id: Set(realm_id),
            access_token: Set(tokens.access_token),
            refresh_token: Set(tokens.refresh_token),
            token_expires_at: Set(expires_at.into()),
            company_name: Set(company_name.clone()),
            is_active: Set(true),
            last_sync_at: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
            deleted_at: Set(None),
        };

        connection.insert(&db).await?;

        Ok(ConnectResult {
            success: true,
            company_name,
            error: None,
        })
    }

    /// Disconnect from QuickBooks
    async fn disconnect(&self, ctx: &Context<'_>) -> Result<DisconnectResult> {
        let db = get_db_from_context(ctx)?;

        // Verify user is authenticated and is admin
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        if !user_context.is_admin() && !user_context.is_system() {
            return Err(async_graphql::Error::new("Admin access required"));
        }

        // Soft delete the most recent connection
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .order_by_desc(IntuitConnectionColumn::CreatedAt)
            .one(&db)
            .await?;

        match connection {
            Some(conn) => {
                let mut active_model: IntuitConnectionActiveModel = conn.into();
                active_model.deleted_at = Set(Some(Utc::now().into()));
                active_model.is_active = Set(false);
                active_model.update(&db).await?;

                Ok(DisconnectResult {
                    success: true,
                    error: None,
                })
            }
            None => Ok(DisconnectResult {
                success: false,
                error: Some("No active connection found".to_string()),
            }),
        }
    }

    /// Push employees from HR system to QuickBooks
    async fn push_employees_to_quickbooks(&self, ctx: &Context<'_>) -> Result<SyncResult> {
        let db = get_db_from_context(ctx)?;

        // Verify user is authenticated and is admin
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        if !user_context.is_admin() && !user_context.is_system() {
            return Err(async_graphql::Error::new("Admin access required"));
        }

        // Get active connection
        let connection = get_active_connection(&db).await?;

        // Check if token needs refresh
        let (access_token, _) = ensure_valid_token(&db, &connection).await?;

        // Create Intuit client
        let client = IntuitClient::new(access_token, connection.realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create Intuit client: {}", e)))?;

        // Import user model
        use crate::models::user::{Entity as UserEntity, Column as UserColumn, ActiveModel as UserActiveModel};
        use sea_orm::Set;

        // Fetch all active employees from HR system
        let hr_employees = UserEntity::find()
            .filter(UserColumn::IsActive.eq(true))
            .filter(UserColumn::DeletedAt.is_null())
            .all(&db)
            .await?;

        let mut synced_count = 0;
        let mut errors = Vec::new();

        // Filter employees that need to be created (no intuit_employee_id and have email)
        let employees_to_create: Vec<_> = hr_employees
            .iter()
            .filter(|emp| {
                if emp.email.is_empty() {
                    errors.push(format!("Employee {} {} has no email, skipping", emp.first_name, emp.last_name));
                    false
                } else if emp.intuit_employee_id.is_some() {
                    tracing::info!("Employee {} already has QuickBooks ID, skipping", emp.email);
                    false
                } else {
                    true
                }
            })
            .collect();

        if employees_to_create.is_empty() {
            tracing::info!("No employees to create in QuickBooks");
            return Ok(SyncResult {
                success: true,
                synced_count: 0,
                errors,
            });
        }

        // Convert HR employees to QuickBooks EmployeeExtended objects with full data
        use crate::models::employee::user_address::{Entity as UserAddressEntity, Column as UserAddressColumn};
        use quickbooks_types::common::{Addr, PhoneNumber, NtRef};

        let mut qb_employees = Vec::new();
        for emp in &employees_to_create {
            // Fetch primary address for this employee
            let primary_address = UserAddressEntity::find()
                .filter(UserAddressColumn::UserId.eq(emp.id))
                .filter(UserAddressColumn::IsPrimary.eq(true))
                .filter(UserAddressColumn::DeletedAt.is_null())
                .one(&db)
                .await
                .ok()
                .flatten();

            // Fetch manager's QuickBooks ID if employee has a manager
            let manager_ref = if let Some(manager_id) = emp.manager_id {
                let manager = UserEntity::find_by_id(manager_id)
                    .filter(UserColumn::DeletedAt.is_null())
                    .one(&db)
                    .await?;

                manager.and_then(|mgr| {
                    mgr.intuit_employee_id.map(|qb_id| NtRef {
                        value: Some(qb_id),
                        name: Some(format!("{} {}", mgr.first_name, mgr.last_name)),
                        entity_ref_type: Some("Employee".to_string()),
                    })
                })
            } else {
                None
            };

            // Build QuickBooks Employee with all available fields
            let base_employee = intuit::Employee {
                given_name: Some(emp.first_name.clone()),
                family_name: Some(emp.last_name.clone()),
                primary_email_addr: Some(intuit::EmailAddress {
                    address: Some(emp.email.clone()),
                }),
                title: emp.job_title.clone(),
                primary_phone: emp.phone_number.as_ref().map(|phone| PhoneNumber {
                    free_form_number: Some(phone.clone()),
                }),
                mobile: emp.mobile_number.as_ref().map(|mobile| PhoneNumber {
                    free_form_number: Some(mobile.clone()),
                }),
                primary_addr: primary_address.map(|addr| Addr {
                    line1: Some(addr.address_line1.clone()),
                    city: Some(addr.city.clone()),
                    country_sub_division_code: Some(addr.state_province.clone()),
                    postal_code: Some(addr.postal_code.clone()),
                    country: Some(addr.country.clone()),
                    id: None,
                }),
                birth_date: emp.birth_date,
                hired_date: emp.hire_date.map(|dt| dt.date_naive()),
                active: Some(true),
                ..Default::default()
            };

            // Create EmployeeExtended with manager reference
            let qb_employee = intuit::EmployeeExtended {
                base: base_employee,
                department_ref: None, // TODO: Implement department sync
                parent_ref: manager_ref,
            };

            if qb_employee.parent_ref.is_some() {
                tracing::info!("Employee {} has manager reference set", emp.email);
            }

            qb_employees.push(qb_employee);
        }

        tracing::info!("Batch creating {} employees in QuickBooks", qb_employees.len());

        // Batch create employees (API handles chunking into groups of 30)
        let batch_results = client.batch_create_employees(qb_employees).await?;

        // Process results and update local database
        for (index, result) in batch_results.iter().enumerate() {
            let hr_employee = employees_to_create[index];

            match result {
                Ok(qb_employee) => {
                    if let Some(qb_id) = &qb_employee.id {
                        let mut user_update: UserActiveModel = hr_employee.clone().into();
                        user_update.intuit_employee_id = Set(Some(qb_id.clone()));
                        user_update.updated_at = Set(Utc::now().into());

                        if let Err(e) = user_update.update(&db).await {
                            errors.push(format!("Created in QuickBooks but failed to update local record for {}: {}", hr_employee.email, e));
                        } else {
                            synced_count += 1;
                            tracing::info!("Created employee {} in QuickBooks with ID {}", hr_employee.email, qb_id);
                        }
                    } else {
                        errors.push(format!("QuickBooks didn't return ID for employee {}", hr_employee.email));
                    }
                }
                Err(e) => {
                    errors.push(format!("Failed to create {} in QuickBooks: {}", hr_employee.email, e));
                }
            }
        }

        // Update last sync time
        update_last_sync_time(&db, connection.id).await?;

        Ok(SyncResult {
            success: synced_count > 0 || errors.is_empty(),
            synced_count,
            errors,
        })
    }

    /// Synchronize all employees with QuickBooks (pull from QB to HR)
    async fn sync_all_employees(&self, ctx: &Context<'_>) -> Result<SyncResult> {
        let db = get_db_from_context(ctx)?;

        // Verify user is authenticated and is admin
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required"))?;

        if !user_context.is_admin() && !user_context.is_system() {
            return Err(async_graphql::Error::new("Admin access required"));
        }

        // Get active connection
        let connection = get_active_connection(&db).await?;

        // Check if token needs refresh
        let (access_token, _) = ensure_valid_token(&db, &connection).await?;

        // Create Intuit client
        let client = IntuitClient::new(access_token, connection.realm_id.clone())
            .map_err(|e| async_graphql::Error::new(format!("Failed to create Intuit client: {}", e)))?;

        // Fetch employees from QuickBooks
        let qb_employees = match client.list_employees().await {
            Ok(emps) => emps,
            Err(e) => {
                return Ok(SyncResult {
                    success: false,
                    synced_count: 0,
                    errors: vec![format!("Failed to fetch employees from QuickBooks: {}", e)],
                });
            }
        };

        let mut synced_count = 0;
        let mut errors = Vec::new();

        // Import user model
        use crate::models::user::{Entity as UserEntity, Column as UserColumn, ActiveModel as UserActiveModel};
        use sea_orm::{Set, NotSet};

        // Sync each employee from QuickBooks to local database
        tracing::info!("Processing {} employees from QuickBooks", qb_employees.len());

        // Log all employee names for debugging
        for (idx, emp) in qb_employees.iter().enumerate() {
            if idx < 10 || idx >= qb_employees.len() - 10 {
                tracing::debug!("Employee {}: ID={:?}, given_name={:?}, family_name={:?}, email={:?}",
                    idx, emp.id, emp.given_name, emp.family_name,
                    emp.primary_email_addr.as_ref().and_then(|e| e.address.as_ref()));
            }
        }

        for qb_employee in qb_employees {
            // Skip if no ID or email
            let qb_id = match &qb_employee.id {
                Some(id) => id.clone(),
                None => {
                    tracing::warn!("Employee missing ID, skipping");
                    errors.push("Employee missing ID, skipping".to_string());
                    continue;
                }
            };

            tracing::debug!("Processing QuickBooks employee ID: {}", qb_id);

            // Log the full employee data for debugging
            tracing::debug!("QB Employee data: given_name={:?}, family_name={:?}, primary_email_addr={:?}",
                qb_employee.given_name, qb_employee.family_name, qb_employee.primary_email_addr);

            let email = match &qb_employee.primary_email_addr {
                Some(e) => {
                    let email_addr = e.address.clone().unwrap_or_default();
                    if email_addr.is_empty() {
                        tracing::warn!("Employee {} has primary_email_addr but address field is empty", qb_id);
                        errors.push(format!("Employee {} has empty email address, skipping", qb_id));
                        continue;
                    }
                    email_addr
                },
                None => {
                    tracing::warn!("Employee {} missing primary_email_addr field", qb_id);
                    errors.push(format!("Employee {} missing email, skipping", qb_id));
                    continue;
                }
            };

            // Check if user already exists by intuit_employee_id or email (excluding soft-deleted users)
            let existing_user = UserEntity::find()
                .filter(
                    sea_orm::Condition::any()
                        .add(UserColumn::IntuitEmployeeId.eq(&qb_id))
                        .add(UserColumn::Email.eq(&email))
                )
                .filter(UserColumn::DeletedAt.is_null()) // Exclude soft-deleted users
                .one(&db)
                .await?;

            match existing_user {
                Some(user) => {
                    // Update existing user
                    let mut user_update: UserActiveModel = user.into();
                    user_update.intuit_employee_id = Set(Some(qb_id.clone()));

                    if let Some(given_name) = &qb_employee.given_name {
                        user_update.first_name = Set(given_name.clone());
                    }
                    if let Some(family_name) = &qb_employee.family_name {
                        user_update.last_name = Set(family_name.clone());
                    }

                    user_update.updated_at = Set(Utc::now().into());

                    if let Err(e) = user_update.update(&db).await {
                        errors.push(format!("Failed to update user {}: {}", email, e));
                        continue;
                    }

                    synced_count += 1;
                    tracing::info!("Updated user {} from QuickBooks", email);
                }
                None => {
                    // Create new user from QuickBooks employee data
                    tracing::info!("Creating new user from QuickBooks employee {}", qb_id);
                    use uuid::Uuid;

                    let given_name = qb_employee.given_name.clone().unwrap_or_else(|| "Unknown".to_string());
                    let family_name = qb_employee.family_name.clone().unwrap_or_else(|| "Employee".to_string());
                    let display_name = format!("{} {}", given_name, family_name);

                    tracing::debug!("Creating user: {} {} ({})", given_name, family_name, email);

                    // Generate a random password that user must change on first login
                    use bcrypt::{hash, DEFAULT_COST};
                    let random_password = Uuid::new_v4().to_string();
                    let password_hash = match hash(random_password, DEFAULT_COST) {
                        Ok(hash) => hash,
                        Err(e) => {
                            let error_msg = format!("Failed to hash password for {}: {}", email, e);
                            tracing::error!("{}", error_msg);
                            errors.push(error_msg);
                            continue;
                        }
                    };

                    let new_user = UserActiveModel {
                        id: Set(Uuid::new_v4()),
                        email: Set(email.clone()),
                        password_hash: Set(password_hash),
                        first_name: Set(given_name),
                        last_name: Set(family_name),
                        display_name: Set(display_name), // Manual setting allowed
                        full_name: NotSet, // GENERATED column (first_name + last_name)
                        phone_number: Set(None), // Will be populated from QuickBooks fields later
                        alternate_phone: Set(None),
                        mobile_number: Set(None),
                        nickname: Set(None),
                        social_media_release: Set(false),
                        job_title: Set(None),
                        status: Set(Some("active".to_string())),
                        department_id: Set(None),
                        manager_id: Set(None),
                        hire_date: Set(None),
                        termination_date: Set(None),
                        is_active: Set(qb_employee.active.unwrap_or(true)),
                        failed_login_attempts: Set(0),
                        locked_until: Set(None),
                        last_login: Set(None),
                        force_password_change: Set(true), // Force password change on first login
                        theme_preference: Set("light".to_string()),
                        birth_date: Set(None),
                        intuit_employee_id: Set(Some(qb_id.clone())),
                        created_at: Set(Utc::now()),
                        updated_at: Set(Utc::now()),
                        deleted_at: Set(None),
                    };

                    match new_user.insert(&db).await {
                        Ok(inserted_user) => {
                            synced_count += 1;
                            tracing::info!("✓ Successfully created new user {} (ID: {}) from QuickBooks employee {}", email, inserted_user.id, qb_id);
                        }
                        Err(e) => {
                            let error_msg = format!("Failed to create user {} from QuickBooks: {}", email, e);
                            tracing::error!("{}", error_msg);
                            errors.push(error_msg);
                        }
                    }
                }
            }
        }

        // Update last sync time
        update_last_sync_time(&db, connection.id).await?;

        // Log sync summary
        if errors.is_empty() {
            tracing::info!("✓ Sync completed successfully: {} employees synced", synced_count);
        } else {
            tracing::warn!("Sync completed with {} errors: {} employees synced", errors.len(), synced_count);
            for error in &errors {
                tracing::error!("Sync error: {}", error);
            }
        }

        Ok(SyncResult {
            success: errors.is_empty(),
            synced_count,
            errors,
        })
    }
}

// Helper functions

async fn get_active_connection(db: &DatabaseConnection) -> Result<crate::models::intuit_connection::Model> {
    IntuitConnectionEntity::find()
        .filter(IntuitConnectionColumn::DeletedAt.is_null())
        .filter(IntuitConnectionColumn::IsActive.eq(true))
        .order_by_desc(IntuitConnectionColumn::CreatedAt)
        .one(db)
        .await?
        .ok_or_else(|| async_graphql::Error::new("No active QuickBooks connection found"))
}

async fn ensure_valid_token(
    db: &DatabaseConnection,
    connection: &crate::models::intuit_connection::Model,
) -> Result<(String, bool)> {
    // Check if token is expired or about to expire (within 5 minutes)
    let now = Utc::now();
    let expires_soon = connection.token_expires_at <= now + chrono::Duration::minutes(5);

    if expires_soon {
        // Refresh the token
        let new_tokens = intuit::refresh_access_token(connection.refresh_token.clone())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to refresh token: {}", e)))?;

        // Calculate new expiration time
        let new_expires_at = Utc::now() + chrono::Duration::seconds(new_tokens.expires_in);

        // Update connection with new tokens
        let mut active_model: IntuitConnectionActiveModel = connection.clone().into();
        active_model.access_token = Set(new_tokens.access_token.clone());
        active_model.refresh_token = Set(new_tokens.refresh_token);
        active_model.token_expires_at = Set(new_expires_at.into());
        active_model.updated_at = Set(Utc::now().into());
        active_model.update(db).await?;

        Ok((new_tokens.access_token, true))
    } else {
        Ok((connection.access_token.clone(), false))
    }
}

async fn update_last_sync_time(db: &DatabaseConnection, connection_id: Uuid) -> Result<()> {
    let connection = IntuitConnectionEntity::find_by_id(connection_id)
        .one(db)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Connection not found"))?;

    let mut active_model: IntuitConnectionActiveModel = connection.into();
    active_model.last_sync_at = Set(Some(Utc::now().into()));
    active_model.updated_at = Set(Utc::now().into());
    active_model.update(db).await?;

    Ok(())
}
