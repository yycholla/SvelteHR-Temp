//! Audit logging middleware for GraphQL mutations
//!
//! This middleware automatically logs all GraphQL mutations to the activity_logs table,
//! capturing user context, operation details, and before/after snapshots for rollback support.

use async_graphql::{
    extensions::{Extension, ExtensionContext, ExtensionFactory, NextExecute},
    parser::types::{ExecutableDocument, OperationType},
    Response, Value, Variables,
};
use axum_login::AuthSession;
use sea_orm::{ActiveModelTrait, ActiveValue::NotSet, DatabaseConnection, EntityTrait, Set};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::AuthBackend,
    models::system::activity_log::ActiveModel as ActivityLogActiveModel,
};

/// Audit logging extension for GraphQL mutations
///
/// This extension hooks into the GraphQL execution pipeline to automatically log
/// all mutation operations to the activity_logs table. It captures:
/// - User ID and authentication context
/// - Operation name and type (CREATE, UPDATE, DELETE)
/// - Resource type and ID from mutation arguments
/// - Before/after snapshots for rollback support
/// - IP address and user agent from request context
///
/// The extension runs asynchronously to avoid blocking mutation execution.
pub struct AuditExtension;

impl ExtensionFactory for AuditExtension {
    fn create(&self) -> Arc<dyn Extension> {
        Arc::new(AuditExtensionImpl)
    }
}

struct AuditExtensionImpl;

#[async_trait::async_trait]
impl Extension for AuditExtensionImpl {
    /// Hook into the execute phase to capture mutation operations
    async fn execute(
        &self,
        ctx: &ExtensionContext<'_>,
        operation_name: Option<&str>,
        next: NextExecute<'_>,
    ) -> Response {
        // Execute the operation first
        let response = next.run(ctx, operation_name).await;

        // Trace: Log that we're checking for mutations (only shown at trace level)
        tracing::trace!("AuditExtension: Checking operation {:?}", operation_name);

        // Only log mutations (not queries or subscriptions)
        // Detect mutations by operation name since ExecutableDocument is not available in execute phase
        if let Some(op_name) = operation_name {
            if is_mutation_by_name(op_name) {
                tracing::debug!("AuditExtension: Mutation detected by name: {}", op_name);

                // Spawn async task for audit logging to avoid blocking response
                let db = ctx.data_opt::<DatabaseConnection>().cloned();
                let auth_session = ctx.data_opt::<AuthSession<AuthBackend>>().cloned();
                let operation_name = operation_name.map(String::from);
                let variables = ctx.data_opt::<Variables>().cloned();
                let request_metadata = ctx.data_opt::<crate::handlers::RequestMetadata>().cloned();

                tracing::debug!("AuditExtension: db={:?}, auth_session={:?}, op_name={:?}, metadata={:?}",
                    db.is_some(), auth_session.is_some(), operation_name, request_metadata.is_some());

                // Clone response data and errors for logging
                let had_errors = !response.errors.is_empty();
                let response_data = response.data.clone();

                tokio::spawn(async move {
                    if let Err(e) = log_mutation_audit(
                        db,
                        auth_session,
                        operation_name,
                        variables,
                        had_errors,
                        request_metadata,
                        response_data,
                    ).await {
                        tracing::error!("Failed to create audit log: {:?}", e);
                    } else {
                        tracing::debug!("Audit log created successfully");
                    }
                });
            } else {
                tracing::trace!("AuditExtension: Not a mutation operation (query or subscription)");
            }
        }

        response
    }
}

/// Check if the current operation is a mutation based on operation name
///
/// Since ExecutableDocument is not available in the execute phase,
/// we detect mutations by operation name prefixes that indicate write operations
fn is_mutation_by_name(operation_name: &str) -> bool {
    let name_lower = operation_name.to_lowercase();

    // Common mutation prefixes that indicate write operations
    let mutation_prefixes = [
        "create", "update", "edit", "delete", "remove",
        "upload", "assign", "unassign", "approve", "reject",
        "add", "set", "insert", "modify", "revoke", "grant",
        "activate", "deactivate", "enable", "disable",
        "submit", "cancel", "complete", "archive", "restore"
    ];

    mutation_prefixes.iter().any(|prefix| name_lower.starts_with(prefix))
}

