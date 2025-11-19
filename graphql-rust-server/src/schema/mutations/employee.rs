//! Employee data management mutations
//!
//! Handles employee certifications, goals, skills, emergency contacts, and vehicles

use async_graphql::{Context, Object, Result};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    error::AppError,
    models::{
        CreateEmployeeCertificationInput, CreateEmployeeGoalInput, CreateEmployeeSkillInput,
        CreateEmployeeVehicleInput, CreateEmergencyContactInput, EmergencyContact,
        EmployeeCertification, EmployeeGoal, EmployeeSkill, EmployeeVehicle, GoalStatus,
        UpdateEmployeeGoalInput, UpdateEmployeeSkillInput, UpdateEmployeeVehicleInput,
        UpdateEmergencyContactInput,
    },
};

/// Employee data management operations
pub struct EmployeeMutations;

#[Object]
impl EmployeeMutations {
    // ============================================================
    // Employee Skills Management
    // ============================================================

    /// Create a new employee skill
    async fn create_employee_skill(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeSkillInput,
    ) -> Result<EmployeeSkill> {
        let db = get_db_from_context(ctx)?;

        let skill = crate::models::employee::employee_skill::ActiveModel {
            employee_id: Set(input.employee_id),
            skill_name: Set(input.skill_name.clone()),
            proficiency_level: Set(input.proficiency_level.as_str().to_string()),
            years_experience: Set(input.years_experience),
            ..Default::default()
        };

        let skill = skill.insert(&db).await?;
        Ok(skill)
    }

    /// Update an existing employee skill
    async fn update_employee_skill(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeSkillInput,
    ) -> Result<EmployeeSkill> {
        let db = get_db_from_context(ctx)?;

        // Find existing employee skill
        let existing_skill = crate::models::employee::employee_skill::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee skill not found".to_string()))?;

        // Build active model with updates
        let mut skill: crate::models::employee::employee_skill::ActiveModel = existing_skill.into();

        if let Some(skill_name) = input.skill_name {
            skill.skill_name = Set(skill_name);
        }

        if let Some(proficiency_level) = input.proficiency_level {
            skill.proficiency_level = Set(proficiency_level.as_str().to_string());
        }

        if let Some(years_experience) = input.years_experience {
            skill.years_experience = Set(Some(years_experience));
        }

        // Update timestamp
        skill.updated_at = Set(Utc::now());

        // Save changes
        let updated_skill = skill.update(&db).await?;
        Ok(updated_skill)
    }

