//! HR GraphQL Server with axum-login authentication
//!
//! This server provides GraphQL API endpoints for the SvelteHR system
//! with session-based authentication using axum-login.

use std::net::SocketAddr;

use axum::{
    extract::{connect_info::IntoMakeServiceWithConnectInfo, Request},
    http::{header, HeaderValue, Method},
    middleware as axum_middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use axum_login::AuthManagerLayerBuilder;
use sea_orm::DatabaseConnection;
use tower::ServiceBuilder;
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
};
use tower_sessions::{cookie::SameSite, Expiry, SessionManagerLayer};

use crate::{
    auth::AuthBackend,
    database::create_db_connection,
    handlers::{graphql_handler, graphql_playground, login_handler, logout_handler, me_handler, refresh_handler, sessions_handler},
    middleware::{optional_session_auth_middleware, security_headers_middleware, session_auth_middleware, admin_session_auth_middleware},
};
use hr_graphql_server::config::Config;

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
    let config = Config::from_env()?;
    let host = std::env::var("HOST").unwrap_or_else(|_| config.host);
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| config.port.to_string())
        .parse::<u16>()?;
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| config.database_url);

    // Create database connection
    let db = create_db_connection(&database_url).await?;
    tracing::info!("Connected to database");

    // Create SeaORM session store for persistent sessions
    let session_store = crate::auth::SeaOrmSessionStore::new(db.clone());

    // Configure session layer with secure cookie settings
    // Use secure cookies only in production (requires HTTPS)
    let is_production = std::env::var("NODE_ENV")
        .or_else(|_| std::env::var("ENVIRONMENT"))
        .map(|env| env.to_lowercase() == "production")
        .unwrap_or(false);

    tracing::info!("Session cookie security: secure={}, http_only=true, same_site=Lax", is_production);

    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(is_production) // HTTPS only in production
        .with_http_only(true) // Prevent JavaScript access
        .with_same_site(SameSite::Lax) // Lax same-site policy for better compatibility
        .with_expiry(Expiry::OnInactivity(time::Duration::hours(24))); // 24 hour inactivity

    // Create authentication backend
    let auth_backend = AuthBackend::new(db.clone());

    // Create authentication layer
    let auth_layer = AuthManagerLayerBuilder::new(auth_backend, session_layer.clone()).build();

    // Build CORS layer - allow specific origins for credentials
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_credentials(true)
        .allow_origin([
            HeaderValue::from_static("http://localhost:5173"),
            HeaderValue::from_static("http://localhost:3000"),
        ]);

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
        .with_state(db.clone());

    // Start server
    let addr = format!("{}:{}", host, port)
        .parse::<SocketAddr>()?;

    // Start session cleanup task
    let cleanup_db = db.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3600)); // Run every hour
        loop {
            interval.tick().await;
            match crate::auth::session_store::cleanup_expired_sessions(&cleanup_db).await {
                Ok(count) => {
                    if count > 0 {
                        tracing::info!("Cleaned up {} expired sessions", count);
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to cleanup expired sessions: {:?}", e);
                }
            }
        }
    });

    tracing::info!("🚀 Server starting on http://{}", addr);
    tracing::info!("📊 GraphQL playground: http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;

    Ok(())
}

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    axum::Json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}