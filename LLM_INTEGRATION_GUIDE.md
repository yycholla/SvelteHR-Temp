# LLM Integration Guide for Mountain Care HR API

## Overview
This guide provides comprehensive instructions for LLMs (Language Learning Models) to effectively interact with the Mountain Care HR API, leveraging all performance optimizations and best practices.

## Getting Started

### 1. Fetch the Complete Schema
```bash
GET /api/v1/llm/schema
Authorization: Bearer {token}
```

This endpoint returns:
- Complete model definitions with relationships
- All available endpoints with parameters
- Performance optimization capabilities
- Best practices for API usage
- Enumeration values for all fields

## Key Performance Features to Utilize

### 1. Pagination (REQUIRED for all list operations)

**Always use pagination to prevent timeouts and memory issues:**

```bash
# Good - Paginated request
GET /api/v1/employees?page=1&pageSize=20

# Bad - Non-paginated (will default to page 1, size 20 anyway)
GET /api/v1/employees
```

**Response format:**
```json
{
  "data": [...],
  "page": 1,
  "pageSize": 20,
  "total": 150,
  "totalPages": 8,
  "hasMore": true
}
```

### 2. Filtering and Search

**Use filters to reduce data transfer:**

```bash
# Single filter
GET /api/v1/employees?filter[department_id]=5

# Multiple filters
GET /api/v1/employees?filter[status]=Active&filter[is_manager]=true

# Comparison operators
GET /api/v1/compliance?filter[expiration_date]=<2024-12-31
GET /api/v1/tasks?filter[priority]=!Low

# Search across multiple fields
GET /api/v1/employees?search=john
```

### 3. Sorting

**Always specify sort order for predictable results:**

```bash
GET /api/v1/tasks?sort=due_date&order=ASC
GET /api/v1/employees?sort=hire_date&order=DESC
```

### 4. Batch Operations

**Use batch endpoints for bulk updates:**

```bash
POST /api/v1/employees/batch
{
  "ids": [1, 2, 3, 4, 5],
  "operation": "update",
  "data": {
    "department_id": 10,
    "status": "Active"
  }
}
```

### 5. Caching

**Leverage caching headers:**

```bash
# Check cache status
Response Headers:
X-Cache: HIT  # Data from cache
X-Cache: MISS # Fresh data

# Use ETags for conditional requests
GET /api/v1/employees/1
If-None-Match: "abc123"
```

## Example LLM Interactions

### Task 1: "Show me all active employees in the Engineering department"

**Optimal API Call:**
```bash
GET /api/v1/employees?filter[department_id]=5&filter[status]=Active&pageSize=50&sort=last_name&order=ASC
```

**Why this is optimal:**
- Uses filtering to reduce data
- Specifies page size for efficiency
- Sorts for consistent display
- Single request instead of multiple

### Task 2: "Update the status of multiple employees to Active"

**Optimal API Call:**
```bash
POST /api/v1/employees/batch
{
  "ids": [10, 11, 12, 13, 14],
  "operation": "update",
  "data": {
    "onboarding_status": "Active"
  }
}
```

**Why this is optimal:**
- Single batch request instead of 5 individual updates
- Atomic operation (all succeed or all fail)
- Reduces network overhead

### Task 3: "Find all compliance items expiring in the next 30 days"

**Optimal API Call:**
```bash
GET /api/v1/compliance?filter[status]=ExpiringSoon&pageSize=100&sort=expiration_date&order=ASC
```

**Alternative with date filter:**
```bash
GET /api/v1/compliance?filter[expiration_date]=<2024-12-31&filter[expiration_date]=>2024-12-01
```

### Task 4: "Get employee data with related information"

**The API automatically eager-loads relationships:**
```bash
GET /api/v1/employees/1
# Automatically includes: Role, Department, Manager
# No need for multiple requests
```

### Task 5: "Monitor API performance"

**Check real-time metrics:**
```bash
GET /api/v1/performance/metrics
```

**Response includes:**
- Request counts and latency
- Database connection stats
- Memory usage
- Cache hit rates

## Best Practices for LLMs

### 1. Always Paginate
```python
def fetch_all_employees():
    page = 1
    all_employees = []
    
    while True:
        response = api.get(f"/employees?page={page}&pageSize=100")
        all_employees.extend(response['data'])
        
        if not response['hasMore']:
            break
        page += 1
    
    return all_employees
```

