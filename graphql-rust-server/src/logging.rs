//! Logging configuration with Loki integration
//!
//! This module sets up structured logging with optional Loki push support.
//! Logs are formatted as JSON and sent to Loki for centralized log aggregation.

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Initialize logging with optional Loki integration
///
/// # Environment Variables
/// - `RUST_LOG`: Log level filter (default: "info")
/// - `LOKI_URL`: Loki endpoint URL (e.g., "http://loki-stack.monitoring.svc.cluster.local:3100")
/// - `LOKI_ENABLED`: Enable Loki logging ("true" or "false", default: "false")
pub fn init_logging() -> Result<(), Box<dyn std::error::Error>> {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    #[cfg(feature = "loki")]
    {
        let loki_enabled = std::env::var("LOKI_ENABLED")
            .unwrap_or_else(|_| "false".to_string())
            .to_lowercase() == "true";

        if loki_enabled {
            let loki_url = std::env::var("LOKI_URL")
                .unwrap_or_else(|_| "http://loki-stack.monitoring.svc.cluster.local:3100".to_string());

            tracing::info!("Loki logging enabled: {}", loki_url);

            let (loki_layer, task) = tracing_loki::layer(
                url::Url::parse(&loki_url)?,
                vec![
                    ("service".to_string(), "sveltehr-backend".to_string()),
                    ("environment".to_string(), std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".to_string())),
                ]
                .into_iter()
                .collect(),
                vec![].into_iter().collect(),
            )?;

            // Spawn background task to send logs
            tokio::spawn(task);

            // Register subscriber with Loki layer
            tracing_subscriber::registry()
                .with(env_filter)
                .with(loki_layer)
                .with(tracing_subscriber::fmt::layer().json())
                .init();

            return Ok(());
        }
    }

    // Fallback: Standard logging without Loki
    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .json()
        .init();

    Ok(())
}
