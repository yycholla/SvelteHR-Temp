//! Migration CLI entry point
//!
//! Run migrations with: `cargo run --bin migration`
//! Available commands:
//!   - up: Apply pending migrations
//!   - down: Rollback last migration
//!   - fresh: Drop all tables and re-run migrations
//!   - refresh: Rollback all and re-run migrations
//!   - reset: Rollback all migrations
//!   - status: Check migration status
//!   - validate: Validate migration files for idempotency issues

use hr_graphql_server::migration::{MigrationValidator, Migrator};
use sea_orm_migration::prelude::*;
use std::env;

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();

    // Check if the first argument is "validate"
    if args.len() > 1 && args[1] == "validate" {
        println!("🔍 Validating migration files...\n");

        let validator = MigrationValidator::new("./migration");
        let report = validator.validate();

        report.print_report();

        // Exit with error code if there are critical issues
        if report.critical_count() > 0 || report.high_count() > 0 {
            std::process::exit(1);
        } else {
            std::process::exit(0);
        }
    }

    // Use Migrator from lib.rs - SINGLE SOURCE OF TRUTH
    cli::run_cli(Migrator).await;
}
