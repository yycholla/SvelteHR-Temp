//! HTTP request handlers

use axum::{
    extract::{Extension, State},
    response::Html,
};
use sea_orm::DatabaseConnection;

use crate::{
    dataloader::DataLoaderContext,
    schema::GraphQLSchema,
};

pub mod events;
pub mod roles;
pub mod users;
pub mod upload;
pub mod intuit_webhook;
pub mod intuit_oauth;
pub mod password_reset;
pub mod webhook_progress;

/// Application state containing shared resources
#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub schema: GraphQLSchema,
    pub dataloaders: DataLoaderContext,
    pub email_service: Option<std::sync::Arc<crate::services::EmailService>>,
    pub jwt_service: crate::auth::JwtService,
}

/// GraphQL playground handler (using GraphiQL - no external CDN dependencies)
pub async fn graphql_playground() -> Html<String> {
    Html(async_graphql::http::graphiql_source(
        "/graphql",
        None,  // Subscriptions endpoint (optional)
    ))
}

// ============================================================================
// REMOVED: Session-based authentication handlers
// ============================================================================
//
// The following REST handlers have been removed in favor of GraphQL mutations:
//
// - login_handler -> Use GraphQL mutation: login(input: { email, password })
// - logout_handler -> Use GraphQL mutation: logout
// - me_handler -> Use GraphQL query: me
// - refresh_handler -> Use GraphQL mutation: refreshToken(input: { refreshToken, refreshTokenPlaintext })
// - sessions_handler -> No longer needed (JWT tokens are stateless)
//
// Authentication is now handled via:
// 1. GraphQL mutations in src/schema/mutations/auth.rs
// 2. JWT middleware in src/middleware/jwt_auth.rs
// 3. JWT service in src/auth/jwt_service.rs
//
// ============================================================================

/// Request metadata for audit logging
#[derive(Debug, Clone)]
pub struct RequestMetadata {
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

/// GraphQL handler
pub async fn graphql_handler(
    State(app_state): State<AppState>,
    headers: axum::http::HeaderMap,
    user_context_ext: Option<Extension<crate::auth::UserContext>>,
    req: async_graphql_axum::GraphQLRequest,
) -> async_graphql_axum::GraphQLResponse {
    let mut request = req.into_inner();

    // Extract user context from JWT middleware (if authenticated)
    if let Some(Extension(user_context)) = user_context_ext {
        request = request.data(user_context);
    }

    // Add request metadata for audit logging
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or("").trim().to_string())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(String::from)
        });

    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    let metadata = RequestMetadata {
        ip_address,
        user_agent,
    };

    request = request.data(metadata);

    // Add database connection, dataloaders, and JWT service to GraphQL context
    request = request
        .data(app_state.db.clone())
        .data(app_state.dataloaders.clone())
        .data(app_state.jwt_service.clone());

    // Execute GraphQL request
    app_state.schema.execute(request).await.into()
}

/// Health check handler
pub async fn health_check() -> &'static str {
    "OK"
}