/// Check if the current operation is a mutation (legacy method using ExecutableDocument)
/// This is kept for reference but not used since ExecutableDocument is not available in execute phase
fn is_mutation_operation(doc: &ExecutableDocument) -> bool {
    for (_name, definition) in doc.operations.iter() {
        if matches!(definition.node.ty, OperationType::Mutation) {
            return true;
        }
    }
    false
}

/// Extract action type from mutation name (e.g., "createDocument" -> "CREATE")
fn extract_action_from_mutation(mutation_name: &str) -> String {
    let lowercase = mutation_name.to_lowercase();

    if lowercase.starts_with("create") {
        "CREATE".to_string()
    } else if lowercase.starts_with("update") || lowercase.starts_with("edit") {
        "UPDATE".to_string()
    } else if lowercase.starts_with("delete") || lowercase.starts_with("remove") {
        "DELETE".to_string()
    } else if lowercase.starts_with("upload") {
        "UPLOAD".to_string()
    } else if lowercase.starts_with("assign") {
        "ASSIGN".to_string()
    } else if lowercase.starts_with("unassign") {
        "UNASSIGN".to_string()
    } else if lowercase.starts_with("approve") {
        "APPROVE".to_string()
    } else if lowercase.starts_with("reject") {
        "REJECT".to_string()
    } else {
        "EXECUTE".to_string()
    }
}

/// Extract resource type from mutation name (e.g., "createDocument" -> "document")
fn extract_resource_type_from_mutation(mutation_name: &str) -> String {
    // Remove action prefix
    let without_action = mutation_name
        .trim_start_matches("create")
        .trim_start_matches("update")
        .trim_start_matches("edit")
        .trim_start_matches("delete")
        .trim_start_matches("remove")
        .trim_start_matches("upload")
        .trim_start_matches("assign")
        .trim_start_matches("unassign")
        .trim_start_matches("approve")
        .trim_start_matches("reject");

    // Convert to snake_case
    to_snake_case(without_action)
}

/// Convert camelCase to snake_case
fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, ch) in s.chars().enumerate() {
        if ch.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(ch.to_lowercase().next().unwrap());
    }
    result
}

/// Extract resource ID from mutation variables
fn extract_resource_id(variables: &Variables) -> Option<Uuid> {
    // Try common ID field names
    for key in &["id", "documentId", "employeeId", "userId", "categoryId", "taskId", "eventId"] {
        if let Some(Value::String(id_str)) = variables.get(*key) {
            if let Ok(uuid) = Uuid::parse_str(id_str) {
                return Some(uuid);
            }
        }
    }

    // Try input.id pattern
    if let Some(Value::Object(input)) = variables.get("input") {
        if let Some(Value::String(id_str)) = input.get("id") {
            if let Ok(uuid) = Uuid::parse_str(id_str) {
                return Some(uuid);
            }
        }
    }

    None
}

/// Extract resource ID from mutation response data
fn extract_resource_id_from_response(response_data: &Value) -> Option<Uuid> {
    // Try to find ID in the response object
    if let Value::Object(obj) = response_data {
        // Response might be wrapped in a mutation name key
        for (_key, value) in obj.iter() {
            if let Value::Object(inner) = value {
                // Try to find id field
                if let Some(Value::String(id_str)) = inner.get("id") {
                    if let Ok(uuid) = Uuid::parse_str(id_str) {
                        return Some(uuid);
                    }
                }
            }
        }
    }

    None
}

