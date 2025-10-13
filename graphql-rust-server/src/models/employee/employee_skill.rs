//! Employee Skill Model with Proficiency Tracking
//!
//! Maps to hr_public.employee_skills table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult, SimpleObject};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Proficiency level for employee skills
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "proficiency_level", rename_all = "lowercase")]
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

/// Employee skill with proficiency tracking
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EmployeeSkill {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub skill_name: String,
    pub proficiency_level: ProficiencyLevel,
    pub years_experience: Option<f64>,
    pub verified: bool,
    pub verifier_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl EmployeeSkill {
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
        self.proficiency_level
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
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.employee_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    /// Verifier relationship (lazy-loaded)
    async fn verifier(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        if let Some(verifier_id) = self.verifier_id {
            let pool = ctx.data::<PgPool>()?;
            let user = sqlx::query_as::<_, crate::models::User>(
                r#"
                SELECT id, email, first_name, last_name, full_name, phone,
                       department_id, manager_id, hire_date, termination_date,
                       status, created_at, updated_at, deleted_at
                FROM hr_public.users
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(verifier_id)
            .fetch_optional(pool)
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
