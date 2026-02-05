use async_trait::async_trait;
use chrono::{DateTime, Utc};
use std::time::Duration;

use crate::domain::sync::{EntityType, QuickBooksId, SyncError};
use crate::integrations::intuit::{Department, EmailAddress, Employee, EmployeeExtended, IntuitClient, NtRef, PhoneNumber};
use crate::ports::quickbooks::{
    DepartmentData, EmployeeData, QuickBooksPort, RemoteDepartment, RemoteEmployee,
};

/// Adapter that implements QuickBooksPort using the existing IntuitClient
pub struct QuickBooksAdapter {
    client: IntuitClient,
}

impl QuickBooksAdapter {
    pub fn new(client: IntuitClient) -> Self {
        Self { client }
    }

    /// Map IntuitClient EmployeeExtended to our RemoteEmployee
    fn map_employee_to_remote(&self, emp: EmployeeExtended) -> RemoteEmployee {
        let base = emp.base;

        RemoteEmployee {
            id: QuickBooksId::new(base.id.unwrap_or_default()),
            given_name: base.given_name.unwrap_or_default(),
            family_name: base.family_name.unwrap_or_default(),
            email: base.primary_email_addr.and_then(|e| e.address),
            phone: base.primary_phone.and_then(|p| p.free_form_number),
            department_id: emp.department_ref.and_then(|d| d.value),
            sync_token: base.sync_token.unwrap_or_else(|| "0".to_string()),
            last_modified: base
                .meta_data
                .map(|m| m.last_updated_time)
                .unwrap_or_else(Utc::now),
            active: base.active.unwrap_or(true),
        }
    }

    /// Map our EmployeeData to IntuitClient EmployeeExtended
    fn map_employee_data_to_extended(&self, data: EmployeeData) -> EmployeeExtended {
        let employee = Employee {
            given_name: Some(data.given_name),
            family_name: Some(data.family_name),
            primary_email_addr: data.email.map(|e| EmailAddress { address: Some(e) }),
            primary_phone: data.phone.map(|p| PhoneNumber {
                free_form_number: Some(p),
            }),
            sync_token: data.sync_token.clone(),
            ..Default::default()
        };

        EmployeeExtended {
            base: employee,
            employee_number: None,
            department_ref: data.department_id.map(|id| NtRef {
                value: Some(id),
                name: None,
                entity_ref_type: Some("Department".to_string()),
            }),
            parent_ref: None,
            sparse: None,
        }
    }

    /// Map IntuitClient Department to our RemoteDepartment
    fn map_department_to_remote(&self, dept: Department) -> RemoteDepartment {
        RemoteDepartment {
            id: QuickBooksId::new(dept.id.unwrap_or_default()),
            name: dept.name.unwrap_or_default(),
            parent_id: dept.parent_ref.and_then(|p| p.value),
            sync_token: dept.sync_token.unwrap_or_else(|| "0".to_string()),
            last_modified: dept
                .meta_data
                .map(|m| m.last_updated_time)
                .unwrap_or_else(Utc::now),
            active: dept.active.unwrap_or(true),
        }
    }

    /// Map our DepartmentData to IntuitClient Department
    fn map_department_data(&self, data: DepartmentData) -> Department {
        Department {
            id: None,
            name: Some(data.name),
            active: Some(true),
            sub_department: data.parent_id.is_some().then(|| true),
            parent_ref: data.parent_id.map(|id| NtRef {
                value: Some(id),
                name: None,
                entity_ref_type: Some("Department".to_string()),
            }),
            sync_token: data.sync_token,
            meta_data: None,
            fully_qualified_name: None,
            domain: None,
            sparse: None,
        }
    }

