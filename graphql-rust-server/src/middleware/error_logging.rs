//! Error logging extension for GraphQL operations
//!
//! This extension provides comprehensive error logging for GraphQL operations,
//! capturing exceptions, validation errors, and execution failures with structured
//! JSON logging for better observability and debugging.

use async_graphql::{
    extensions::{Extension, ExtensionContext, ExtensionFactory, NextExecute},
    Response,
};
use std::sync::Arc;
use std::time::Instant;

/// Error logging extension for GraphQL operations
///
/// This extension hooks into the execution phase of GraphQL operations to capture:
/// - Execution errors during resolver execution
/// - Performance metrics for operations
/// - User context and request metadata
///
/// All errors are logged in structured JSON format with relevant context.
pub struct ErrorLoggingExtension;

impl ExtensionFactory for ErrorLoggingExtension {
    fn create(&self) -> Arc<dyn Extension> {
        Arc::new(ErrorLoggingExtensionImpl)
    }
}

struct ErrorLoggingExtensionImpl;

#[async_trait::async_trait]
impl Extension for ErrorLoggingExtensionImpl {
    /// Hook into execution phase to capture resolver errors and performance
    async fn execute(
        &self,
        ctx: &ExtensionContext<'_>,
        operation_name: Option<&str>,
        next: NextExecute<'_>,
    ) -> Response {
        let start_time = Instant::now();

        let response = next.run(ctx, operation_name).await;
        let execution_duration = start_time.elapsed();

        // Extract operation details
        let operation_type = extract_operation_type(ctx);
        let user_id = extract_user_id(ctx);
        let request_metadata = extract_request_metadata(ctx);

        // Log execution metrics
        if !response.errors.is_empty() {
            // Log detailed error information
            for error in &response.errors {
                tracing::error!(
                    user_id = %user_id.as_deref().unwrap_or("anonymous"),
                    ip_address = %request_metadata.as_ref().and_then(|m| m.ip_address.as_deref()).unwrap_or("unknown"),
                    operation_name = %operation_name.unwrap_or("anonymous"),
                    operation_type = %operation_type,
                    error_message = %error.message,
                    error_path = ?error.path,
                    error_extensions = ?error.extensions,
                    execution_duration_ms = execution_duration.as_millis(),
                    "GraphQL execution error"
                );
            }

            // Log summary with performance metrics
            tracing::warn!(
                user_id = %user_id.as_deref().unwrap_or("anonymous"),
                operation_name = %operation_name.unwrap_or("anonymous"),
                operation_type = %operation_type,
                error_count = response.errors.len(),
                execution_duration_ms = execution_duration.as_millis(),
                "GraphQL operation completed with errors"
            );
        } else {
            // Successful operations - logging disabled to reduce verbosity
            // Uncomment for debugging:
            // tracing::debug!(
            //     user_id = %user_id.as_deref().unwrap_or("anonymous"),
            //     operation_name = %operation_name.unwrap_or("anonymous"),
            //     operation_type = %operation_type,
            //     execution_duration_ms = execution_duration.as_millis(),
            //     "GraphQL operation completed successfully"
            // );
        }

        response
    }
}

/// Extract user ID from extension context
fn extract_user_id(ctx: &ExtensionContext<'_>) -> Option<String> {
    ctx.data_opt::<crate::auth::UserContext>()
        .map(|user_context| user_context.user_id.to_string())
}

/// Extract request metadata from extension context
fn extract_request_metadata(
    ctx: &ExtensionContext<'_>,
) -> Option<crate::handlers::RequestMetadata> {
    ctx.data_opt::<crate::handlers::RequestMetadata>().cloned()
}

/// Extract operation type from the parsed document
fn extract_operation_type(_ctx: &ExtensionContext<'_>) -> &'static str {
    // Simplified implementation - operation type detection would require more complex parsing
    // For now, we'll rely on the operation name patterns or default to "unknown"
    "unknown"
}