### 2. Use Appropriate Page Sizes
- Small datasets: 20-50 items
- Large datasets: 100 items (max)
- Real-time updates: 10-20 items

### 3. Implement Caching Strategy
```python
cache = {}

def get_employee(id):
    cache_key = f"employee_{id}"
    
    # Check cache first
    if cache_key in cache:
        if cache[cache_key]['expires'] > time.now():
            return cache[cache_key]['data']
    
    # Fetch from API
    response = api.get(f"/employees/{id}")
    
    # Cache for 5 minutes
    cache[cache_key] = {
        'data': response,
        'expires': time.now() + 300
    }
    
    return response
```

### 4. Handle Rate Limits
```python
def api_request_with_retry(url):
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        response = requests.get(url)
        
        if response.status_code == 429:  # Rate limited
            time.sleep(retry_delay * (2 ** attempt))  # Exponential backoff
            continue
            
        return response
    
    raise Exception("Max retries exceeded")
```

### 5. Use Filters Intelligently
```python
# Good - Single filtered request
employees = api.get("/employees?filter[department_id]=5&filter[status]=Active")

# Bad - Get all then filter in memory
all_employees = api.get("/employees")
filtered = [e for e in all_employees if e['department_id'] == 5 and e['status'] == 'Active']
```

## Performance Monitoring

### Key Metrics to Track
1. **Response Times**: Should average 30-80ms
2. **Cache Hit Rate**: Should be >60% for read operations
3. **Error Rate**: Should be <1%
4. **Database Connections**: Should stay under 20

### Health Check Integration
```python
def check_api_health():
    response = api.get("/health")
    
    if response['status'] != 'healthy':
        alert(f"API degraded: {response['database']['error']}")
    
    if response['memory']['allocated'] > 200:  # MB
        alert("High memory usage detected")
```

## Common Patterns

### 1. Paginated Data Collection
```javascript
async function getAllItems(endpoint, filters = {}) {
  let allItems = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const params = new URLSearchParams({
      page,
      pageSize: 100,
      ...filters
    });
    
    const response = await fetch(`${endpoint}?${params}`);
    const data = await response.json();
    
    allItems = allItems.concat(data.data);
    hasMore = data.hasMore;
    page++;
  }
  
  return allItems;
}
```

### 2. Efficient Search
```javascript
async function searchEmployees(term) {
  // Use search parameter for multi-field search
  const response = await fetch(`/api/v1/employees?search=${term}&pageSize=20`);
  return response.json();
}
```

### 3. Batch Processing
```javascript
async function updateMultipleRecords(ids, updates) {
  // Process in chunks of 100
  const chunks = [];
  for (let i = 0; i < ids.length; i += 100) {
    chunks.push(ids.slice(i, i + 100));
  }
  
  const results = await Promise.all(
    chunks.map(chunk => 
      fetch('/api/v1/employees/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: chunk,
          operation: 'update',
          data: updates
        })
      })
    )
  );
  
  return results;
}
```

## Error Handling

### Response Status Codes
- `200`: Success
- `304`: Not Modified (cache hit)
- `400`: Bad Request (check parameters)
- `401`: Unauthorized (refresh token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Rate Limited (retry with backoff)
- `500`: Server Error (retry or report)

### Error Response Format
```json
{
  "error": "Validation failed",
  "message": "Invalid email format",
  "field": "email",
  "code": "VALIDATION_ERROR"
}
```

## Summary

When integrating with the Mountain Care HR API:

1. **Always use pagination** - Never request unlimited data
2. **Filter at the source** - Use query parameters, not in-memory filtering
3. **Batch when possible** - Reduce requests for bulk operations
4. **Cache appropriately** - Respect TTLs and use ETags
5. **Monitor performance** - Check /performance/metrics regularly
6. **Handle errors gracefully** - Implement retry logic with backoff
7. **Use the schema** - Reference /llm/schema for accurate field information
8. **Optimize queries** - Use appropriate page sizes and filters
9. **Respect rate limits** - Check headers and implement backoff
10. **Test with production-like data** - Ensure your integration scales

The API is optimized for high performance with average response times of 30-80ms. By following these guidelines, LLMs can efficiently interact with the API while maintaining optimal performance.