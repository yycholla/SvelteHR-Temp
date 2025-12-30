use async_graphql::*;
use sea_orm::*;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

use crate::auth::context::UserContext;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};
use crate::integrations::intuit::IntuitClient;
use crate::models::intuit_connection;

#[derive(Default)]
pub struct SyncPreviewMutation;

#[derive(InputObject)]
pub struct SyncPreviewInput {
    /// Entity type to preview (Employee, Department, Both)
    pub entity_type: String,
    /// Sync direction (Pull, Push, Bidirectional)
    pub sync_direction: String,
    /// Optional filter by employee/department IDs
    pub entity_ids: Option<Vec<String>>,
    /// Whether to include detailed field-level changes
    pub include_field_changes: Option<bool>,
}

#[derive(SimpleObject, Debug, Clone, Serialize, Deserialize)]
pub struct SyncPreviewChange {
    /// Type of change (create, update, delete)
    pub change_type: String,
    /// Entity type (Employee, Department)
    pub entity_type: String,
    /// Local record ID (if exists)
    pub local_id: Option<String>,
    /// QuickBooks ID (if exists)
    pub quickbooks_id: Option<String>,
    /// Display name of the entity
    pub display_name: String,
    /// Field-level changes (if requested)
    pub field_changes: Option<Vec<FieldChange>>,
    /// Any warnings or conflicts
    pub warnings: Vec<String>,
}

#[derive(SimpleObject, Debug, Clone, Serialize, Deserialize)]
#[graphql(name = "SyncFieldChange")]
pub struct FieldChange {
    /// Field name
    pub field_name: String,
    /// Current value (local or QB depending on direction)
    pub current_value: Option<String>,
    /// New value (what it will become)
    pub new_value: Option<String>,
    /// Whether this field has a conflict
    pub has_conflict: bool,
}

#[derive(SimpleObject)]
pub struct SyncPreviewResponse {
    pub success: bool,
    pub message: String,
    /// Records to be created
    pub creates: Vec<SyncPreviewChange>,
    /// Records to be updated
    pub updates: Vec<SyncPreviewChange>,
    /// Records to be deleted
    pub deletes: Vec<SyncPreviewChange>,
    /// Total changes count
    pub total_changes: i32,
    /// Summary statistics
    pub summary: PreviewSummary,
}

#[derive(SimpleObject, Debug, Clone, Serialize, Deserialize)]
pub struct PreviewSummary {
    pub total_creates: i32,
    pub total_updates: i32,
    pub total_deletes: i32,
    pub total_conflicts: i32,
    pub total_warnings: i32,
    pub estimated_duration_seconds: Option<i32>,
}

#[Object]
impl SyncPreviewMutation {
    /// Generate a preview of sync changes without executing them
    async fn preview_sync(
        &self,
        ctx: &Context<'_>,
        input: SyncPreviewInput,
    ) -> Result<SyncPreviewResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission based on entity type
        let permission_checker = PermissionChecker::new(db.clone());
        match input.entity_type.as_str() {
            "Employee" => {
                permission_checker
                    .require(user_ctx, SyncPermission::TriggerEmployeeSync)
                    .await?;
            }
            "Department" => {
                permission_checker
                    .require(user_ctx, SyncPermission::TriggerDepartmentSync)
                    .await?;
            }
            "Both" => {
                permission_checker
                    .require(user_ctx, SyncPermission::TriggerEmployeeSync)
                    .await?;
                permission_checker
                    .require(user_ctx, SyncPermission::TriggerDepartmentSync)
                    .await?;
            }
            _ => return Err(Error::new("Invalid entity type")),
        }

        // Validate sync direction
        if !["Pull", "Push", "Bidirectional"].contains(&input.sync_direction.as_str()) {
            return Err(Error::new("Invalid sync direction"));
        }

        // Get QuickBooks connection
        let connection = intuit_connection::Entity::find()
            .filter(intuit_connection::Column::DeletedAt.is_null())
            .filter(intuit_connection::Column::IsActive.eq(true))
            .one(db)
            .await?
            .ok_or_else(|| Error::new("No active QuickBooks connection found"))?;

        // Initialize QuickBooks client
        let _intuit_client = IntuitClient::new(
            connection.access_token.clone(),
            connection.realm_id.clone(),
        )
        .map_err(|e| Error::new(format!("Failed to create Intuit client: {}", e)))?;

