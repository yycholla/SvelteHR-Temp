//! OpenAPI documentation configuration for REST endpoints
//!
//! This module defines the OpenAPI/Swagger documentation for all REST API endpoints.
//! GraphQL endpoints are documented separately via the GraphQL playground.

use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "SvelteHR REST API",
        version = "0.0.1",
        description = "REST API endpoints for SvelteHR system. Authentication is handled via GraphQL mutations (login, logout, refreshToken). GraphQL endpoints are documented separately via the GraphQL playground at /graphql.",
        contact(
            name = "SvelteHR Team",
        )
    ),
    paths(
        // Password reset endpoints (PUBLIC)
        crate::handlers::password_reset::request_password_reset_handler,
        crate::handlers::password_reset::reset_password_handler,

        // REST API endpoints
        crate::handlers::events::delete_event_handler,
        crate::handlers::roles::get_roles_handler,
        crate::handlers::users::get_users_handler,
    ),
    components(
        schemas(
            // Password reset types
            crate::handlers::password_reset::RequestPasswordResetRequest,
            crate::handlers::password_reset::RequestPasswordResetResponse,
            crate::handlers::password_reset::ResetPasswordRequest,
            crate::handlers::password_reset::ResetPasswordResponse,

            // Models (add as needed)
            crate::models::role::Model,
            crate::models::user::Model,
        )
    ),
    tags(
        (name = "Authentication", description = "JWT authentication via GraphQL mutations (login, logout, refreshToken)"),
        (name = "Events", description = "Event management endpoints"),
        (name = "Roles", description = "Role management endpoints"),
        (name = "Users", description = "User management endpoints"),
    ),
    servers(
        (url = "http://localhost:4000", description = "Local development server"),
        (url = "https://api.sveltehr.com", description = "Production server"),
    )
)]
pub struct ApiDoc;
