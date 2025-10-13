//! Employee Management Domain
//!
//! Contains employee-related models: skills, certifications, vehicles,
//! emergency contacts, and goals.

pub mod employee_skill;
pub mod employee_certification;
pub mod employee_vehicle;
pub mod emergency_contact;
pub mod employee_goal;

// Re-exports for convenient access
pub use employee_skill::{
    CreateEmployeeSkillInput, EmployeeSkill, EmployeeSkillFilter, ProficiencyLevel,
    UpdateEmployeeSkillInput,
};
pub use employee_certification::{
    CreateEmployeeCertificationInput, EmployeeCertification, EmployeeCertificationFilter,
};
pub use employee_vehicle::{
    CreateEmployeeVehicleInput, EmployeeVehicle, UpdateEmployeeVehicleInput,
};
pub use emergency_contact::{
    CreateEmergencyContactInput, EmergencyContact, UpdateEmergencyContactInput,
};
pub use employee_goal::{
    CreateEmployeeGoalInput, EmployeeGoal, GoalStatus, UpdateEmployeeGoalInput,
};
