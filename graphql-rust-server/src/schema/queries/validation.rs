//! GraphQL queries for validation system

use async_graphql::{Context, Object, Result as GqlResult};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder};

use crate::database::get_db_from_context;
use crate::models::{validation_failure, validation_rule};

/// GraphQL object for ValidationRule
#[derive(Debug, Clone, async_graphql::SimpleObject)]
#[graphql(name = "ValidationRule")]
pub struct ValidationRuleGraphQL {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub entity_type: String,
    pub field_name: String,
    pub rule_type: String,
    pub condition: String,
    pub severity: String,
    pub auto_fix_strategy: String,
    pub enabled: bool,
    pub created_at: String,
}

impl From<validation_rule::Model> for ValidationRuleGraphQL {
    fn from(model: validation_rule::Model) -> Self {
        Self {
            id: model.id.to_string(),
            name: model.name,
            description: model.description,
            entity_type: model.entity_type,
            field_name: model.field_name,
            rule_type: model.rule_type,
            condition: model.condition,
            severity: model.severity,
            auto_fix_strategy: model.auto_fix_strategy,
            enabled: model.enabled,
            created_at: model.created_at.to_rfc3339(),
        }
    }
}

/// GraphQL object for ValidationFailure
#[derive(Debug, Clone, async_graphql::SimpleObject)]
#[graphql(name = "ValidationFailure")]
pub struct ValidationFailureGraphQL {
    pub id: String,
    pub rule_id: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub field_name: String,
    pub invalid_value: Option<String>,
    pub error_message: String,
    pub severity: String,
    pub detected_at: String,
    pub resolved_at: Option<String>,
    pub resolution: Option<String>,
}

impl From<validation_failure::Model> for ValidationFailureGraphQL {
    fn from(model: validation_failure::Model) -> Self {
        Self {
            id: model.id.to_string(),
            rule_id: model.rule_id.to_string(),
            entity_type: model.entity_type,
            entity_id: model.entity_id,
            field_name: model.field_name,
            invalid_value: model.invalid_value,
            error_message: model.error_message,
            severity: model.severity,
            detected_at: model.detected_at.to_rfc3339(),
            resolved_at: model.resolved_at.map(|dt| dt.to_rfc3339()),
            resolution: model.resolution,
        }
    }
}

/// Validation queries
#[derive(Default)]
pub struct ValidationQuery;

#[Object]
impl ValidationQuery {
    /// Get all validation rules
    async fn validation_rules(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Filter by entity type")] entity_type: Option<String>,
        #[graphql(desc = "Filter by enabled status")] enabled: Option<bool>,
    ) -> GqlResult<Vec<ValidationRuleGraphQL>> {
        let db = get_db_from_context(ctx)?;

        let mut query = validation_rule::Entity::find();

        if let Some(entity_type) = entity_type {
            query = query.filter(validation_rule::Column::EntityType.eq(entity_type));
        }

        if let Some(enabled) = enabled {
            query = query.filter(validation_rule::Column::Enabled.eq(enabled));
        }

        let rules = query
            .order_by_asc(validation_rule::Column::EntityType)
            .order_by_asc(validation_rule::Column::Name)
            .all(&db)
            .await?;

        Ok(rules.into_iter().map(ValidationRuleGraphQL::from).collect())
    }

    /// Get validation failures
    async fn validation_failures(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Filter by entity type")] entity_type: Option<String>,
        #[graphql(desc = "Filter by entity ID")] entity_id: Option<String>,
        #[graphql(desc = "Include resolved failures")] include_resolved: Option<bool>,
        #[graphql(desc = "Limit number of results")] limit: Option<u64>,
    ) -> GqlResult<Vec<ValidationFailureGraphQL>> {
        let db = get_db_from_context(ctx)?;

        let mut query = validation_failure::Entity::find();

        if let Some(entity_type) = entity_type {
            query = query.filter(validation_failure::Column::EntityType.eq(entity_type));
        }

        if let Some(entity_id) = entity_id {
            query = query.filter(validation_failure::Column::EntityId.eq(entity_id));
        }

        // By default, only show unresolved failures
        if !include_resolved.unwrap_or(false) {
            query = query.filter(validation_failure::Column::ResolvedAt.is_null());
        }

        query = query.order_by_desc(validation_failure::Column::DetectedAt);

        let failures = if let Some(limit) = limit {
            query.paginate(&db, limit).fetch_page(0).await?
        } else {
            query.paginate(&db, 100).fetch_page(0).await?
        };

        Ok(failures
            .into_iter()
            .map(ValidationFailureGraphQL::from)
            .collect())
    }

    /// Get validation failures count by severity
    async fn validation_failures_summary(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Filter by entity type")] entity_type: Option<String>,
    ) -> GqlResult<ValidationFailuresSummary> {
        let db = get_db_from_context(ctx)?;

        let mut query = validation_failure::Entity::find()
            .filter(validation_failure::Column::ResolvedAt.is_null());

        if let Some(entity_type_val) = entity_type {
            query = query.filter(validation_failure::Column::EntityType.eq(entity_type_val));
        }

        let failures = query.all(&db).await?;

        let error_count = failures.iter().filter(|f| f.severity == "ERROR").count();
        let warning_count = failures.iter().filter(|f| f.severity == "WARNING").count();
        let info_count = failures.iter().filter(|f| f.severity == "INFO").count();

        Ok(ValidationFailuresSummary {
            total: failures.len() as i32,
            error_count: error_count as i32,
            warning_count: warning_count as i32,
            info_count: info_count as i32,
        })
    }
}

/// Summary of validation failures
#[derive(Debug, Clone, async_graphql::SimpleObject)]
pub struct ValidationFailuresSummary {
    pub total: i32,
    pub error_count: i32,
    pub warning_count: i32,
    pub info_count: i32,
}
