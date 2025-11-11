//! Seed Data Binary
//!
//! Populates database with realistic test data for development.
//! Automatically invoked on container startup when ENABLE_SEED_DATA=true.

use hr_graphql_server::database;
use hr_graphql_server::seed_data::{EntitySeedResult, SeedConfig, SeedError, SeedResult};
use std::process;

#[tokio::main]
async fn main() {
    // Initialize tracing subscriber
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"))
        )
        .init();

    // Production safety check
    if let Err(e) = check_production_safety() {
        eprintln!("Error: {}", e);
        process::exit(1);
    }

    // Load configuration from environment
    let config = SeedConfig::from_env();

    // Get database URL from environment
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/hr_dev".to_string());

    // Connect to database
    let db = match database::create_db_connection(&database_url).await {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("Database connection failed: {}", e);
            process::exit(2);
        }
    };

    tracing::info!("Seed data binary started");
    tracing::info!("Configuration: {:?}", config);

    // Initialize seed context
    let context = match hr_graphql_server::seed_data::context::initialize_seed_context(&db, config).await {
        Ok(ctx) => {
            tracing::info!("Seed context initialized with batch_id: {}", ctx.batch_id);
            ctx
        }
        Err(e) => {
            eprintln!("Failed to initialize seed context: {}", e);
            process::exit(3);
        }
    };

    // Execute seeding in dependency order
    let mut overall_result = SeedResult::new(context.batch_id);
    let start_time = std::time::Instant::now();

    // Phase 1: Foundation entities (no dependencies)
    tracing::info!("=== Phase 1: Foundation Entities ===");
    execute_and_aggregate(&mut overall_result, "roles",
        hr_graphql_server::seed_data::builders::seed_roles(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "permissions",
        hr_graphql_server::seed_data::builders::seed_permissions(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "role_permissions",
        hr_graphql_server::seed_data::builders::seed_role_permissions(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "leave_types",
        hr_graphql_server::seed_data::builders::seed_leave_types(&db, &context).await);

    // Phase 2: Core entities (Department ↔ User circular dependency)
    tracing::info!("=== Phase 2: Core Entities ===");
    execute_and_aggregate(&mut overall_result, "departments",
        hr_graphql_server::seed_data::builders::seed_departments(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "users",
        hr_graphql_server::seed_data::builders::seed_users(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "department_managers",
        hr_graphql_server::seed_data::builders::update_department_managers(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "user_managers",
        hr_graphql_server::seed_data::builders::assign_user_managers(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "user_role_assignments",
        hr_graphql_server::seed_data::builders::seed_user_role_assignments(&db, &context).await);

    // Phase 3: Extended entities (depend on users)
    tracing::info!("=== Phase 3: Extended Entities ===");
    execute_and_aggregate(&mut overall_result, "leave_balances",
        hr_graphql_server::seed_data::builders::seed_leave_balances(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "employee_skills",
        hr_graphql_server::seed_data::builders::seed_employee_skills(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "employee_certifications",
        hr_graphql_server::seed_data::builders::seed_employee_certifications(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "emergency_contacts",
        hr_graphql_server::seed_data::builders::seed_emergency_contacts(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "user_addresses",
        hr_graphql_server::seed_data::builders::seed_user_addresses(&db, &context).await);

    // Phase 4: Operational entities (depend on multiple entities)
    tracing::info!("=== Phase 4: Operational Entities ===");
    execute_and_aggregate(&mut overall_result, "leave_requests",
        hr_graphql_server::seed_data::builders::seed_leave_requests(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "events",
        hr_graphql_server::seed_data::builders::seed_events(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "documents",
        hr_graphql_server::seed_data::builders::seed_documents(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "task_types",
        hr_graphql_server::seed_data::builders::seed_task_types(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "tasks",
        hr_graphql_server::seed_data::builders::seed_tasks(&db, &context).await);
    execute_and_aggregate(&mut overall_result, "time_entries",
        hr_graphql_server::seed_data::builders::seed_time_entries(&db, &context).await);

    let duration = start_time.elapsed();

    // Print summary
    tracing::info!("=== Seed Data Summary ===");
    tracing::info!("Total execution time: {:.2}s", duration.as_secs_f64());
    tracing::info!("Total records created: {}", overall_result.total_created());
    tracing::info!("Total records skipped: {}", overall_result.total_skipped());
    tracing::info!("Total failures: {}", overall_result.total_failed());

    if overall_result.total_failed() > 0 {
        tracing::warn!("Seeding completed with {} failures", overall_result.total_failed());
        process::exit(3); // Partial failure
    } else {
        tracing::info!("Seed data binary completed successfully");
        process::exit(0);
    }
}

/// Production safety check - prevents accidental production execution
fn check_production_safety() -> Result<(), SeedError> {
    let enable_seed = std::env::var("ENABLE_SEED_DATA")
        .unwrap_or_default()
        .to_lowercase();
    let environment = std::env::var("ENVIRONMENT")
        .unwrap_or_default()
        .to_lowercase();

    if enable_seed == "true" || environment == "development" {
        Ok(())
    } else {
        Err(SeedError::ProductionSafetyBlock)
    }
}

/// Execute a seeding function and aggregate its result (continue-on-failure pattern)
fn execute_and_aggregate(
    overall_result: &mut SeedResult,
    entity_name: &str,
    result: Result<EntitySeedResult, SeedError>,
) {
    match result {
        Ok(entity_result) => {
            tracing::info!(
                "{}: created={}, skipped={}, failed={}",
                entity_name,
                entity_result.created_count,
                entity_result.skipped_count,
                entity_result.failed_count
            );
            overall_result.add(entity_result);
        }
        Err(e) => {
            tracing::error!("{}: Seed operation failed: {}", entity_name, e);
            let mut error_result = EntitySeedResult::new(entity_name);
            error_result.failed_count = 1;
            error_result.errors.push(e.to_string());
            overall_result.add(error_result);
        }
    }
}