    /// Delete an employee skill (hard delete - no soft delete for skills)
    async fn delete_employee_skill(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::employee_skill::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // ============================================================
    // Employee Certifications Management
    // ============================================================

    /// Create a new employee certification
    async fn create_employee_certification(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeCertificationInput,
    ) -> Result<EmployeeCertification> {
        let db = get_db_from_context(ctx)?;

        let cert = crate::models::employee::employee_certification::ActiveModel {
            employee_id: Set(input.employee_id),
            certification_name: Set(input.certification_name.clone()),
            issuing_organization: Set(input.issuing_organization.clone()),
            issue_date: Set(input.issue_date),
            expiration_date: Set(input.expiration_date),
            certification_number: Set(input.certification_number.clone()),
            ..Default::default()
        };

        let cert = cert.insert(&db).await?;
        Ok(cert)
    }

    /// Delete an employee certification (hard delete)
    async fn delete_employee_certification(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::employee_certification::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // ============================================================
    // Employee Vehicles Management
    // ============================================================

    /// Create a new employee vehicle
    async fn create_employee_vehicle(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeVehicleInput,
    ) -> Result<EmployeeVehicle> {
        let db = get_db_from_context(ctx)?;

        let vehicle = crate::models::employee::employee_vehicle::ActiveModel {
            employee_id: Set(input.employee_id),
            make: Set(input.make.clone()),
            model: Set(input.model.clone()),
            year: Set(input.year),
            license_plate: Set(input.license_plate.clone()),
            color: Set(input.color.clone()),
            ..Default::default()
        };

        let vehicle = vehicle.insert(&db).await?;
        Ok(vehicle)
    }

    /// Update an existing employee vehicle
    async fn update_employee_vehicle(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeVehicleInput,
    ) -> Result<EmployeeVehicle> {
        let db = get_db_from_context(ctx)?;

        // Find existing employee vehicle
        let existing_vehicle = crate::models::employee::employee_vehicle::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee vehicle not found".to_string()))?;

        // Build active model with updates
        let mut vehicle: crate::models::employee::employee_vehicle::ActiveModel = existing_vehicle.into();

        if let Some(make) = input.make {
            vehicle.make = Set(make);
        }

        if let Some(model) = input.model {
            vehicle.model = Set(model);
        }

        if let Some(year) = input.year {
            vehicle.year = Set(year);
        }

        if let Some(license_plate) = input.license_plate {
            vehicle.license_plate = Set(license_plate);
        }

        if let Some(color) = input.color {
            vehicle.color = Set(Some(color));
        }

        // Update timestamp
        vehicle.updated_at = Set(Utc::now());

        // Save changes
        let updated_vehicle = vehicle.update(&db).await?;
        Ok(updated_vehicle)
    }

    /// Delete an employee vehicle (hard delete)
    async fn delete_employee_vehicle(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::employee_vehicle::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // ============================================================
    // Emergency Contacts Management
    // ============================================================

    /// Create a new emergency contact
    async fn create_emergency_contact(
        &self,
        ctx: &Context<'_>,
        input: CreateEmergencyContactInput,
    ) -> Result<EmergencyContact> {
        let db = get_db_from_context(ctx)?;

        let contact = crate::models::employee::emergency_contact::ActiveModel {
            employee_id: Set(input.employee_id),
            name: Set(input.name.clone()),
            relationship: Set(input.relationship.clone()),
            phone_number: Set(input.phone_number.clone()),
            email: Set(input.email.clone()),
            is_primary: Set(input.is_primary),
            ..Default::default()
        };

        let contact = contact.insert(&db).await?;
        Ok(contact)
    }

    /// Update an existing emergency contact
    async fn update_emergency_contact(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmergencyContactInput,
    ) -> Result<EmergencyContact> {
        let db = get_db_from_context(ctx)?;

        // Find existing emergency contact
        let existing_contact = crate::models::employee::emergency_contact::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Emergency contact not found".to_string()))?;

        // Build active model with updates
        let mut contact: crate::models::employee::emergency_contact::ActiveModel = existing_contact.into();

        if let Some(name) = input.name {
            contact.name = Set(name);
        }

        if let Some(relationship) = input.relationship {
            contact.relationship = Set(Some(relationship));
        }

        if let Some(phone_number) = input.phone_number {
            contact.phone_number = Set(phone_number);
        }

        if let Some(email) = input.email {
            contact.email = Set(Some(email));
        }

        if let Some(is_primary) = input.is_primary {
            contact.is_primary = Set(is_primary);
        }

        // Update timestamp
        contact.updated_at = Set(Utc::now());

        // Save changes
        let updated_contact = contact.update(&db).await?;
        Ok(updated_contact)
    }

    /// Delete an emergency contact (hard delete)
    async fn delete_emergency_contact(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::emergency_contact::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // ============================================================
    // Employee Goals Management
    // ============================================================

    /// Create a new employee goal
    async fn create_employee_goal(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeGoalInput,
    ) -> Result<EmployeeGoal> {
        let db = get_db_from_context(ctx)?;
        let status = input.status.unwrap_or(GoalStatus::NotStarted);
        let progress = input.progress_percentage.unwrap_or(0);

        let goal = crate::models::employee::employee_goal::ActiveModel {
            employee_id: Set(input.employee_id),
            title: Set(input.title.clone()),
            description: Set(input.description.clone()),
            target_date: Set(input.target_date),
            status: Set(status.as_str().to_string()),
            progress_percentage: Set(progress),
            ..Default::default()
        };

        let goal = goal.insert(&db).await?;
        Ok(goal)
    }

    /// Update an existing employee goal
    async fn update_employee_goal(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeGoalInput,
    ) -> Result<EmployeeGoal> {
        let db = get_db_from_context(ctx)?;

        // Find existing employee goal
        let existing_goal = crate::models::employee::employee_goal::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee goal not found".to_string()))?;

        // Build active model with updates
        let mut goal: crate::models::employee::employee_goal::ActiveModel = existing_goal.into();

        if let Some(title) = input.title {
            goal.title = Set(title);
        }

        if let Some(description) = input.description {
            goal.description = Set(Some(description));
        }

        if let Some(target_date) = input.target_date {
            goal.target_date = Set(Some(target_date));
        }

        if let Some(status) = input.status {
            goal.status = Set(status.as_str().to_string());
        }

        if let Some(progress_percentage) = input.progress_percentage {
            goal.progress_percentage = Set(progress_percentage);
        }

        // Update timestamp
        goal.updated_at = Set(Utc::now());

        // Save changes
        let updated_goal = goal.update(&db).await?;
        Ok(updated_goal)
    }

    /// Delete an employee goal (hard delete)
    async fn delete_employee_goal(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::employee_goal::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }
}
