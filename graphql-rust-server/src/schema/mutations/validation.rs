//! GraphQL mutations for validation system

use async_graphql::{Context, Object, Result as GqlResult, InputObject};
use chrono::Utc;
use sea_orm::{EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait};
use uuid::Uuid;

use crate::database::get_db_from_context;
use crate::models::{validation_rule, validation_failure};
use crate::schema::queries::validation::{ValidationRuleGraphQL, ValidationFailureGraphQL};

/// Input for creating a validation rule
#[derive(Debug, Clone, InputObject)]
pub struct CreateValidationRuleInput {
    pub name: String,
    pub description: Option<String>,
    pub entity_type: String,
    pub field_name: String,
    pub rule_type: String,
    pub condition: String,
    pub severity: String,
    pub auto_fix_strategy: String,
    pub enabled: bool,
}

/// Input for updating a validation rule
#[derive(Debug, Clone, InputObject)]
pub struct UpdateValidationRuleInput {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub enabled: Option<bool>,
    pub severity: Option<String>,
}

/// Input for resolving a validation failure
#[derive(Debug, Clone, InputObject)]
pub struct ResolveValidationFailureInput {
    pub id: String,
    pub resolution: String, // AUTO_FIXED, MANUALLY_FIXED, IGNORED
}

/// Validation mutations
#[derive(Default)]
pub struct ValidationMutation;

#[Object]
impl ValidationMutation {
    /// Create a new validation rule
    async fn create_validation_rule(
        &self,
        ctx: &Context<'_>,
        input: CreateValidationRuleInput,
    ) -> GqlResult<ValidationRuleGraphQL> {
        let db = get_db_from_context(ctx)?;

        let new_rule = validation_rule::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(input.name),
            description: Set(input.description),
            entity_type: Set(input.entity_type),
            field_name: Set(input.field_name),
            rule_type: Set(input.rule_type),
            condition: Set(input.condition),
            severity: Set(input.severity),
            auto_fix_strategy: Set(input.auto_fix_strategy),
            enabled: Set(input.enabled),
            created_by: Set(None), // TODO: Get from authenticated user
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let result = new_rule.insert(&db).await?;
        Ok(ValidationRuleGraphQL::from(result))
    }

    /// Update a validation rule
    async fn update_validation_rule(
        &self,
        ctx: &Context<'_>,
        input: UpdateValidationRuleInput,
    ) -> GqlResult<ValidationRuleGraphQL> {
        let db = get_db_from_context(ctx)?;

        let rule_id = Uuid::parse_str(&input.id)
            .map_err(|_| "Invalid rule ID")?;

        let rule = validation_rule::Entity::find_by_id(rule_id)
            .one(&db)
            .await?
            .ok_or("Validation rule not found")?;

        let mut active_model: validation_rule::ActiveModel = rule.into();

        if let Some(name) = input.name {
            active_model.name = Set(name);
        }

        if let Some(description) = input.description {
            active_model.description = Set(Some(description));
        }

        if let Some(enabled) = input.enabled {
            active_model.enabled = Set(enabled);
        }

        if let Some(severity) = input.severity {
            active_model.severity = Set(severity);
        }

        active_model.updated_at = Set(Utc::now());

        let result = active_model.update(&db).await?;
        Ok(ValidationRuleGraphQL::from(result))
    }

    /// Delete a validation rule
    async fn delete_validation_rule(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> GqlResult<bool> {
        let db = get_db_from_context(ctx)?;

        let rule_id = Uuid::parse_str(&id)
            .map_err(|_| "Invalid rule ID")?;

        let result = validation_rule::Entity::delete_by_id(rule_id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Resolve a validation failure
    async fn resolve_validation_failure(
        &self,
        ctx: &Context<'_>,
        input: ResolveValidationFailureInput,
    ) -> GqlResult<ValidationFailureGraphQL> {
        let db = get_db_from_context(ctx)?;

        let failure_id = Uuid::parse_str(&input.id)
            .map_err(|_| "Invalid failure ID")?;

        let failure = validation_failure::Entity::find_by_id(failure_id)
            .one(&db)
            .await?
            .ok_or("Validation failure not found")?;

        let mut active_model: validation_failure::ActiveModel = failure.into();
        active_model.resolved_at = Set(Some(Utc::now()));
        active_model.resolution = Set(Some(input.resolution));

        let result = active_model.update(&db).await?;
        Ok(ValidationFailureGraphQL::from(result))
    }

    /// Bulk resolve validation failures by entity
    async fn resolve_validation_failures_by_entity(
        &self,
        ctx: &Context<'_>,
        entity_type: String,
        entity_id: String,
        resolution: String,
    ) -> GqlResult<i32> {
        let db = get_db_from_context(ctx)?;

        let failures = validation_failure::Entity::find()
            .filter(validation_failure::Column::EntityType.eq(entity_type.clone()))
            .filter(validation_failure::Column::EntityId.eq(Some(entity_id.clone())))
            .filter(validation_failure::Column::ResolvedAt.is_null())
            .all(&db)
            .await?;

        let mut count = 0;
        for failure in failures {
            let mut active_model: validation_failure::ActiveModel = failure.into();
            active_model.resolved_at = Set(Some(Utc::now()));
            active_model.resolution = Set(Some(resolution.clone()));
            active_model.update(&db).await?;
            count += 1;
        }

        Ok(count)
    }
}
