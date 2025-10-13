mod auth;
mod config;
mod db;
mod graphql;
mod loaders;
mod middleware;
mod models;
mod schema;

use anyhow::Result;
use axum::{
    body::Body,
    extract::{FromRequest, Request},
    http::{HeaderValue, Method},
    middleware as axum_middleware,
    response::{Html, IntoResponse},
    routing::{get, post},
    Extension, Router,
};
use http_body_util::BodyExt;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use async_graphql::{
    http::{playground_source, GraphQLPlaygroundConfig},
    EmptySubscription, Schema,
};
use async_graphql_axum::GraphQLResponse;

use crate::{
    auth::{login_handler, UserContext},
    config::Config,
    db::create_pool,
    graphql::DEFAULT_MAX_DEPTH,
    middleware::jwt_auth_middleware,
    schema::{MutationRoot, QueryRoot},
};

// Type alias for our GraphQL schema
type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

/// Custom GraphQL handler that extracts UserContext from HTTP request extensions
/// and adds it to the GraphQL context
async fn graphql_handler(
    Extension(schema): Extension<AppSchema>,
    req: Request,
) -> GraphQLResponse {
    // Extract UserContext from request extensions (set by JWT middleware)
    let (parts, body) = req.into_parts();
    let user_context = parts.extensions.get::<UserContext>().cloned();

    // Collect body bytes
    let body_bytes = match body.collect().await {
        Ok(collected) => collected.to_bytes(),
        Err(_) => return async_graphql::Response::default().into(),
    };

    // Parse JSON into GraphQL request
    let gql_request: async_graphql::Request = match serde_json::from_slice(&body_bytes) {
        Ok(req) => req,
        Err(_) => return async_graphql::Response::default().into(),
    };

    // Build GraphQL request with UserContext in the data
    let mut request = gql_request;
    if let Some(user_ctx) = user_context {
        request = request.data(user_ctx);
    }

    // Execute the GraphQL query
    schema.execute(request).await.into()
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,hr_graphql_server=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    dotenv::dotenv().ok();
    let config = Config::from_env()?;

    tracing::info!("Starting HR GraphQL Server");
    tracing::info!("Database URL: {}", config.database_url);
    tracing::info!("Server: {}:{}", config.host, config.port);

    // Create database pool
    let pool = create_pool(&config.database_url).await?;
    tracing::info!("Database connection pool created");

    // Build GraphQL schema
    // TODO: Add depth and complexity limiting via validation rules
    let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(pool.clone())
        .limit_depth(DEFAULT_MAX_DEPTH)     // Built-in depth limiting
        .finish();

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(
            config
                .cors_allowed_origins
                .split(',')
                .map(|s| s.parse::<HeaderValue>().unwrap())
                .collect::<Vec<_>>(),
        )
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ]);

    // Build router with middleware chain
    // Protected GraphQL routes (require JWT authentication)
    let graphql_router = Router::new()
        .route("/", get(graphql_playground).post(graphql_handler))
        .route("/graphql", get(graphql_playground).post(graphql_handler))
        .layer(Extension(schema))
        .layer(axum_middleware::from_fn(jwt_auth_middleware));

    // Public routes (no authentication required)
    let public_router = Router::new()
        .route("/health", get(health_check))
        .route("/auth/login", post(login_handler))
        .layer(Extension(pool.clone()));  // Make database pool available

    // Combine routers and apply global middleware
    let app = Router::new()
        .merge(graphql_router)
        .merge(public_router)
        .layer(TraceLayer::new_for_http())  // Request/response tracing
        .layer(cors);

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("🚀 GraphQL server ready at http://{}/graphql", addr);
    tracing::info!("🎮 GraphQL Playground available at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn graphql_playground() -> impl IntoResponse {
    Html(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
}

async fn health_check() -> impl IntoResponse {
    "OK"
}
