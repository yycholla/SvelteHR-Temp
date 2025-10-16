//! HR GraphQL Server with axum-login authentication
//!
//! This server provides GraphQL API endpoints for the SvelteHR system
//! with session-based authentication using axum-login.

use std::net::SocketAddr;

use axum::{
    extract::Request,
    http::{header, Method},
    middleware as axum_middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use axum_login::AuthManagerLayerBuilder;
use sea_orm::DatabaseConnection;
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tower_sessions::{cookie::SameSite, Expiry, SessionManagerLayer};

use crate::{
    auth::AuthBackend,
    database::create_db_connection,
    handlers::{graphql_handler, graphql_playground, login_handler, logout_handler, me_handler, refresh_handler, sessions_handler},
    middleware::{optional_session_auth_middleware, security_headers_middleware, session_auth_middleware, admin_session_auth_middleware},
};

mod auth;
mod database;
mod error;
mod handlers;
mod middleware;
mod models;
mod schema;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // Load configuration
    dotenv::dotenv().ok();
    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "4000".to_string())
        .parse::<u16>()?;
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Create database connection
    let db = create_db_connection(&database_url).await?;
    tracing::info!("Connected to database");

    // Create session store (using memory store for now - TODO: implement proper SeaORM session store)
    let session_store = tower_sessions::MemoryStore::default();

    // Configure session layer with secure cookie settings
    let session_layer = SessionManagerLayer::new(session_store.clone())
        .with_secure(true) // HTTPS only in production
        .with_http_only(true) // Prevent JavaScript access
        .with_same_site(SameSite::Strict) // Strict same-site policy
        .with_expiry(Expiry::OnInactivity(time::Duration::minutes(30))); // 30 minute inactivity

    // Create session store
    let session_store = tower_sessions::MemoryStore::default();

    // Configure session layer with secure cookie settings
    let session_layer = SessionManagerLayer::new(session_store.clone())
        .with_secure(true) // HTTPS only in production
        .with_http_only(true) // Prevent JavaScript access
        .with_same_site(SameSite::Strict) // Strict same-site policy
        .with_expiry(Expiry::OnInactivity(time::Duration::minutes(30))); // 30 minute inactivity

    // Create authentication backend
    let auth_backend = AuthBackend::new(db.clone());

    // Create authentication layer
    let auth_layer = AuthManagerLayerBuilder::new(auth_backend, session_layer.clone()).build();

    // Build CORS layer
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_origin(Any); // Configure appropriately for production

    // Build the application
    let app = Router::new()
        // Authentication endpoints
        .route("/auth/login", axum::routing::post(login_handler))
        .route("/auth/logout", axum::routing::post(logout_handler))
        .route("/auth/me", axum::routing::get(me_handler))
        .route("/auth/refresh", axum::routing::post(refresh_handler))
        .route("/auth/sessions", axum::routing::get(sessions_handler))
        // GraphQL endpoints with optional session auth
        .route("/graphql",
            get(graphql_playground)
            .post(graphql_handler)
            .layer(axum_middleware::from_fn(optional_session_auth_middleware))
        )
        // Health check
        .route("/health", get(health_check))
        // Apply middleware layers
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(cors)
                .layer(axum_middleware::from_fn(security_headers_middleware))
                .layer(session_layer)
                .layer(auth_layer)
        )
        // Store database connection for handlers
        .with_state(db);

    // Start server
    let addr = format!("{}:{}", host, port)
        .parse::<SocketAddr>()?;

    tracing::info!("🚀 Server starting on http://{}", addr);
    tracing::info!("📊 GraphQL playground: http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    axum::Json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}