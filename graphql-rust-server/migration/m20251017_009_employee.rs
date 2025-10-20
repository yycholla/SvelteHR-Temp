//! Migration: Employee detail tables

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // emergency_contacts
        manager.create_table(Table::create().table((S::HrPublic, EmergencyContacts::Table)).if_not_exists()
            .col(ColumnDef::new(EmergencyContacts::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(EmergencyContacts::EmployeeId).uuid().not_null())
            .col(ColumnDef::new(EmergencyContacts::Name).string().not_null())
            .col(ColumnDef::new(EmergencyContacts::Relationship).string())
            .col(ColumnDef::new(EmergencyContacts::PhoneNumber).string().not_null())
            .col(ColumnDef::new(EmergencyContacts::Email).string())
            .col(ColumnDef::new(EmergencyContacts::IsPrimary).boolean().not_null().default(false))
            .col(ColumnDef::new(EmergencyContacts::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmergencyContacts::UpdatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmergencyContacts::DeletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_emergency_contacts_employee_id").from((S::HrPublic, EmergencyContacts::Table), EmergencyContacts::EmployeeId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // employee_skills
        manager.create_table(Table::create().table((S::HrPublic, EmployeeSkills::Table)).if_not_exists()
            .col(ColumnDef::new(EmployeeSkills::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(EmployeeSkills::EmployeeId).uuid().not_null())
            .col(ColumnDef::new(EmployeeSkills::SkillName).string().not_null())
            .col(ColumnDef::new(EmployeeSkills::ProficiencyLevel).string())
            .col(ColumnDef::new(EmployeeSkills::YearsOfExperience).integer())
            .col(ColumnDef::new(EmployeeSkills::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmployeeSkills::UpdatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmployeeSkills::DeletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_employee_skills_employee_id").from((S::HrPublic, EmployeeSkills::Table), EmployeeSkills::EmployeeId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // employee_certifications
        manager.create_table(Table::create().table((S::HrPublic, EmployeeCertifications::Table)).if_not_exists()
            .col(ColumnDef::new(EmployeeCertifications::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(EmployeeCertifications::EmployeeId).uuid().not_null())
            .col(ColumnDef::new(EmployeeCertifications::Name).string().not_null())
            .col(ColumnDef::new(EmployeeCertifications::IssuingOrganization).string())
            .col(ColumnDef::new(EmployeeCertifications::IssueDate).timestamp_with_time_zone())
            .col(ColumnDef::new(EmployeeCertifications::ExpiryDate).timestamp_with_time_zone())
            .col(ColumnDef::new(EmployeeCertifications::CredentialId).string())
            .col(ColumnDef::new(EmployeeCertifications::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmployeeCertifications::UpdatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmployeeCertifications::DeletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_employee_certifications_employee_id").from((S::HrPublic, EmployeeCertifications::Table), EmployeeCertifications::EmployeeId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // employee_vehicles
        manager.create_table(Table::create().table((S::HrPublic, EmployeeVehicles::Table)).if_not_exists()
            .col(ColumnDef::new(EmployeeVehicles::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(EmployeeVehicles::EmployeeId).uuid().not_null())
            .col(ColumnDef::new(EmployeeVehicles::Make).string().not_null())
            .col(ColumnDef::new(EmployeeVehicles::Model).string().not_null())
            .col(ColumnDef::new(EmployeeVehicles::Year).integer())
            .col(ColumnDef::new(EmployeeVehicles::LicensePlate).string())
            .col(ColumnDef::new(EmployeeVehicles::Color).string())
            .col(ColumnDef::new(EmployeeVehicles::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmployeeVehicles::UpdatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmployeeVehicles::DeletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_employee_vehicles_employee_id").from((S::HrPublic, EmployeeVehicles::Table), EmployeeVehicles::EmployeeId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        // employee_goals
        manager.create_table(Table::create().table((S::HrPublic, EmployeeGoals::Table)).if_not_exists()
            .col(ColumnDef::new(EmployeeGoals::Id).uuid().not_null().primary_key().extra("DEFAULT gen_random_uuid()"))
            .col(ColumnDef::new(EmployeeGoals::EmployeeId).uuid().not_null())
            .col(ColumnDef::new(EmployeeGoals::Title).string().not_null())
            .col(ColumnDef::new(EmployeeGoals::Description).text())
            .col(ColumnDef::new(EmployeeGoals::TargetDate).timestamp_with_time_zone())
            .col(ColumnDef::new(EmployeeGoals::Status).string().not_null().default("pending"))
            .col(ColumnDef::new(EmployeeGoals::Progress).integer().not_null().default(0))
            .col(ColumnDef::new(EmployeeGoals::CreatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmployeeGoals::UpdatedAt).timestamp_with_time_zone().not_null().default(Expr::current_timestamp()))
            .col(ColumnDef::new(EmployeeGoals::DeletedAt).timestamp_with_time_zone())
            .foreign_key(ForeignKey::create().name("fk_employee_goals_employee_id").from((S::HrPublic, EmployeeGoals::Table), EmployeeGoals::EmployeeId).to((S::HrPublic, Users::Table), Users::Id).on_delete(ForeignKeyAction::Cascade))
            .to_owned()).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table((S::HrPublic, EmployeeGoals::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, EmployeeVehicles::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, EmployeeCertifications::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, EmployeeSkills::Table)).to_owned()).await?;
        manager.drop_table(Table::drop().table((S::HrPublic, EmergencyContacts::Table)).to_owned()).await?;
        Ok(())
    }
}

#[derive(Iden)] enum S { HrPublic }
#[derive(Iden)] enum EmergencyContacts { Table, Id, EmployeeId, Name, Relationship, PhoneNumber, Email, IsPrimary, CreatedAt, UpdatedAt, DeletedAt }
#[derive(Iden)] enum EmployeeSkills { Table, Id, EmployeeId, SkillName, ProficiencyLevel, YearsOfExperience, CreatedAt, UpdatedAt, DeletedAt }
#[derive(Iden)] enum EmployeeCertifications { Table, Id, EmployeeId, Name, IssuingOrganization, IssueDate, ExpiryDate, CredentialId, CreatedAt, UpdatedAt, DeletedAt }
#[derive(Iden)] enum EmployeeVehicles { Table, Id, EmployeeId, Make, Model, Year, LicensePlate, Color, CreatedAt, UpdatedAt, DeletedAt }
#[derive(Iden)] enum EmployeeGoals { Table, Id, EmployeeId, Title, Description, TargetDate, Status, Progress, CreatedAt, UpdatedAt, DeletedAt }
#[derive(Iden)] enum Users { Table, Id }
