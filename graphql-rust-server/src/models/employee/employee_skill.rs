//! Employee Skill Model with Proficiency Tracking
//!
//! Maps to hr_public.employee_skills table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Proficiency level for employee skills
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum ProficiencyLevel {
    #[graphql(name = "BEGINNER")]
    Beginner,
    #[graphql(name = "INTERMEDIATE")]
    Intermediate,
    #[graphql(name = "ADVANCED")]
    Advanced,
    #[graphql(name = "EXPERT")]
    Expert,
}

impl ProficiencyLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            ProficiencyLevel::Beginner => "beginner",
            ProficiencyLevel::Intermediate => "intermediate",
            ProficiencyLevel::Advanced => "advanced",
            ProficiencyLevel::Expert => "expert",
        }
    }
}

/// Employee skill with proficiency tracking
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "employee_skills")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub skill_name: String,
    pub proficiency_level: String, // Will be converted to enum in GraphQL
    pub years_experience: Option<f64>,
    pub verified: bool,
    pub verifier_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::EmployeeId",
        to = "crate::models::user::Column::Id"
    )]
    Employee,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::VerifierId",
        to = "crate::models::user::Column::Id"
    )]
    Verifier,
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "employeeId")]
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    #[graphql(name = "skillName")]
    async fn skill_name(&self) -> &str {
        &self.skill_name
    }

    #[graphql(name = "proficiencyLevel")]
    async fn proficiency_level(&self) -> ProficiencyLevel {
        match self.proficiency_level.as_str() {
            "beginner" => ProficiencyLevel::Beginner,
            "intermediate" => ProficiencyLevel::Intermediate,
            "advanced" => ProficiencyLevel::Advanced,
            "expert" => ProficiencyLevel::Expert,
            _ => ProficiencyLevel::Beginner, // Default fallback
        }
    }

    #[graphql(name = "yearsExperience")]
    async fn years_experience(&self) -> Option<f64> {
        self.years_experience
    }

    async fn verified(&self) -> bool {
        self.verified
    }

    #[graphql(name = "verifierId")]
    async fn verifier_id(&self) -> Option<Uuid> {
        self.verifier_id
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Employee relationship (lazy-loaded)
    async fn employee(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.employee_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }

    /// Verifier relationship (lazy-loaded)
    async fn verifier(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        if let Some(verifier_id) = self.verifier_id {
            let db = get_db_from_context(ctx)?;
            let user = crate::models::user::Entity::find_by_id(verifier_id)
                .one(&db)
                .await?;

            Ok(user)
        } else {
            Ok(None)
        }
    }
}

/// Input for creating a new employee skill
#[derive(Debug, Clone, InputObject)]
pub struct CreateEmployeeSkillInput {
    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,
    #[graphql(name = "skillName")]
    pub skill_name: String,
    #[graphql(name = "proficiencyLevel")]
    pub proficiency_level: ProficiencyLevel,
    #[graphql(name = "yearsExperience")]
    pub years_experience: Option<f64>,
    pub verified: Option<bool>,
}

/// Input for updating an employee skill
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEmployeeSkillInput {
    pub id: Uuid,
    #[graphql(name = "skillName")]
    pub skill_name: Option<String>,
    #[graphql(name = "proficiencyLevel")]
    pub proficiency_level: Option<ProficiencyLevel>,
    #[graphql(name = "yearsExperience")]
    pub years_experience: Option<f64>,
    pub verified: Option<bool>,
    #[graphql(name = "verifierId")]
    pub verifier_id: Option<Uuid>,
    #[graphql(name = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

/// Filter for querying employee skills
#[derive(Debug, Clone, InputObject)]
pub struct EmployeeSkillFilter {
    #[graphql(name = "employeeId")]
    pub employee_id: Option<Uuid>,
    #[graphql(name = "skillName")]
    pub skill_name: Option<String>,
    #[graphql(name = "proficiencyLevel")]
    pub proficiency_level: Option<ProficiencyLevel>,
    pub verified: Option<bool>,
}