    /// Map anyhow errors to SyncError
    fn map_error(&self, error: anyhow::Error) -> SyncError {
        let error_str = error.to_string().to_lowercase();

        // Check for specific error patterns
        if error_str.contains("unauthorized") || error_str.contains("token") {
            SyncError::TokenExpired {
                realm_id: "unknown".to_string(),
            }
        } else if error_str.contains("rate limit") || error_str.contains("429") {
            SyncError::RateLimited {
                retry_after: Duration::from_secs(60),
            }
        } else if error_str.contains("not found") || error_str.contains("404") {
            // Extract entity type from error if possible
            SyncError::EntityNotFound {
                entity_type: EntityType::Employee, // Default
                id: "unknown".to_string(),
            }
        } else if error_str.contains("fault") || error_str.contains("api error") {
            // QuickBooks API error - determine if retryable
            let retryable = error_str.contains("500") || error_str.contains("503");
            SyncError::quickbooks_api("unknown", &error.to_string(), retryable)
        } else {
            SyncError::Internal {
                message: error.to_string(),
            }
        }
    }
}

#[async_trait]
impl QuickBooksPort for QuickBooksAdapter {
    async fn list_employees(
        &self,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<RemoteEmployee>, SyncError> {
        let employees = if let Some(since_time) = since {
            self.client
                .list_employees_since(since_time)
                .await
                .map_err(|e| self.map_error(e))?
        } else {
            self.client
                .list_employees()
                .await
                .map_err(|e| self.map_error(e))?
        };

        Ok(employees
            .into_iter()
            .map(|e| self.map_employee_to_remote(e))
            .collect())
    }

    async fn get_employee(&self, id: &QuickBooksId) -> Result<RemoteEmployee, SyncError> {
        let employee = self
            .client
            .get_employee(id.as_str())
            .await
            .map_err(|e| self.map_error(e))?;

        Ok(self.map_employee_to_remote(employee))
    }

    async fn create_employee(&self, data: EmployeeData) -> Result<RemoteEmployee, SyncError> {
        let employee_extended = self.map_employee_data_to_extended(data);

        let created = self
            .client
            .create_employee(employee_extended)
            .await
            .map_err(|e| self.map_error(e))?;

        // Wrap the created Employee in EmployeeExtended for mapping
        let extended = EmployeeExtended::from(created);
        Ok(self.map_employee_to_remote(extended))
    }

    async fn update_employee(
        &self,
        id: &QuickBooksId,
        data: EmployeeData,
    ) -> Result<RemoteEmployee, SyncError> {
        let mut employee_extended = self.map_employee_data_to_extended(data);
        employee_extended.base.id = Some(id.as_str().to_string());

        let updated = self
            .client
            .update_employee(employee_extended)
            .await
            .map_err(|e| self.map_error(e))?;

        // Wrap in EmployeeExtended for mapping
        let extended = EmployeeExtended::from(updated);
        Ok(self.map_employee_to_remote(extended))
    }

    async fn list_departments(
        &self,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<RemoteDepartment>, SyncError> {
        let departments = if let Some(since_time) = since {
            self.client
                .query_departments_since(since_time)
                .await
                .map_err(|e| self.map_error(e))?
        } else {
            self.client
                .query_departments()
                .await
                .map_err(|e| self.map_error(e))?
        };

        Ok(departments
            .into_iter()
            .map(|d| self.map_department_to_remote(d))
            .collect())
    }

    async fn get_department(&self, id: &QuickBooksId) -> Result<RemoteDepartment, SyncError> {
        let department = self
            .client
            .get_department(id.as_str())
            .await
            .map_err(|e| self.map_error(e))?;

        Ok(self.map_department_to_remote(department))
    }

    async fn upsert_department(
        &self,
        data: DepartmentData,
    ) -> Result<RemoteDepartment, SyncError> {
        let department = self.map_department_data(data);

        // Try to create (upsert logic - could be enhanced to check if exists first)
        let result = self
            .client
            .batch_create_departments(vec![department])
            .await
            .map_err(|e| self.map_error(e))?;

        // Get the first result
        let created = result
            .into_iter()
            .next()
            .ok_or_else(|| SyncError::Internal {
                message: "No department returned from batch create".to_string(),
            })?
            .map_err(|e| self.map_error(e))?;

        Ok(self.map_department_to_remote(created))
    }
}
