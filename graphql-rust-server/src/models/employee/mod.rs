//! Employee Management Domain
//!
//! Contains employee-related models: skills, certifications, vehicles,
//! emergency contacts, goals, and addresses.

pub mod emergency_contact;
pub mod employee_certification;
pub mod employee_goal;
pub mod employee_skill;
pub mod employee_vehicle;
pub mod import_job;
pub mod import_row;
pub mod user_address;

// Re-exports for convenient access
pub use emergency_contact::{
    CreateEmergencyContactInput, Model as EmergencyContact, UpdateEmergencyContactInput,
};
pub use employee_certification::{
    CreateEmployeeCertificationInput, EmployeeCertificationFilter, Model as EmployeeCertification,
};
pub use employee_goal::{
    CreateEmployeeGoalInput, GoalStatus, Model as EmployeeGoal, UpdateEmployeeGoalInput,
};
pub use employee_skill::{
    CreateEmployeeSkillInput, EmployeeSkillFilter, Model as EmployeeSkill, ProficiencyLevel,
    UpdateEmployeeSkillInput,
};
pub use employee_vehicle::{
    CreateEmployeeVehicleInput, Model as EmployeeVehicle, UpdateEmployeeVehicleInput,
};
pub use user_address::{CreateUserAddressInput, Model as UserAddress, UpdateUserAddressInput};
