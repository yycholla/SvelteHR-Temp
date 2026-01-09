use async_graphql::*;
use sea_orm::*;
use uuid::Uuid;
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::auth::context::UserContext;
use crate::services::permission_checker::{PermissionChecker, SyncPermission};

#[derive(Default)]
pub struct FieldMappingMutation;

#[derive(InputObject)]
pub struct CreateFieldMappingInput {
    /// Entity type (Employee, Department)
    pub entity_type: String,
    /// Local field name
    pub local_field: String,
    /// QuickBooks field name
    pub quickbooks_field: String,
    /// Mapping direction (Pull, Push, Bidirectional)
    pub direction: String,
    /// Optional transformation rule
    pub transformation: Option<String>,
    /// Whether this mapping is active
    pub is_active: Option<bool>,
}

#[derive(InputObject)]
pub struct UpdateFieldMappingInput {
    /// Mapping ID
    pub mapping_id: String,
    /// QuickBooks field name
    pub quickbooks_field: Option<String>,
    /// Mapping direction
    pub direction: Option<String>,
    /// Transformation rule
    pub transformation: Option<String>,
    /// Active status
    pub is_active: Option<bool>,
}

#[derive(SimpleObject)]
pub struct FieldMappingResponse {
    pub success: bool,
    pub message: String,
    pub mapping_id: Option<String>,
}

#[derive(SimpleObject, Debug, Clone, Serialize, Deserialize)]
pub struct FieldMapping {
    pub id: String,
    pub entity_type: String,
    pub local_field: String,
    pub quickbooks_field: String,
    pub direction: String,
    pub transformation: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject)]
pub struct FieldMappingsResponse {
    pub mappings: Vec<FieldMapping>,
    pub total: i32,
}

#[derive(SimpleObject, Debug, Clone, Serialize, Deserialize)]
pub struct AvailableField {
    pub field_name: String,
    pub field_type: String,
    pub description: String,
    pub is_required: bool,
}

#[derive(SimpleObject)]
pub struct AvailableFieldsResponse {
    pub local_fields: Vec<AvailableField>,
    pub quickbooks_fields: Vec<AvailableField>,
}

