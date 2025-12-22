use super::models::*;
use anyhow::{Context, Result};
use reqwest::{Client as HttpClient, StatusCode};
use std::env;

#[derive(Debug, Clone)]
pub struct IntuitClient {
    http_client: HttpClient,
    base_url: String,
    access_token: String,
    realm_id: String,
}

impl IntuitClient {
    /// Create a new Intuit API client
    pub fn new(access_token: String, realm_id: String) -> Result<Self> {
        let environment = env::var("INTUIT_ENVIRONMENT").unwrap_or_else(|_| "sandbox".to_string());

        let base_url = if environment == "production" {
            "https://quickbooks.api.intuit.com"
        } else {
            "https://sandbox-quickbooks.api.intuit.com"
        };

        Ok(Self {
            http_client: HttpClient::new(),
            base_url: base_url.to_string(),
            access_token,
            realm_id,
        })
    }

    /// Get a single employee by ID
    pub async fn get_employee(&self, employee_id: &str) -> Result<Employee> {
        let url = format!(
            "{}/v3/company/{}/employee/{}",
            self.base_url, self.realm_id, employee_id
        );

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to send request to QuickBooks API")?;

        self.handle_response(response).await
    }

    /// Query all employees
    pub async fn list_employees(&self) -> Result<Vec<Employee>> {
        let url = format!(
            "{}/v3/company/{}/query?query=select * from Employee MAXRESULTS 1000",
            self.base_url, self.realm_id
        );

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to query employees from QuickBooks")?;

        let qb_response: QuickBooksResponse<Employee> = response
            .json()
            .await
            .context("Failed to parse QuickBooks response")?;

        if let Some(fault) = qb_response.fault {
            return Err(anyhow::anyhow!(
                "QuickBooks API error: {}",
                fault
                    .errors
                    .first()
                    .map(|e| e.message.clone())
                    .unwrap_or_else(|| "Unknown error".to_string())
            ));
        }

        Ok(qb_response
            .query_response
            .and_then(|qr| qr.employees)
            .unwrap_or_default())
    }

    /// Create a new employee in QuickBooks
    pub async fn create_employee(&self, employee: Employee) -> Result<Employee> {
        let url = format!("{}/v3/company/{}/employee", self.base_url, self.realm_id);

        let response = self
            .http_client
            .post(&url)
            .bearer_auth(&self.access_token)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&employee)
            .send()
            .await
            .context("Failed to create employee in QuickBooks")?;

        self.handle_response(response).await
    }

    /// Update an existing employee
    pub async fn update_employee(&self, employee: Employee) -> Result<Employee> {
        let url = format!("{}/v3/company/{}/employee", self.base_url, self.realm_id);

        let response = self
            .http_client
            .post(&url) // QuickBooks uses POST for updates
            .bearer_auth(&self.access_token)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&employee)
            .send()
            .await
            .context("Failed to update employee in QuickBooks")?;

        self.handle_response(response).await
    }

    /// Deactivate an employee (set Active = false)
    pub async fn deactivate_employee(
        &self,
        employee_id: &str,
        sync_token: &str,
    ) -> Result<Employee> {
        let employee = Employee {
            id: Some(employee_id.to_string()),
            sync_token: Some(sync_token.to_string()),
            active: Some(false),
            ..Default::default()
        };

        self.update_employee(employee).await
    }

    /// Batch create multiple employees in QuickBooks
    /// QuickBooks supports up to 30 operations per batch request
    pub async fn batch_create_employees(&self, employees: Vec<super::models::EmployeeExtended>) -> Result<Vec<Result<Employee>>> {
        use super::models::{BatchRequest, BatchItemRequest, BatchOperation};

        // Split into chunks of 30 (QuickBooks batch limit)
        let chunks: Vec<_> = employees.chunks(30).collect();
        let mut all_results = Vec::new();

        for chunk in chunks {
            // Build batch request
            let batch_items: Vec<BatchItemRequest> = chunk
                .iter()
                .enumerate()
                .map(|(index, employee)| BatchItemRequest {
                    batch_id: format!("bid_{}", index),
                    operation: BatchOperation::Create {
                        employee: employee.clone(),
                    },
                })
                .collect();

            let batch_request = BatchRequest {
                batch_item_requests: batch_items,
            };

            // Send batch request
            let url = format!("{}/v3/company/{}/batch", self.base_url, self.realm_id);

            let response = self
                .http_client
                .post(&url)
                .bearer_auth(&self.access_token)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .json(&batch_request)
                .send()
                .await
                .context("Failed to send batch request to QuickBooks")?;

            let status = response.status();
            if status == StatusCode::UNAUTHORIZED {
                return Err(anyhow::anyhow!("Unauthorized: Access token may be expired or invalid"));
            }

            // Parse batch response
            let batch_response: super::models::BatchResponse = response
                .json()
                .await
                .context("Failed to parse batch response")?;

            // Process each item in the batch response
            for item_response in batch_response.batch_item_responses {
                if let Some(fault) = item_response.fault {
                    all_results.push(Err(anyhow::anyhow!("{}", fault)));
                } else if let Some(employee) = item_response.employee {
                    all_results.push(Ok(employee));
                } else {
                    all_results.push(Err(anyhow::anyhow!("No employee or fault in batch response")));
                }
            }
        }

        Ok(all_results)
    }

    /// Get company information from QuickBooks
    pub async fn get_company_info(&self) -> Result<CompanyInfo> {
        let url = format!(
            "{}/v3/company/{}/companyinfo/{}",
            self.base_url, self.realm_id, self.realm_id
        );

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to get company info from QuickBooks")?;

        let status = response.status();

        if status == StatusCode::UNAUTHORIZED {
            return Err(anyhow::anyhow!(
                "Unauthorized: Access token may be expired or invalid"
            ));
        }

        let qb_response: CompanyInfoResponse = response
            .json()
            .await
            .context("Failed to parse company info response")?;

        // Check for API-level errors
        if let Some(fault) = qb_response.fault {
            return Err(anyhow::anyhow!(
                "QuickBooks API error: {}",
                fault
                    .errors
                    .first()
                    .map(|e| format!("{} ({})", e.message, e.detail))
                    .unwrap_or_else(|| "Unknown error".to_string())
            ));
        }

        // Return the company info
        qb_response
            .company_info
            .ok_or_else(|| anyhow::anyhow!("No company info in response"))
    }

    /// Handle QuickBooks API response
    async fn handle_response(
        &self,
        response: reqwest::Response,
    ) -> Result<Employee> {
        let status = response.status();

        if status == StatusCode::UNAUTHORIZED {
            return Err(anyhow::anyhow!(
                "Unauthorized: Access token may be expired or invalid"
            ));
        }

        let qb_response: QuickBooksResponse<Employee> = response
            .json()
            .await
            .context("Failed to parse QuickBooks response")?;

        // Check for API-level errors
        if let Some(fault) = qb_response.fault {
            return Err(anyhow::anyhow!(
                "QuickBooks API error: {}",
                fault
                    .errors
                    .first()
                    .map(|e| format!("{} ({})", e.message, e.detail))
                    .unwrap_or_else(|| "Unknown error".to_string())
            ));
        }

        // Return the employee data
        qb_response
            .employee
            .ok_or_else(|| anyhow::anyhow!("No employee data in response"))
    }
}
