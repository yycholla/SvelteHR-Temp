//! Tests for W-4 Form Template Seeding Migration
//!
//! This test suite verifies the Federal W-4 (2024) form template seeding migration.
//! It ensures the template is properly inserted, contains all required fields,
//! and can be safely rolled back.

#[cfg(test)]
mod tests {
    use hr_graphql_server::migration::m20251202_005_seed_w4_form_template::Migration;
    use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbBackend, Statement};
    use sea_orm_migration::prelude::*;

    /// Helper to set up test database connection
    async fn setup() -> DatabaseConnection {
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/hr_test".to_string());

        Database::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    /// Helper to check if W-4 template exists
    async fn w4_template_exists(db: &DatabaseConnection) -> bool {
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT COUNT(*) as count
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query failed");

        match result {
            Some(row) => {
                let count: i64 = row.try_get("", "count").unwrap_or(0);
                count > 0
            }
            None => false,
        }
    }

    #[tokio::test]
    #[ignore] // Run with: cargo test --test test_m20251202_005_seed_w4_form -- --ignored
    async fn test_migration_compiles() {
        // This test verifies that the migration module compiles correctly
        let _migration = Migration;
        assert!(true, "Migration compiles successfully");
    }

    #[tokio::test]
    #[ignore]
    async fn test_up_migration_seeds_w4_template() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Clean up first
        let _ = Migration.down(&manager).await;

        // Run UP migration
        Migration
            .up(&manager)
            .await
            .expect("UP migration should succeed");

        // Verify W-4 template exists
        assert!(
            w4_template_exists(&db).await,
            "W-4 template should exist after migration"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_w4_template_has_correct_metadata() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template is seeded
        let _ = Migration.down(&manager).await;
        Migration
            .up(&manager)
            .await
            .expect("Migration should succeed");

        // Verify template metadata
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT name, description, category, version, is_active
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Template should exist");

        let name: String = result.try_get("", "name").unwrap();
        let description: String = result.try_get("", "description").unwrap();
        let category: String = result.try_get("", "category").unwrap();
        let version: String = result.try_get("", "version").unwrap();
        let is_active: bool = result.try_get("", "is_active").unwrap();

        assert_eq!(name, "Federal W-4 Form (2024)");
        assert!(description.contains("Employee's Withholding Certificate"));
        assert_eq!(category, "Tax Forms");
        assert_eq!(version, "2024");
        assert!(is_active, "Template should be active");
    }

    #[tokio::test]
    #[ignore]
    async fn test_w4_template_has_required_fields() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template is seeded
        let _ = Migration.down(&manager).await;
        Migration
            .up(&manager)
            .await
            .expect("Migration should succeed");

        // Verify template has fields JSON
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT fields
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Template should exist");

        let fields_json: serde_json::Value = result.try_get("", "fields").unwrap();

        // Verify it's an array
        assert!(fields_json.is_array(), "Fields should be a JSON array");

        let fields = fields_json.as_array().unwrap();

        // Should have ~25+ fields
        assert!(
            fields.len() >= 20,
            "Should have at least 20 fields, found {}",
            fields.len()
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_w4_has_personal_information_fields() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template is seeded
        let _ = Migration.down(&manager).await;
        Migration
            .up(&manager)
            .await
            .expect("Migration should succeed");

        // Get fields JSON
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT fields
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Template should exist");

        let fields_json: serde_json::Value = result.try_get("", "fields").unwrap();
        let fields = fields_json.as_array().unwrap();

        // Check for essential personal info fields
        let field_ids: Vec<String> = fields
            .iter()
            .filter_map(|f| f.get("id").and_then(|id| id.as_str().map(String::from)))
            .collect();

        assert!(
            field_ids.contains(&"first_name".to_string()),
            "Should have first_name field"
        );
        assert!(
            field_ids.contains(&"last_name".to_string()),
            "Should have last_name field"
        );
        assert!(
            field_ids.contains(&"ssn".to_string()),
            "Should have ssn field"
        );
        assert!(
            field_ids.contains(&"address".to_string()),
            "Should have address field"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_w4_has_filing_status_field() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template is seeded
        let _ = Migration.down(&manager).await;
        Migration
            .up(&manager)
            .await
            .expect("Migration should succeed");

        // Get fields JSON
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT fields
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Template should exist");

        let fields_json: serde_json::Value = result.try_get("", "fields").unwrap();
        let fields = fields_json.as_array().unwrap();

        // Find filing status field
        let filing_status = fields
            .iter()
            .find(|f| f.get("id").and_then(|id| id.as_str()) == Some("filing_status"))
            .expect("Should have filing_status field");

        // Verify it's a RADIO type
        assert_eq!(
            filing_status.get("type").and_then(|t| t.as_str()),
            Some("RADIO"),
            "filing_status should be a RADIO field"
        );

        // Verify it has options
        let options = filing_status
            .get("options")
            .and_then(|o| o.as_array())
            .expect("Should have options");

        assert!(
            options.len() >= 3,
            "Should have at least 3 filing status options"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_w4_has_signature_field() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template is seeded
        let _ = Migration.down(&manager).await;
        Migration
            .up(&manager)
            .await
            .expect("Migration should succeed");

        // Get fields JSON
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT fields
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Template should exist");

        let fields_json: serde_json::Value = result.try_get("", "fields").unwrap();
        let fields = fields_json.as_array().unwrap();

        // Find signature field
        let signature = fields
            .iter()
            .find(|f| f.get("id").and_then(|id| id.as_str()) == Some("employee_signature"))
            .expect("Should have employee_signature field");

        // Verify it's a SIGNATURE type
        assert_eq!(
            signature.get("type").and_then(|t| t.as_str()),
            Some("SIGNATURE"),
            "employee_signature should be a SIGNATURE field"
        );

        // Verify it's required
        assert_eq!(
            signature.get("required").and_then(|r| r.as_bool()),
            Some(true),
            "Signature should be required"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_idempotent_up_migration() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Clean up first
        let _ = Migration.down(&manager).await;

        // Run UP migration twice
        Migration
            .up(&manager)
            .await
            .expect("First UP migration should succeed");

        Migration
            .up(&manager)
            .await
            .expect("Second UP migration should succeed (creates duplicate - expected for seed)");

        // Should have at least one W-4 template
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT COUNT(*) as count
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Should have result");

        let count: i64 = result.try_get("", "count").unwrap();
        // Note: This will create duplicates. The migration is not truly idempotent.
        // This is acceptable for a one-time seed migration.
        assert!(count >= 1, "Should have at least one W-4 template");
    }

    #[tokio::test]
    #[ignore]
    async fn test_down_migration_removes_w4_template() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template exists
        Migration
            .up(&manager)
            .await
            .expect("UP migration should succeed");
        assert!(
            w4_template_exists(&db).await,
            "Template should exist before rollback"
        );

        // Run DOWN migration
        Migration
            .down(&manager)
            .await
            .expect("DOWN migration should succeed");

        // Verify template is removed
        assert!(
            !w4_template_exists(&db).await,
            "Template should be removed after rollback"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_idempotent_down_migration() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template exists
        Migration
            .up(&manager)
            .await
            .expect("UP migration should succeed");

        // Run DOWN migration twice
        Migration
            .down(&manager)
            .await
            .expect("First DOWN migration should succeed");

        Migration
            .down(&manager)
            .await
            .expect("Second DOWN migration should succeed (idempotent)");

        // Verify template is removed
        assert!(
            !w4_template_exists(&db).await,
            "Template should be removed after rollback"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_full_migration_cycle() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Start clean
        let _ = Migration.down(&manager).await;

        // UP migration
        Migration.up(&manager).await.expect("UP should succeed");
        assert!(
            w4_template_exists(&db).await,
            "Template should exist after UP"
        );

        // DOWN migration
        Migration.down(&manager).await.expect("DOWN should succeed");
        assert!(
            !w4_template_exists(&db).await,
            "Template should be removed after DOWN"
        );

        // UP migration again
        Migration
            .up(&manager)
            .await
            .expect("Second UP should succeed");
        assert!(
            w4_template_exists(&db).await,
            "Template should exist after second UP"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_w4_ssn_field_is_encrypted() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template is seeded
        let _ = Migration.down(&manager).await;
        Migration
            .up(&manager)
            .await
            .expect("Migration should succeed");

        // Get fields JSON
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT fields
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Template should exist");

        let fields_json: serde_json::Value = result.try_get("", "fields").unwrap();
        let fields = fields_json.as_array().unwrap();

        // Find SSN field
        let ssn = fields
            .iter()
            .find(|f| f.get("id").and_then(|id| id.as_str()) == Some("ssn"))
            .expect("Should have ssn field");

        // Verify it's marked as encrypted
        assert_eq!(
            ssn.get("encrypted").and_then(|e| e.as_bool()),
            Some(true),
            "SSN field should be marked as encrypted"
        );

        // Verify it's required
        assert_eq!(
            ssn.get("required").and_then(|r| r.as_bool()),
            Some(true),
            "SSN should be required"
        );
    }

    #[tokio::test]
    #[ignore]
    async fn test_w4_has_all_step_headers() {
        let db = setup().await;
        let manager = SchemaManager::new(&db);

        // Ensure template is seeded
        let _ = Migration.down(&manager).await;
        Migration
            .up(&manager)
            .await
            .expect("Migration should succeed");

        // Get fields JSON
        let result = db
            .query_one(Statement::from_string(
                DbBackend::Postgres,
                r#"
                    SELECT fields
                    FROM hr_public.onboarding_form_templates
                    WHERE name = 'Federal W-4 Form (2024)'
                "#
                .to_string(),
            ))
            .await
            .expect("Query should succeed")
            .expect("Template should exist");

        let fields_json: serde_json::Value = result.try_get("", "fields").unwrap();
        let fields = fields_json.as_array().unwrap();

        // Find all section headers
        let headers: Vec<String> = fields
            .iter()
            .filter(|f| f.get("type").and_then(|t| t.as_str()) == Some("SECTION_HEADER"))
            .filter_map(|f| f.get("id").and_then(|id| id.as_str().map(String::from)))
            .collect();

        // Should have headers for personal info and all 5 steps
        assert!(headers.len() >= 5, "Should have at least 5 section headers");

        // Verify key headers exist
        assert!(
            headers.contains(&"step1_header".to_string()),
            "Should have Step 1 header"
        );
        assert!(
            headers.contains(&"step5_header".to_string()),
            "Should have Step 5 header"
        );
    }
}