#[Object]
impl FieldMappingMutation {
    /// Create a new field mapping
    async fn create_field_mapping(
        &self,
        ctx: &Context<'_>,
        input: CreateFieldMappingInput,
    ) -> Result<FieldMappingResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ConfigureFieldMapping)
            .await?;

        // Validate entity type
        if !["Employee", "Department"].contains(&input.entity_type.as_str()) {
            return Err(Error::new("Invalid entity type. Must be 'Employee' or 'Department'"));
        }

        // Validate direction
        if !["Pull", "Push", "Bidirectional"].contains(&input.direction.as_str()) {
            return Err(Error::new("Invalid direction. Must be 'Pull', 'Push', or 'Bidirectional'"));
        }

        // Generate mapping ID
        let mapping_id = Uuid::new_v4().to_string();

        // TODO: Store in database
        // For now, return success response
        // In production, this would:
        // 1. Insert into field_mappings table
        // 2. Validate field names against schema
        // 3. Check for conflicts with existing mappings

        Ok(FieldMappingResponse {
            success: true,
            message: format!(
                "Field mapping created: {} -> {}",
                input.local_field, input.quickbooks_field
            ),
            mapping_id: Some(mapping_id),
        })
    }

    /// Update an existing field mapping
    async fn update_field_mapping(
        &self,
        ctx: &Context<'_>,
        input: UpdateFieldMappingInput,
    ) -> Result<FieldMappingResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ConfigureFieldMapping)
            .await?;

        // Validate direction if provided
        if let Some(ref direction) = input.direction {
            if !["Pull", "Push", "Bidirectional"].contains(&direction.as_str()) {
                return Err(Error::new("Invalid direction"));
            }
        }

        // TODO: Update in database
        // For now, return success response

        Ok(FieldMappingResponse {
            success: true,
            message: "Field mapping updated successfully".to_string(),
            mapping_id: Some(input.mapping_id),
        })
    }

    /// Delete a field mapping
    async fn delete_field_mapping(
        &self,
        ctx: &Context<'_>,
        mapping_id: String,
    ) -> Result<FieldMappingResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ConfigureFieldMapping)
            .await?;

        // TODO: Delete from database
        // For now, return success response

        Ok(FieldMappingResponse {
            success: true,
            message: "Field mapping deleted successfully".to_string(),
            mapping_id: Some(mapping_id),
        })
    }

    /// Get all field mappings
    async fn get_field_mappings(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<String>,
    ) -> Result<FieldMappingsResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ConfigureFieldMapping)
            .await?;

        // TODO: Fetch from database
        // For now, return mock data
        let mock_mappings = vec![
            FieldMapping {
                id: Uuid::new_v4().to_string(),
                entity_type: "Employee".to_string(),
                local_field: "first_name".to_string(),
                quickbooks_field: "GivenName".to_string(),
                direction: "Bidirectional".to_string(),
                transformation: None,
                is_active: true,
                created_at: Utc::now().to_rfc3339(),
                updated_at: Utc::now().to_rfc3339(),
            },
            FieldMapping {
                id: Uuid::new_v4().to_string(),
                entity_type: "Employee".to_string(),
                local_field: "last_name".to_string(),
                quickbooks_field: "FamilyName".to_string(),
                direction: "Bidirectional".to_string(),
                transformation: None,
                is_active: true,
                created_at: Utc::now().to_rfc3339(),
                updated_at: Utc::now().to_rfc3339(),
            },
            FieldMapping {
                id: Uuid::new_v4().to_string(),
                entity_type: "Employee".to_string(),
                local_field: "email".to_string(),
                quickbooks_field: "PrimaryEmailAddr.Address".to_string(),
                direction: "Bidirectional".to_string(),
                transformation: None,
                is_active: true,
                created_at: Utc::now().to_rfc3339(),
                updated_at: Utc::now().to_rfc3339(),
            },
            FieldMapping {
                id: Uuid::new_v4().to_string(),
                entity_type: "Department".to_string(),
                local_field: "name".to_string(),
                quickbooks_field: "Name".to_string(),
                direction: "Bidirectional".to_string(),
                transformation: None,
                is_active: true,
                created_at: Utc::now().to_rfc3339(),
                updated_at: Utc::now().to_rfc3339(),
            },
        ];

        let filtered_mappings = if let Some(entity) = entity_type {
            mock_mappings
                .into_iter()
                .filter(|m| m.entity_type == entity)
                .collect()
        } else {
            mock_mappings
        };

        let total = filtered_mappings.len() as i32;

        Ok(FieldMappingsResponse {
            mappings: filtered_mappings,
            total,
        })
    }

    /// Get available fields for mapping
    async fn get_available_fields(
        &self,
        ctx: &Context<'_>,
        entity_type: String,
    ) -> Result<AvailableFieldsResponse> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Check permission
        let permission_checker = PermissionChecker::new(db.clone());
        permission_checker
            .require(user_ctx, SyncPermission::ConfigureFieldMapping)
            .await?;

        // Validate entity type
        if !["Employee", "Department"].contains(&entity_type.as_str()) {
            return Err(Error::new("Invalid entity type"));
        }

        // TODO: Dynamically generate from database schema
        // For now, return predefined fields based on entity type
        let (local_fields, quickbooks_fields) = match entity_type.as_str() {
            "Employee" => (
                vec![
                    AvailableField {
                        field_name: "first_name".to_string(),
                        field_type: "String".to_string(),
                        description: "Employee first name".to_string(),
                        is_required: true,
                    },
                    AvailableField {
                        field_name: "last_name".to_string(),
                        field_type: "String".to_string(),
                        description: "Employee last name".to_string(),
                        is_required: true,
                    },
                    AvailableField {
                        field_name: "email".to_string(),
                        field_type: "String".to_string(),
                        description: "Employee email address".to_string(),
                        is_required: false,
                    },
                    AvailableField {
                        field_name: "phone".to_string(),
                        field_type: "String".to_string(),
                        description: "Employee phone number".to_string(),
                        is_required: false,
                    },
                    AvailableField {
                        field_name: "hire_date".to_string(),
                        field_type: "Date".to_string(),
                        description: "Employee hire date".to_string(),
                        is_required: false,
                    },
                ],
                vec![
                    AvailableField {
                        field_name: "GivenName".to_string(),
                        field_type: "String".to_string(),
                        description: "QuickBooks first name".to_string(),
                        is_required: true,
                    },
                    AvailableField {
                        field_name: "FamilyName".to_string(),
                        field_type: "String".to_string(),
                        description: "QuickBooks last name".to_string(),
                        is_required: true,
                    },
                    AvailableField {
                        field_name: "PrimaryEmailAddr.Address".to_string(),
                        field_type: "String".to_string(),
                        description: "QuickBooks email address".to_string(),
                        is_required: false,
                    },
                    AvailableField {
                        field_name: "PrimaryPhone.FreeFormNumber".to_string(),
                        field_type: "String".to_string(),
                        description: "QuickBooks phone number".to_string(),
                        is_required: false,
                    },
                    AvailableField {
                        field_name: "HiredDate".to_string(),
                        field_type: "Date".to_string(),
                        description: "QuickBooks hire date".to_string(),
                        is_required: false,
                    },
                ],
            ),
            "Department" => (
                vec![
                    AvailableField {
                        field_name: "name".to_string(),
                        field_type: "String".to_string(),
                        description: "Department name".to_string(),
                        is_required: true,
                    },
                    AvailableField {
                        field_name: "description".to_string(),
                        field_type: "String".to_string(),
                        description: "Department description".to_string(),
                        is_required: false,
                    },
                ],
                vec![
                    AvailableField {
                        field_name: "Name".to_string(),
                        field_type: "String".to_string(),
                        description: "QuickBooks department name".to_string(),
                        is_required: true,
                    },
                    AvailableField {
                        field_name: "FullyQualifiedName".to_string(),
                        field_type: "String".to_string(),
                        description: "QuickBooks fully qualified name".to_string(),
                        is_required: false,
                    },
                ],
            ),
            _ => (vec![], vec![]),
        };

        Ok(AvailableFieldsResponse {
            local_fields,
            quickbooks_fields,
        })
    }
}
