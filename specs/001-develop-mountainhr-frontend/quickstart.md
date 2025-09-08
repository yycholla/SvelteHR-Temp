# MountainHR Frontend Quickstart

**Purpose**: Validate core user stories through executable test scenarios  
**Prerequisites**: GelDB GraphQL API running with test data  
**Estimated Time**: 15 minutes

## Test Environment Setup

### 1. Start GelDB Backend

```bash
# Ensure GelDB is running with HR schema
curl http://localhost:8080/api/v1/health
# Expected: {"status": "ok", "timestamp": "..."}
```

### 2. Verify GraphQL Schema

```bash
# Check GraphQL introspection
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
# Expected: List including User, Employee, Department types
```

### 3. Create Test Users

```bash
# Create test admin user
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createUser(input: { email: \"admin@mountainhr.test\", password: \"admin123\", firstName: \"Admin\", lastName: \"User\" }) { id email } }"
  }'

# Create test employee user
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createUser(input: { email: \"employee@mountainhr.test\", password: \"emp123\", firstName: \"John\", lastName: \"Doe\" }) { id email } }"
  }'
```

## Core User Story Validation

### Story 1: HR Manager Authentication & Dashboard Access

**Test Steps**:

1. **Navigate to login**: Open `http://localhost:5173/login`
2. **Enter admin credentials**:
   - Email: `admin@mountainhr.test`
   - Password: `admin123`
3. **Verify successful login**: Should redirect to `/dashboard`
4. **Check dashboard content**: Should display HR management tools
5. **Verify role-based UI**: Should show admin-level navigation and features

**Expected Results**:

- [x] Login form accepts credentials
- [x] Authentication request succeeds
- [x] JWT token stored securely
- [x] Dashboard loads with admin features visible
- [x] Navigation shows HR management options

**GraphQL Operations Tested**:

```graphql
mutation Login($input: LoginInput!) {
	login(input: $input) {
		token
		refreshToken
		user {
			id
			email
			roles {
				name
				permissions {
					resource
					action
				}
			}
		}
	}
}

query Me {
	me {
		id
		employee {
			position
			department {
				name
			}
			directReports {
				id
				firstName
				lastName
			}
		}
	}
}
```

### Story 2: Employee Self-Service Portal Access

**Test Steps**:

1. **Logout from admin**: Click logout, verify redirect to login
2. **Login as employee**:
   - Email: `employee@mountainhr.test`
   - Password: `emp123`
3. **Verify employee dashboard**: Should show limited, role-appropriate features
4. **Check profile access**: Should access own profile, not others
5. **Verify restricted features**: HR management tools should be hidden

**Expected Results**:

- [x] Employee login succeeds
- [x] Dashboard shows employee-specific content
- [x] Profile page shows own information only
- [x] HR management features not visible
- [x] Navigation limited to employee actions

**GraphQL Operations Tested**:

```graphql
query MyProfile {
	myProfile {
		id
		employeeId
		position
		department {
			name
		}
		manager {
			firstName
			lastName
		}
		# Should NOT return salary or sensitive data
	}
}
```

### Story 3: Role-Based Access Control

**Test Steps**:

1. **As employee, attempt restricted action**: Try to access `/employees` list
2. **Verify access denied**: Should show "Insufficient permissions" message
3. **Login as admin**: Switch back to admin account
4. **Access employee list**: Should successfully load `/employees`
5. **Verify permission-based UI**: Sensitive data visible to admin only

**Expected Results**:

- [x] Employee cannot access HR employee list
- [x] Appropriate error messages displayed
- [x] Admin can access all employee data
- [x] Salary information visible to admin only
- [x] UI adapts based on user permissions

**GraphQL Operations Tested**:

```graphql
# As employee - should fail
query Employees {
	employees(page: 1, limit: 10) {
		employees {
			id
			firstName
			salary # Should be null for non-HR users
		}
	}
}

# As admin - should succeed with full data
query EmployeesAdmin {
	employees(page: 1, limit: 10) {
		employees {
			id
			firstName
			salary # Should return actual values
			department {
				name
			}
		}
	}
}
```

### Story 4: HR Communication System

**Test Steps**:

1. **As admin, send announcement**: Create company-wide message
2. **Verify message creation**: Check message appears in admin's sent items
3. **Login as employee**: Switch to employee account
4. **Check inbox**: Verify announcement received
5. **Mark as read**: Test message read status update

**Expected Results**:

- [x] Admin can create announcements
- [x] Message sent to all users
- [x] Employee receives announcement
- [x] Read status updates correctly
- [x] Real-time notification works (if implemented)

**GraphQL Operations Tested**:

```graphql
mutation SendAnnouncement($input: SendCommunicationInput!) {
	sendCommunication(input: $input) {
		id
		subject
		recipients {
			id
			email
		}
	}
}

query MyCommunications {
	communications(page: 1, limit: 10, unreadOnly: false) {
		communications {
			id
			subject
			sender {
				firstName
				lastName
			}
			isRead
			priority
		}
	}
}

mutation MarkRead($id: ID!) {
	markAsRead(id: $id) {
		id
		isRead
	}
}
```

### Story 5: Responsive UI Validation

**Test Steps**:

1. **Desktop testing**: Verify layout at 1920x1080
2. **Tablet testing**: Resize to 768x1024, check responsive behavior
3. **Mobile testing**: Resize to 375x667, verify mobile layout
4. **Navigation testing**: Ensure all features accessible on mobile
5. **Form testing**: Test forms work on all screen sizes

**Expected Results**:

- [x] Desktop layout fully functional
- [x] Tablet layout adapts correctly
- [x] Mobile layout optimized for touch
- [x] Navigation collapses appropriately
- [x] Forms remain usable on small screens

## Integration Test Scenarios

### Authentication Flow Integration

```typescript
// tests/integration/auth.spec.ts
test('Complete authentication workflow', async () => {
	// 1. Login with valid credentials
	const loginResponse = await graphql(`
		mutation {
			login(input: { email: "admin@mountainhr.test", password: "admin123" }) {
				token
				user {
					id
					roles {
						name
					}
				}
			}
		}
	`);

	expect(loginResponse.data.login.token).toBeDefined();

	// 2. Use token for authenticated request
	const meResponse = await graphql(
		`
			query {
				me {
					id
					email
				}
			}
		`,
		{
			headers: { Authorization: `Bearer ${loginResponse.data.login.token}` }
		}
	);

	expect(meResponse.data.me.email).toBe('admin@mountainhr.test');

	// 3. Refresh token before expiry
	const refreshResponse = await graphql(`
    mutation { 
      refreshToken(refreshToken: "${loginResponse.data.login.refreshToken}") {
        token
      }
    }
  `);

	expect(refreshResponse.data.refreshToken.token).toBeDefined();
});
```

### RBAC Authorization Integration

```typescript
// tests/integration/rbac.spec.ts
test('Role-based access control enforcement', async () => {
	// 1. Employee cannot access salary data
	const employeeToken = await loginAs('employee@mountainhr.test');
	const employeeQuery = await graphql(
		`
			query {
				employees {
					employees {
						id
						salary
					}
				}
			}
		`,
		{ headers: { Authorization: `Bearer ${employeeToken}` } }
	);

	expect(employeeQuery.errors).toBeDefined();
	expect(employeeQuery.errors[0].message).toContain('Insufficient permissions');

	// 2. Admin can access all data
	const adminToken = await loginAs('admin@mountainhr.test');
	const adminQuery = await graphql(
		`
			query {
				employees {
					employees {
						id
						salary
					}
				}
			}
		`,
		{ headers: { Authorization: `Bearer ${adminToken}` } }
	);

	expect(adminQuery.data.employees.employees[0].salary).toBeDefined();
});
```

## Validation Checklist

### ✅ Authentication & Authorization

- [ ] User login with valid credentials succeeds
- [ ] Invalid credentials properly rejected
- [ ] JWT tokens generated and validated
- [ ] Role-based UI rendering works
- [ ] Permission checks enforced server-side
- [ ] Session management (refresh, logout) functional

### ✅ Employee Management

- [ ] Employee list loads with pagination
- [ ] Employee profiles accessible based on permissions
- [ ] Employee creation/updates work (HR role)
- [ ] Search and filtering functional
- [ ] Department organization correct

### ✅ Communication System

- [ ] Messages can be sent and received
- [ ] Read/unread status tracking works
- [ ] Permission-based message access
- [ ] Real-time updates (if implemented)

### ✅ UI/UX Requirements

- [ ] Responsive design across devices
- [ ] Accessible navigation and forms
- [ ] Loading states and error handling
- [ ] Consistent visual design
- [ ] Performance meets targets (<200ms page loads)

### ✅ Security & Compliance

- [ ] RBAC properly enforced
- [ ] Sensitive data protected
- [ ] Input validation working
- [ ] Audit logging functional
- [ ] CSRF/XSS protections active

## Success Criteria

**All test scenarios must pass** before proceeding to production deployment.

**Performance benchmarks**:

- Login response: <500ms
- Dashboard load: <1s
- Employee list (20 items): <800ms
- UI interactions: <50ms response

**Accessibility standards**:

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios met

**Browser compatibility**:

- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile Safari and Chrome latest versions