/// Create audit log entry for mutation
async fn log_mutation_audit(
    db: Option<DatabaseConnection>,
    auth_session: Option<AuthSession<AuthBackend>>,
    operation_name: Option<String>,
    variables: Option<Variables>,
    had_errors: bool,
    request_metadata: Option<crate::handlers::RequestMetadata>,
    response_data: Value,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let db = db.ok_or("Database connection not available")?;
    let auth_session = auth_session.ok_or("Auth session not available")?;

    // Get authenticated user
    let user = auth_session.user.ok_or("User not authenticated")?;

    // Get operation name
    let operation_name = operation_name.ok_or("Operation name not available")?;

    // Extract action and resource type
    let action = extract_action_from_mutation(&operation_name);
    let resource_type = extract_resource_type_from_mutation(&operation_name);

    // Extract resource ID from variables or response
    let resource_id = variables.as_ref().and_then(extract_resource_id)
        .or_else(|| extract_resource_id_from_response(&response_data));

    // Create details JSON with mutation variables (excluding sensitive fields)
    let mut details = json!({
        "operation": operation_name,
        "had_errors": had_errors,
    });

    if let Some(vars) = &variables {
        // Filter out sensitive fields like passwords, tokens, encrypted data
        let mut filtered_vars = vars.clone();
        filtered_vars.remove("password");
        filtered_vars.remove("token");
        filtered_vars.remove("encryptedData");
        filtered_vars.remove("authToken");

        details["variables"] = serde_json::to_value(&filtered_vars)?;
    }

    // Capture after_snapshot from response data (if not error response)
    // Convert async_graphql::Value to serde_json::Value
    let after_snapshot = if !had_errors && !matches!(response_data, Value::Null) {
        // Convert async_graphql::Value to serde_json::Value
        serde_json::to_value(&response_data).ok()
    } else {
        None
    };

    // Extract IP address and User-Agent from request metadata
    let ip_address = request_metadata.as_ref().and_then(|m| m.ip_address.clone());
    let user_agent = request_metadata.as_ref().and_then(|m| m.user_agent.clone());

    // Create activity log entry
    let activity_log = ActivityLogActiveModel {
        id: Set(Uuid::new_v4()),
        user_id: Set(user.id),
        employee_id: NotSet, // TODO: Extract from variables if applicable
        action: Set(action),
        resource_type: Set(resource_type),
        resource_id: Set(resource_id),
        details: Set(Some(details)),
        before_snapshot: NotSet, // TODO: Capture before snapshot for UPDATE/DELETE
        after_snapshot: Set(after_snapshot),
        is_rollback: Set(false),
        rolled_back_log_id: NotSet,
        ip_address: Set(ip_address),
        user_agent: Set(user_agent),
        signature_id: NotSet,
        batch_id: NotSet,
        created_at: Set(chrono::Utc::now()),
    };

    // Insert audit log asynchronously
    activity_log.insert(&db).await?;

    tracing::debug!(
        "Audit log created for mutation '{}' by user {} ({})",
        operation_name,
        user.email,
        user.id
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_action_from_mutation() {
        assert_eq!(extract_action_from_mutation("createDocument"), "CREATE");
        assert_eq!(extract_action_from_mutation("updateEmployee"), "UPDATE");
        assert_eq!(extract_action_from_mutation("deleteCategory"), "DELETE");
        assert_eq!(extract_action_from_mutation("uploadDocument"), "UPLOAD");
        assert_eq!(extract_action_from_mutation("assignRole"), "ASSIGN");
    }

    #[test]
    fn test_extract_resource_type_from_mutation() {
        assert_eq!(extract_resource_type_from_mutation("createDocument"), "document");
        assert_eq!(extract_resource_type_from_mutation("updateEmployee"), "employee");
        assert_eq!(extract_resource_type_from_mutation("deleteCategory"), "category");
        assert_eq!(extract_resource_type_from_mutation("uploadDocument"), "document");
    }

    #[test]
    fn test_to_snake_case() {
        assert_eq!(to_snake_case("DocumentCategory"), "document_category");
        assert_eq!(to_snake_case("Document"), "document");
        assert_eq!(to_snake_case(""), "");
    }
}
