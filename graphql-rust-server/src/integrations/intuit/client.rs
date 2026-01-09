use super::models::*;
use anyhow::{Context, Result};
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
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
    pub async fn get_employee(&self, employee_id: &str) -> Result<EmployeeExtended> {
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

        let employee = self.handle_response(response).await?;
        Ok(employee.into())
    }

    /// Query all employees
    pub async fn list_employees(&self) -> Result<Vec<EmployeeExtended>> {
        let query = "select * from Employee MAXRESULTS 1000";
        let url = format!(
            "{}/v3/company/{}/query?query={}",
            self.base_url,
            self.realm_id,
            utf8_percent_encode(query, NON_ALPHANUMERIC)
        );

        tracing::info!(
            realm_id = %self.realm_id,
            query = query,
            "Querying employees from QuickBooks"
        );

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to send employee query to QuickBooks")?;

        let status = response.status();
        tracing::info!(status = %status, "QuickBooks employee query response status");

        if status == StatusCode::UNAUTHORIZED {
            return Err(anyhow::anyhow!("Unauthorized: Access token may be expired or invalid"));
        }

        // Get response text for debugging BEFORE parsing
        let response_text = response
            .text()
            .await
            .context("Failed to get response text")?;

        tracing::debug!(
            response_length = response_text.len(),
            "QuickBooks employee query raw response received"
        );

        // Log first 500 chars of response for debugging
        if response_text.len() > 500 {
            tracing::debug!(response_preview = &response_text[..500], "Response preview (first 500 chars)");
        } else {
            tracing::debug!(response_full = &response_text, "Full response");
        }

        // Parse the response
        let qb_response: QuickBooksResponse<Employee> = serde_json::from_str(&response_text)
            .context(format!("Failed to parse QuickBooks response: {}", response_text))?;

        // Check for API-level errors
        if let Some(fault) = qb_response.fault {
            let error_msg = fault
                .errors
                .first()
                .map(|e| format!("{} ({})", e.message, e.detail))
                .unwrap_or_else(|| "Unknown error".to_string());

            tracing::error!(error = %error_msg, "QuickBooks API returned fault");

            return Err(anyhow::anyhow!("QuickBooks API error: {}", error_msg));
        }

        // Extract employees with detailed logging
        let employees = match qb_response.query_response {
            Some(query_response) => match query_response.employees {
                Some(emp_list) => {
                    tracing::info!(
                        count = emp_list.len(),
                        "Successfully retrieved employees from QuickBooks"
                    );
                    emp_list
                }
                None => {
                    tracing::warn!(
                        "QuickBooks returned QueryResponse but employees field is None - this usually means the company has no employees"
                    );
                    Vec::new()
                }
            },
            None => {
                tracing::error!(
                    "QuickBooks response missing QueryResponse field - unexpected response structure"
                );
                Vec::new()
            }
        };

        Ok(employees
            .into_iter()
            .map(|emp| emp.into())
            .collect())
    }

    /// Create a new employee in QuickBooks
    pub async fn create_employee(&self, employee: super::models::EmployeeExtended) -> Result<Employee> {
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
    pub async fn update_employee(&self, employee: super::models::EmployeeExtended) -> Result<Employee> {
        let url = format!("{}/v3/company/{}/employee", self.base_url, self.realm_id);

        // Log the update request payload for debugging
        if let Ok(request_json) = serde_json::to_string_pretty(&employee) {
            tracing::debug!("Employee update request payload: {}", request_json);
        }

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

        let status = response.status();
        tracing::debug!("QuickBooks employee update response status: {}", status);

        // Get response text for debugging
        let response_text = response.text().await
            .context("Failed to get response text")?;

        tracing::debug!("QuickBooks employee update response body: {}", response_text);

        // Parse and return the employee
        let qb_response: super::models::QuickBooksResponse<Employee> = serde_json::from_str(&response_text)
            .context(format!("Failed to parse update response: {}", response_text))?;

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

        let employee_extended = super::models::EmployeeExtended {
            base: employee,
            employee_number: None,
            department_ref: None,
            parent_ref: None,
            sparse: None,
        };

        self.update_employee(employee_extended).await
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
                    operation: BatchOperation::CreateEmployee {
                        employee: employee.clone(),
                    },
                })
                .collect();

            let batch_request = BatchRequest {
                batch_item_requests: batch_items,
            };

            // Log the request payload for debugging
            if let Ok(request_json) = serde_json::to_string_pretty(&batch_request) {
                tracing::debug!("Employee batch request payload: {}", request_json);
            }

            // Send batch request
            let url = format!("{}/v3/company/{}/batch", self.base_url, self.realm_id);

            tracing::info!("Sending employee batch request to QuickBooks: {} employees", chunk.len());

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
            tracing::info!("QuickBooks employee batch response status: {}", status);

            if status == StatusCode::UNAUTHORIZED {
                return Err(anyhow::anyhow!("Unauthorized: Access token may be expired or invalid"));
            }

            // Get response text for debugging
            let response_text = response.text().await
                .context("Failed to get response text")?;

            tracing::debug!("QuickBooks employee batch response body: {}", response_text);

            // Parse batch response
            let batch_response: super::models::BatchResponse = serde_json::from_str(&response_text)
                .context(format!("Failed to parse batch response: {}", response_text))?;

            // Check for top-level fault (entire batch rejected)
            if let Some(fault) = batch_response.fault {
                tracing::error!("QuickBooks rejected entire batch: {}", fault);
                // Return error for all employees in this batch
                for _ in chunk {
                    all_results.push(Err(anyhow::anyhow!("Batch rejected: {}", fault)));
                }
                continue;
            }

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

    /// Query departments from QuickBooks
    pub async fn query_departments(&self) -> Result<Vec<super::models::Department>> {
        let query = "SELECT%20*%20FROM%20Department";
        let url = format!("{}/v3/company/{}/query?query={}",
            self.base_url,
            self.realm_id,
            query
        );

        tracing::info!("Querying departments from QuickBooks: {}", url);

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to query departments from QuickBooks")?;

        let status = response.status();
        tracing::info!("QuickBooks department query response status: {}", status);

        if status == StatusCode::UNAUTHORIZED {
            return Err(anyhow::anyhow!("Unauthorized: Access token may be expired or invalid"));
        }

        let response_text = response.text().await
            .context("Failed to get response text")?;

        tracing::debug!("QuickBooks department query response: {}", response_text);

        #[derive(serde::Deserialize)]
        struct QueryResponse {
            #[serde(rename = "QueryResponse")]
            query_response: QueryResult,
        }

        #[derive(serde::Deserialize)]
        struct QueryResult {
            #[serde(rename = "Department", default)]
            department: Vec<super::models::Department>,
        }

        let parsed: QueryResponse = serde_json::from_str(&response_text)
            .context(format!("Failed to parse query response: {}", response_text))?;

        tracing::info!("Found {} departments in QuickBooks", parsed.query_response.department.len());

        Ok(parsed.query_response.department)
    }

    /// Batch create multiple departments in QuickBooks
    /// QuickBooks supports up to 30 operations per batch request
    pub async fn batch_create_departments(&self, departments: Vec<super::models::Department>) -> Result<Vec<Result<super::models::Department>>> {
        use super::models::{BatchRequest, BatchItemRequest, BatchOperation};

        // Split into chunks of 30 (QuickBooks batch limit)
        let chunks: Vec<_> = departments.chunks(30).collect();
        let mut all_results = Vec::new();

        for (chunk_idx, chunk) in chunks.iter().enumerate() {
            tracing::info!("Processing department batch {}/{} with {} items",
                chunk_idx + 1, chunks.len(), chunk.len());

            // Build batch request
            let batch_items: Vec<BatchItemRequest> = chunk
                .iter()
                .enumerate()
                .map(|(index, department)| {
                    tracing::debug!("Preparing department '{}' for batch",
                        department.name.as_ref().unwrap_or(&"Unknown".to_string()));
                    BatchItemRequest {
                        batch_id: format!("bid_{}", index),
                        operation: BatchOperation::CreateDepartment {
                            department: department.clone(),
                        },
                    }
                })
                .collect();

            let batch_request = BatchRequest {
                batch_item_requests: batch_items,
            };

            // Send batch request
            let url = format!("{}/v3/company/{}/batch", self.base_url, self.realm_id);
            tracing::info!("Sending batch request to QuickBooks: {}", url);

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
            tracing::info!("QuickBooks batch response status: {}", status);

            if status == StatusCode::UNAUTHORIZED {
                return Err(anyhow::anyhow!("Unauthorized: Access token may be expired or invalid"));
            }

            // Get response text for debugging
            let response_text = response.text().await
                .context("Failed to get response text")?;

            tracing::debug!("QuickBooks batch response body: {}", response_text);

            // Parse batch response
            let batch_response: super::models::BatchResponse = serde_json::from_str(&response_text)
                .context(format!("Failed to parse batch response: {}", response_text))?;

            // Process each item in the batch response
            for item_response in batch_response.batch_item_responses {
                if let Some(fault) = item_response.fault {
                    all_results.push(Err(anyhow::anyhow!("{}", fault)));
                } else if let Some(department) = item_response.department {
                    all_results.push(Ok(department));
                } else {
                    all_results.push(Err(anyhow::anyhow!("No department or fault in batch response")));
                }
            }
        }

        Ok(all_results)
    }

    /// Get a single department by ID from QuickBooks
    pub async fn get_department(&self, department_id: &str) -> Result<super::models::Department> {
        let url = format!(
            "{}/v3/company/{}/department/{}",
            self.base_url, self.realm_id, department_id
        );

        tracing::debug!("Fetching department {} from QuickBooks", department_id);

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to get department from QuickBooks")?;

        let status = response.status();
        tracing::debug!("QuickBooks get department response status: {}", status);

        if status == StatusCode::UNAUTHORIZED {
            return Err(anyhow::anyhow!("Unauthorized: Access token may be expired or invalid"));
        }

        // Get response text for debugging
        let response_text = response.text().await
            .context("Failed to get response text")?;

        tracing::debug!("QuickBooks get department response: {}", response_text);

        // Parse response
        let qb_response: super::models::QuickBooksResponse<super::models::Department> =
            serde_json::from_str(&response_text)
                .context(format!("Failed to parse department response: {}", response_text))?;

        // Check for API-level errors
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

        // Extract department from response
        qb_response.department
            .ok_or_else(|| anyhow::anyhow!("No department returned in response"))
    }

    /// Update an existing department in QuickBooks
    pub async fn update_department(&self, department: super::models::Department) -> Result<super::models::Department> {
        let url = format!("{}/v3/company/{}/department", self.base_url, self.realm_id);

        // Log the update request payload for debugging
        if let Ok(request_json) = serde_json::to_string_pretty(&department) {
            tracing::debug!("Department update request payload: {}", request_json);
        }

        let response = self
            .http_client
            .post(&url) // QuickBooks uses POST for updates
            .bearer_auth(&self.access_token)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .json(&department)
            .send()
            .await
            .context("Failed to update department in QuickBooks")?;

        let status = response.status();
        tracing::debug!("QuickBooks department update response status: {}", status);

        if status == StatusCode::UNAUTHORIZED {
            return Err(anyhow::anyhow!("Unauthorized: Access token may be expired or invalid"));
        }

        // Get response text for debugging
        let response_text = response.text().await
            .context("Failed to get response text")?;

        tracing::debug!("QuickBooks department update response body: {}", response_text);

        // Parse and return the department
        let qb_response: super::models::QuickBooksResponse<super::models::Department> =
            serde_json::from_str(&response_text)
                .context(format!("Failed to parse update response: {}", response_text))?;

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

        // Extract department from response
        qb_response.department
            .ok_or_else(|| anyhow::anyhow!("No department returned in update response"))
    }

    /// Query employees changed since a specific timestamp (INCREMENTAL SYNC - Feature 3)
    ///
    /// Uses QuickBooks Query API with WHERE clause filtering by Metadata.LastUpdatedTime
    pub async fn list_employees_since(&self, since: chrono::DateTime<chrono::Utc>) -> Result<Vec<EmployeeExtended>> {
        // Format timestamp for QuickBooks query (RFC 3339 format)
        let since_str = since.to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        // QuickBooks Query API with timestamp filter
        let query = format!(
            "select * from Employee WHERE Metadata.LastUpdatedTime > '{}' MAXRESULTS 1000",
            since_str
        );

        let url = format!(
            "{}/v3/company/{}/query?query={}",
            self.base_url,
            self.realm_id,
            utf8_percent_encode(&query, NON_ALPHANUMERIC)
        );

        tracing::debug!("Incremental employee query: {}", query);

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to query incremental employees from QuickBooks")?;

        let qb_response: QuickBooksResponse<Employee> = response
            .json()
            .await
            .context("Failed to parse QuickBooks incremental response")?;

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

        let employees: Vec<EmployeeExtended> = qb_response
            .query_response
            .and_then(|qr| qr.employees)
            .unwrap_or_default()
            .into_iter()
            .map(|emp| emp.into())
            .collect();

        tracing::info!("Incremental sync found {} changed employees", employees.len());

        Ok(employees)
    }

    /// Query departments changed since a specific timestamp (INCREMENTAL SYNC - Feature 3)
    ///
    /// Uses QuickBooks Query API with WHERE clause filtering by Metadata.LastUpdatedTime
    pub async fn query_departments_since(&self, since: chrono::DateTime<chrono::Utc>) -> Result<Vec<super::models::Department>> {
        // Format timestamp for QuickBooks query (RFC 3339 format)
        let since_str = since.to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

        // QuickBooks Query API with timestamp filter
        let query = format!(
            "select * from Department WHERE Metadata.LastUpdatedTime > '{}' MAXRESULTS 1000",
            since_str
        );

        let url = format!(
            "{}/v3/company/{}/query?query={}",
            self.base_url,
            self.realm_id,
            utf8_percent_encode(&query, NON_ALPHANUMERIC)
        );

        tracing::debug!("Incremental department query: {}", query);

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .context("Failed to query incremental departments from QuickBooks")?;

        // Parse response - departments use a custom wrapper
        #[derive(Debug, serde::Deserialize)]
        struct DepartmentQueryResponse {
            #[serde(rename = "Department")]
            pub departments: Option<Vec<super::models::Department>>,
        }

        #[derive(Debug, serde::Deserialize)]
        struct DepartmentResponse {
            #[serde(rename = "QueryResponse")]
            pub query_response: Option<DepartmentQueryResponse>,
            #[serde(rename = "Fault")]
            pub fault: Option<super::models::ApiFault>,
        }

        let qb_response: DepartmentResponse = response
            .json()
            .await
            .context("Failed to parse QuickBooks incremental department response")?;

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

        let departments = qb_response
            .query_response
            .and_then(|qr| qr.departments)
            .unwrap_or_default();

        tracing::info!("Incremental sync found {} changed departments", departments.len());

        Ok(departments)
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
