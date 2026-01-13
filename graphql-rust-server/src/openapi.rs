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
        description = "REST API endpoints for SvelteHR system. GraphQL endpoints are documented separately via the GraphQL playground at /graphql.",
        contact(
            name = "SvelteHR Team",
        )
    ),
    paths(
        // Authentication endpoints
        crate::handlers::login_handler,
        crate::handlers::logout_handler,
        crate::handlers::me_handler,
        crate::handlers::refresh_handler,
        crate::handlers::sessions_handler,

        // REST API endpoints
        crate::handlers::events::delete_event_handler,
        crate::handlers::roles::get_roles_handler,
        crate::handlers::users::get_users_handler,
    ),
    components(
        schemas(
            // Authentication types
            crate::handlers::LoginRequest,
            crate::handlers::LoginResponse,
            crate::handlers::UserInfo,
            crate::handlers::RefreshResponse,
            crate::handlers::SessionInfoResponse,
            crate::handlers::SessionsResponse,

            // Models (add as needed)
            crate::models::role::Model,
            crate::models::user::Model,
        )
    ),
    tags(
        (name = "Authentication", description = "Session-based authentication endpoints"),
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
