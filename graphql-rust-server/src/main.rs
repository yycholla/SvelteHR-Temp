//! HR GraphQL Server with JWT authentication
//!
//! This server provides GraphQL API endpoints for the SvelteHR system
//! with JWT-based authentication using RS256 signed tokens.

use std::env;
use std::net::SocketAddr;

use axum::{
    http::{header, HeaderValue, Method},
    middleware as axum_middleware,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use tower::ServiceBuilder;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};

use hr_graphql_server::{
    auth,
    config::Config,
    database::create_db_connection,
    dataloader::DataLoaderContext,
    handlers::{
        events::delete_event_handler, graphql_handler, graphql_playground,
        intuit_oauth::intuit_oauth_callback_handler, intuit_webhook::intuit_webhook_handler,
        roles::get_roles_handler, users::get_users_handler,
        webhook_progress::webhook_progress_stream, AppState,
    },
    logging,
    middleware::{jwt_auth_middleware, optional_jwt_middleware, security_headers_middleware},
    openapi::ApiDoc,
    scheduler,
    schema::create_schema,
};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging with optional Loki integration
    logging::init_logging()?;

    // Initialize Sentry for error tracking and performance monitoring
    let _sentry_guard = sentry::init((
        std::env::var("SENTRY_DSN").unwrap_or_default(),
        sentry::ClientOptions {
            release: sentry::release_name!(),
            environment: Some(
                std::env::var("RUST_SENTRY_ENVIRONMENT")
                    .or_else(|_| std::env::var("ENVIRONMENT"))
                    .unwrap_or_else(|_| "development".to_string())
                    .into(),
            ),
            traces_sample_rate: std::env::var("RUST_SENTRY_TRACES_SAMPLE_RATE")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0.2), // Default 20% sampling
            attach_stacktrace: true,
            ..Default::default()
        },
    ));

    if !std::env::var("SENTRY_DSN").unwrap_or_default().is_empty() {
        tracing::info!("Sentry error tracking enabled");
    }

    // Load configuration
    dotenv::dotenv().ok();
    let config = Config::from_env()?;
    let host = std::env::var("HOST").unwrap_or_else(|_| config.host);
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| config.port.to_string())
        .parse::<u16>()?;
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| config.database_url);

    // Create database connection
    let db = create_db_connection(&database_url).await?;
    tracing::info!("Connected to database");

    // Initialize JWT service for token-based authentication
    let jwt_config = auth::JwtConfig::from_env().expect(
        "Failed to load JWT configuration. Ensure JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are set.",
    );

    // Load JWT keys from files (supports both file paths and environment variables)
    let jwt_keys = match (
        env::var("JWT_PRIVATE_KEY_PATH"),
        env::var("JWT_PUBLIC_KEY_PATH")
    ) {
        (Ok(private_path), Ok(public_path)) => {
            auth::JwtKeys::from_files(&private_path, &public_path)
                .expect("Failed to load JWT keys from files")
        }
        _ => {
            auth::JwtKeys::from_env()
                .expect("Failed to load JWT keys. Set JWT_PRIVATE_KEY_PATH/JWT_PUBLIC_KEY_PATH or JWT_PRIVATE_KEY/JWT_PUBLIC_KEY")
        }
    };

    let jwt_service = auth::JwtService::new(jwt_config, jwt_keys, db.clone());
    tracing::info!("JWT service initialized");

    // Create GraphQL schema singleton
    let schema = create_schema();
    tracing::info!("GraphQL schema initialized");

    // Create DataLoader context
    let dataloaders = DataLoaderContext::new(db.clone());

    // Initialize email service (optional - only if SMTP credentials are configured)
    let email_service = match hr_graphql_server::services::EmailConfig::from_env() {
        Ok(email_config) => {
            match hr_graphql_server::services::EmailService::new(email_config) {
                Ok(service) => {
                    tracing::info!("📧 Email service initialized successfully");
                    Some(std::sync::Arc::new(service))
                }
                Err(e) => {
                    tracing::warn!("Failed to initialize email service: {}. Email features will not be available.", e);
                    None
                }
            }
        }
        Err(e) => {
            tracing::warn!(
                "Email configuration not found: {}. Email features will not be available.",
                e
            );
            None
        }
    };

    // Create application state
    let app_state = AppState {
        db: db.clone(),
        schema,
        dataloaders,
        email_service: email_service.clone(),
        jwt_service,
    };

    // JWT authentication is configured in JwtService and used via jwt_auth_middleware
    // No session layer needed - JWT tokens are stateless

    // Build CORS layer - allow specific origins for credentials
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_credentials(true)
        .allow_origin([
            HeaderValue::from_static("http://localhost:5173"),
            HeaderValue::from_static("http://localhost:3000"),
        ]);

    // Build the application
    let app = Router::new()
        // Swagger UI for REST API documentation
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        // JWT Authentication is handled via GraphQL mutations:
        // - login: mutation { login(input: { email, password }) }
        // - logout: mutation { logout }
        // - refreshToken: mutation { refreshToken(input: { refreshToken, refreshTokenPlaintext }) }
        // Password reset endpoints (PUBLIC - no auth required)
        .route(
            "/api/auth/request-reset",
            post(hr_graphql_server::handlers::password_reset::request_password_reset_handler),
        )
        .route(
            "/api/auth/reset-password",
            post(hr_graphql_server::handlers::password_reset::reset_password_handler),
        )
        // REST API endpoints
        .route(
            "/api/events/{id}",
            axum::routing::delete(delete_event_handler).layer(axum_middleware::from_fn_with_state(
                app_state.clone(),
                jwt_auth_middleware,
            )),
        )
        .route(
            "/api/roles",
            axum::routing::get(get_roles_handler).layer(axum_middleware::from_fn_with_state(
                app_state.clone(),
                jwt_auth_middleware,
            )),
        )
        .route(
            "/api/users",
            axum::routing::get(get_users_handler).layer(axum_middleware::from_fn_with_state(
                app_state.clone(),
                jwt_auth_middleware,
            )),
        )
        .route(
            "/api/upload",
            post(hr_graphql_server::handlers::upload::upload_handler).layer(
                axum_middleware::from_fn_with_state(app_state.clone(), jwt_auth_middleware),
            ),
        )
        // QuickBooks OAuth callback (no auth - public callback from QuickBooks)
        .route("/api/intuit/callback", get(intuit_oauth_callback_handler))
        // QuickBooks webhook endpoint (no auth - uses HMAC signature verification)
        .route("/api/intuit/webhook", post(intuit_webhook_handler))
        // Webhook progress SSE endpoint (requires auth)
        .route(
            "/api/webhooks/process/{batch_id}/progress",
            get(webhook_progress_stream).layer(axum_middleware::from_fn_with_state(
                app_state.clone(),
                jwt_auth_middleware,
            )),
        )
        .nest_service("/uploads", ServeDir::new("uploads"))
        // GraphQL endpoints with optional JWT auth
        .route(
            "/graphql",
            get(graphql_playground).post(graphql_handler).layer(
                axum_middleware::from_fn_with_state(app_state.clone(), optional_jwt_middleware),
            ),
        )
        // Health check
        .route("/health", get(health_check))
        // Apply middleware layers
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(cors)
                .layer(axum_middleware::from_fn(security_headers_middleware))
                // Sentry layers for error tracking and distributed tracing
                .layer(sentry_tower::NewSentryLayer::new_from_top())
                .layer(
                    #[allow(deprecated)]
                    sentry_tower::SentryHttpLayer::with_transaction(),
                ), // JWT authentication handled per-route via jwt_auth_middleware
        )
        // Store application state for handlers
        .with_state(app_state);

    // Start server
    let addr = format!("{}:{}", host, port).parse::<SocketAddr>()?;

    // JWT tokens are stateless - no cleanup task needed
    // Expired refresh tokens are cleaned up via database migration/cron job if needed

    // Start employee statistics scheduler (captures daily snapshots)
    scheduler::start_employee_statistics_scheduler(db.clone()).await;
    tracing::info!("📊 Employee statistics scheduler started");

    // Start digest scheduler
    match hr_graphql_server::services::DigestScheduler::new(
        std::sync::Arc::new(db.clone()),
        email_service,
    )
    .await
    {
        Ok(scheduler) => {
            if let Err(e) = scheduler.start().await {
                tracing::error!("Failed to start digest scheduler: {}", e);
            } else {
                tracing::info!("📬 Email digest scheduler started");
                // Keep the scheduler alive by moving it into a background task
                tokio::spawn(async move {
                    let _keep_alive = scheduler;
                    loop {
                        tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
                    }
                });
            }
        }
        Err(e) => {
            tracing::error!("Failed to initialize digest scheduler: {}", e);
        }
    }

    tracing::info!("🚀 Server starting on http://{}", addr);
    tracing::info!("📊 GraphQL playground: http://{}/graphql", addr);
    tracing::info!("📚 Swagger UI (REST API docs): http://{}/swagger-ui", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    axum::Json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}
