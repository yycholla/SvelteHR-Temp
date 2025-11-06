mod query;
mod mutation;
mod mutations;

pub use query::QueryRoot;
pub use mutation::MutationRoot;
use crate::middleware::ErrorLoggingExtension;

/// Type alias for the GraphQL schema
pub type GraphQLSchema = async_graphql::Schema<QueryRoot, MutationRoot, async_graphql::EmptySubscription>;

/// Create a singleton GraphQL schema
///
/// This function builds the schema once at startup and returns it.
/// The schema is configured with empty data that gets populated per-request
/// through the request context.
///
/// Includes AuditExtension for automatic mutation logging to activity_logs table
/// and ErrorLoggingExtension for comprehensive error tracking.
pub fn create_schema() -> GraphQLSchema {
    async_graphql::Schema::build(QueryRoot, MutationRoot, async_graphql::EmptySubscription)
        .extension(crate::middleware::AuditExtension)
        .extension(ErrorLoggingExtension)
        .finish()
}

/// Page info for cursor-based pagination
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, async_graphql::SimpleObject)]
pub struct PageInfo {
    pub has_next_page: bool,
    pub has_previous_page: bool,
    pub start_cursor: Option<String>,
    pub end_cursor: Option<String>,
}