        // Perform dry run analysis
        let mut creates = Vec::new();
        let mut updates = Vec::new();
        let deletes = Vec::new();
        let mut total_conflicts = 0;
        let mut total_warnings = 0;

        // TODO: Implement actual dry run logic based on entity_type and sync_direction
        // For now, return a mock preview
        match input.sync_direction.as_str() {
            "Pull" => {
                // Simulate pulling from QuickBooks
                // In real implementation, fetch from QB API and compare with local DB
                if input.entity_type == "Employee" || input.entity_type == "Both" {
                    // Mock: 2 new employees from QB, 5 updates, 0 deletes
                    creates.push(SyncPreviewChange {
                        change_type: "create".to_string(),
                        entity_type: "Employee".to_string(),
                        local_id: None,
                        quickbooks_id: Some("QB123".to_string()),
                        display_name: "John Doe (QB)".to_string(),
                        field_changes: if input.include_field_changes.unwrap_or(false) {
                            Some(vec![
                                FieldChange {
                                    field_name: "email".to_string(),
                                    current_value: None,
                                    new_value: Some("john.doe@company.com".to_string()),
                                    has_conflict: false,
                                },
                            ])
                        } else {
                            None
                        },
                        warnings: vec![],
                    });

                    updates.push(SyncPreviewChange {
                        change_type: "update".to_string(),
                        entity_type: "Employee".to_string(),
                        local_id: Some(Uuid::new_v4().to_string()),
                        quickbooks_id: Some("QB456".to_string()),
                        display_name: "Jane Smith".to_string(),
                        field_changes: if input.include_field_changes.unwrap_or(false) {
                            Some(vec![
                                FieldChange {
                                    field_name: "phone".to_string(),
                                    current_value: Some("555-0100".to_string()),
                                    new_value: Some("555-0200".to_string()),
                                    has_conflict: false,
                                },
                            ])
                        } else {
                            None
                        },
                        warnings: vec!["Local changes will be overwritten".to_string()],
                    });
                    total_warnings += 1;
                }
            }
            "Push" => {
                // Simulate pushing to QuickBooks
                if input.entity_type == "Employee" || input.entity_type == "Both" {
                    creates.push(SyncPreviewChange {
                        change_type: "create".to_string(),
                        entity_type: "Employee".to_string(),
                        local_id: Some(Uuid::new_v4().to_string()),
                        quickbooks_id: None,
                        display_name: "Alice Johnson".to_string(),
                        field_changes: None,
                        warnings: vec![],
                    });
                }
            }
            "Bidirectional" => {
                // Simulate bidirectional sync with conflicts
                creates.push(SyncPreviewChange {
                    change_type: "create".to_string(),
                    entity_type: "Employee".to_string(),
                    local_id: None,
                    quickbooks_id: Some("QB789".to_string()),
                    display_name: "Bob Wilson (QB)".to_string(),
                    field_changes: None,
                    warnings: vec![],
                });

                updates.push(SyncPreviewChange {
                    change_type: "update".to_string(),
                    entity_type: "Employee".to_string(),
                    local_id: Some(Uuid::new_v4().to_string()),
                    quickbooks_id: Some("QB321".to_string()),
                    display_name: "Carol Davis".to_string(),
                    field_changes: if input.include_field_changes.unwrap_or(false) {
                        Some(vec![
                            FieldChange {
                                field_name: "title".to_string(),
                                current_value: Some("Manager".to_string()),
                                new_value: Some("Senior Manager".to_string()),
                                has_conflict: true,
                            },
                        ])
                    } else {
                        None
                    },
                    warnings: vec!["Conflict: Both local and QB have changes".to_string()],
                });
                total_conflicts += 1;
                total_warnings += 1;
            }
            _ => {}
        }

        let total_changes = (creates.len() + updates.len() + deletes.len()) as i32;

        // Estimate duration (rough: 1 second per 10 records)
        let estimated_duration = if total_changes > 0 {
            Some((total_changes / 10).max(1))
        } else {
            None
        };

        Ok(SyncPreviewResponse {
            success: true,
            message: format!("Preview generated: {} total changes", total_changes),
            creates: creates.clone(),
            updates: updates.clone(),
            deletes: deletes.clone(),
            total_changes,
            summary: PreviewSummary {
                total_creates: creates.len() as i32,
                total_updates: updates.len() as i32,
                total_deletes: deletes.len() as i32,
                total_conflicts,
                total_warnings,
                estimated_duration_seconds: estimated_duration,
            },
        })
    }
}
