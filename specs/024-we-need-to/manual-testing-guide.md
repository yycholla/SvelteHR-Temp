# Manual Testing Guide: Feature 024
**Secure Employee Document Management**

**Task**: T056 - Manual Quickstart Test Scenario
**Date**: 2025-10-07
**Status**: Ready for execution
**Time Requirement**: ~15 minutes

---

## Prerequisites

### Environment Setup

1. **Local Development Server**
   ```bash
   cd /home/yycholla/Documents/SvelteHR
   npm run dev:local  # Start SvelteKit dev server on http://localhost:5173
   ```

2. **Database Status**
   - PostgreSQL running on port 5432 or 5433
   - All 7 migrations applied (20251007_008 through 20251007_014)
   - Database: `hr_system`

3. **Verify Database Migrations**
   ```bash
   PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d hr_system -c "
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'hr_public'
   AND tablename IN ('documents', 'document_assignments', 'document_access_logs',
                     'document_categories', 'encryption_keys', 'document_versions')
   ORDER BY tablename;"
   ```

   **Expected Output**: All 6 tables listed

4. **Test User Accounts**
   - Admin/HR Manager: `admin@example.com` or `hr_manager@test.com`
   - Employee: `employee@example.com` or `employee@test.com`

   ⚠️ **Note**: Ensure these users exist in the database with proper roles

5. **Test Files**
   Create test file directory:
   ```bash
   mkdir -p /home/yycholla/Documents/SvelteHR/test-files
   ```

   **Required Test Files**:
   - `sample-offer-letter.pdf` (2MB PDF file)
   - `sample-contract.pdf` (5MB PDF file)
   - `sample-document.docx` (3MB Word file)

---

## Test Scenario: Complete Document Lifecycle

### Overview
This test validates the complete document management workflow:
1. **Upload** document with encryption (HR Manager)
2. **Assign** document to employee (HR Manager)
3. **Preview** document (Employee)
4. **View** audit trail (HR Manager)

**Total Time**: Each operation should complete in <5 seconds
**Success Criteria**: All ✅ checkpoints must pass

---

## Step 1: Upload Document (HR Manager/Admin)

### Actions

1. **Login as HR Manager/Admin**
   - Navigate to: `http://localhost:5173/login`
   - Email: `admin@example.com` (or `hr_manager@test.com`)
   - Password: [use appropriate password]
   - Click "Login"

   ✅ **Verify**: Redirected to dashboard

2. **Navigate to Document Upload**
   - Navigate to: `http://localhost:5173/dashboard/documents/upload`
   - **OR** click "Documents" → "Upload Document" in navigation

   ✅ **Verify**: Upload page loads successfully

3. **Select File**
   - Click "Choose File" or drag file to drop zone
   - Select: `test-files/sample-offer-letter.pdf` (2MB)

   ✅ **Verify**: File name appears in upload component

4. **Fill Metadata Form**
   - **Category**: Select "Contract" (or "Offer Letter" if available)
   - **Sensitivity Level**: Select "Internal"
   - **Description** (optional): "Employment offer letter for new hire"
   - **Assign To** (if available): Leave empty for now

   ✅ **Verify**: All form fields populated

5. **Upload Document**
   - Click "Upload" button
   - **Observe**: Client-side encryption progress bar
     - Stage 1: "Encrypting..." (AES-GCM-256)
     - Stage 2: "Uploading..."
     - Stage 3: "Processing..."
     - Stage 4: "Complete"

   ✅ **Verify**: Progress bar completes without errors
   ✅ **Verify**: Success toast notification appears
   ✅ **Verify**: Upload completes in <30 seconds

6. **Verify Document in List**
   - Navigate to: `http://localhost:5173/dashboard/documents`
   - Find "sample-offer-letter.pdf" in document list

   ✅ **Verify**: Document appears with correct metadata
   ✅ **Verify**: File size shown correctly (~2MB)
   ✅ **Verify**: Category badge displays "Contract" (or selected category)
   ✅ **Verify**: Sensitivity badge displays "Internal"

**Result**: 📋 Document uploaded successfully with encryption

---

## Step 2: Assign Document to Employee

### Actions

1. **Open Document Details**
   - From document list, click on "sample-offer-letter.pdf"
   - **OR** click "View Details" button

   ✅ **Verify**: Document detail page loads

2. **Open Assignment Modal**
   - Click "Assign to Employee" button
   - **OR** click "Assign" in actions dropdown

   ✅ **Verify**: Assignment modal opens

3. **Select Employee**
   - In employee search/select field:
     - Type: "employee@example.com"
     - Select employee from dropdown

   ✅ **Verify**: Employee selected in form

4. **Add Assignment Note**
   - Assignment Type: "Individual" (auto-selected)
   - Assignment Reason/Note: "Your offer letter for review"

   ✅ **Verify**: Note field populated

5. **Create Assignment**
   - Click "Assign Document" button
   - **Observe**: Assignment processing

   ✅ **Verify**: Success toast notification
   ✅ **Verify**: Assignment completes in <5 seconds

6. **Verify Assignment Record**
   - On document detail page, check "Assignments" section

   ✅ **Verify**: Employee assignment listed
   ✅ **Verify**: Assignment status: "Active"
   ✅ **Verify**: Assigned by: [your admin username]
   ✅ **Verify**: Timestamp displayed

**Expected**: 📧 Email notification sent to employee@example.com (if email service configured)

**Result**: 👤 Document assigned to employee

---

## Step 3: Preview Document (Employee)

### Actions

1. **Logout from Admin Account**
   - Click user profile menu → "Logout"

   ✅ **Verify**: Logged out successfully

2. **Login as Employee**
   - Navigate to: `http://localhost:5173/login`
   - Email: `employee@example.com`
   - Password: [use appropriate password]
   - Click "Login"

   ✅ **Verify**: Redirected to employee dashboard

3. **Navigate to Documents**
   - Navigate to: `http://localhost:5173/dashboard/documents`
   - **OR** click "My Documents" in navigation

   ✅ **Verify**: Documents page loads

4. **Verify Document Visibility**
   - Find "sample-offer-letter.pdf" in document list
   - **Note**: Employee should ONLY see assigned documents (RBAC filtering)

   ✅ **Verify**: Assigned document visible
   ✅ **Verify**: Unassigned documents NOT visible (RBAC enforced)

5. **Open Document Preview**
   - Click document row or "Preview" button
   - **Observe**: Preview modal opens

   ✅ **Verify**: Preview modal displays
   ✅ **Verify**: Loading indicator appears

6. **View Document Preview**
   - Wait for preview to load
   - **For PDF**: Direct PDF rendering in iframe
   - **For Office docs**: Converted to PDF first

   ✅ **Verify**: Document preview loads successfully
   ✅ **Verify**: Preview loads in <5 seconds (PDF) or <10 seconds (Office docs)
   ✅ **Verify**: Document content is readable

   **Optional Check**: Watermark displays "Viewed by employee@example.com"

7. **Download Document (Optional)**
   - Click "Download" button in preview modal
   - **Observe**: Encrypted file download
   - **Observe**: Client-side decryption

   ✅ **Verify**: Download initiates
   ✅ **Verify**: Decrypted file opens correctly

**Result**: 👁️ Employee previewed assigned document

---

## Step 4: Audit Trail Verification (HR Manager/Admin)

### Actions

1. **Logout from Employee Account**
   - Click user profile menu → "Logout"

   ✅ **Verify**: Logged out successfully

2. **Login as HR Manager/Admin**
   - Navigate to: `http://localhost:5173/login`
   - Email: `admin@example.com`
   - Password: [use appropriate password]

   ✅ **Verify**: Login successful

3. **Navigate to Audit Logs**
   - Navigate to: `http://localhost:5173/dashboard/documents/audit`
   - **OR** click "Documents" → "Audit Logs"

   ✅ **Verify**: Audit log page loads
   ✅ **Verify**: Access denied if not admin/HR role (RBAC test)

4. **Filter Audit Logs**
   - Filter by Document: "sample-offer-letter.pdf"
   - **OR** Filter by User: "employee@example.com"
   - Date Range: Last 24 hours

   ✅ **Verify**: Filter controls work

5. **Verify Audit Trail Entries**

   **Expected Entries** (in chronological order):

   | Access Type | User | Outcome | Timestamp |
   |-------------|------|---------|-----------|
   | `upload` | admin@example.com | success | [recent] |
   | `assign` | admin@example.com | success | [recent] |
   | `preview` | employee@example.com | success | [recent] |
   | `download` | employee@example.com | success | [if downloaded] |

   ✅ **Verify**: All access events logged
   ✅ **Verify**: Correct user attribution
   ✅ **Verify**: Success outcomes recorded
   ✅ **Verify**: Timestamps accurate
   ✅ **Verify**: IP addresses logged (if available)
   ✅ **Verify**: User agents logged

6. **Export Audit Log (Optional)**
   - Click "Export CSV" button

   ✅ **Verify**: CSV download works
   ✅ **Verify**: CSV contains correct data

**Result**: 📊 Complete audit trail verified

---

## Additional Validation Tests

### Test 5: RBAC Enforcement

**Objective**: Verify role-based access control

1. **Employee Cannot Upload**
   - Login as: `employee@example.com`
   - Navigate to: `http://localhost:5173/dashboard/documents/upload`

   ✅ **Verify**: Access denied (403 Forbidden) OR upload button disabled

2. **Employee Cannot View Audit Logs**
   - Navigate to: `http://localhost:5173/dashboard/documents/audit`

   ✅ **Verify**: Access denied (403 Forbidden)

3. **Employee Cannot Assign Documents**
   - Open any assigned document detail page

   ✅ **Verify**: "Assign" button not visible/disabled

**Result**: 🔒 RBAC enforcement validated

---

### Test 6: File Type Validation

**Objective**: Verify only allowed file types can be uploaded

1. **Attempt Upload of Disallowed File Type**
   - Login as admin
   - Navigate to upload page
   - Attempt to upload: `test.exe` or `test.sh`

   ✅ **Verify**: Upload rejected with error message
   ✅ **Verify**: Error message mentions allowed file types

2. **Upload All Allowed File Types**

   **Allowed Types** (test each):
   - ✅ PDF (.pdf)
   - ✅ JPEG (.jpeg, .jpg)
   - ✅ PNG (.png)
   - ✅ GIF (.gif)
   - ✅ DOCX (.docx)
   - ✅ XLSX (.xlsx)
   - ✅ TXT (.txt)
   - ✅ CSV (.csv)

   ✅ **Verify**: All 8 allowed types upload successfully

**Result**: ✅ File type validation enforced

---

### Test 7: File Size Validation

**Objective**: Verify 50MB file size limit

1. **Attempt Upload of Oversized File**
   - Create or use file >50MB
   - Attempt upload

   ✅ **Verify**: Upload rejected with error
   ✅ **Verify**: Error message mentions 50MB limit

2. **Upload Maximum Allowed Size**
   - Upload file exactly 50MB (if available)

   ✅ **Verify**: Upload succeeds
   ✅ **Verify**: Upload completes in <30 seconds

**Result**: 📏 File size limit enforced

---

### Test 8: Soft Delete Verification

**Objective**: Verify soft delete behavior

1. **Delete Document**
   - Login as admin
   - Navigate to document list
   - Select "sample-offer-letter.pdf"
   - Click "Delete" button
   - Confirm deletion

   ✅ **Verify**: Document removed from list

2. **Verify Soft Delete**
   - Document should be hidden from regular views
   - **Database Check**:
     ```bash
     PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d hr_system -c "
     SELECT id, filename, is_deleted, deleted_at
     FROM hr_public.documents
     WHERE filename = 'sample-offer-letter.pdf';"
     ```

   ✅ **Verify**: Record still exists in database
   ✅ **Verify**: `is_deleted = true`
   ✅ **Verify**: `deleted_at` timestamp set

3. **Verify Audit Log**
   - Check audit logs for delete event

   ✅ **Verify**: Delete action logged

**Result**: 🗑️ Soft delete working correctly

---

## Performance Validation

### Performance Targets

| Operation | Target | Measured | Status |
|-----------|--------|----------|--------|
| Upload 2MB file | <10s | ___ s | ⬜ |
| Upload 10MB file | <20s | ___ s | ⬜ |
| Upload 50MB file | <30s | ___ s | ⬜ |
| PDF preview | <3s | ___ s | ⬜ |
| DOCX preview | <5s | ___ s | ⬜ |
| Document list (100 docs) | <2s | ___ s | ⬜ |
| Search/filter | <1s | ___ s | ⬜ |
| Audit log query | <2s | ___ s | ⬜ |

**Measurement**: Use browser DevTools Network tab or `performance.now()` in console

---

## Error Handling Validation

### Test Error Scenarios

1. **Network Interruption During Upload**
   - Start upload
   - Disable network mid-upload

   ✅ **Verify**: Error message displayed
   ✅ **Verify**: Upload can be retried

2. **Invalid Metadata**
   - Attempt upload without selecting category

   ✅ **Verify**: Validation error shown
   ✅ **Verify**: Form submission blocked

3. **Expired Preview URL**
   - Generate preview
   - Wait >15 minutes
   - Attempt to access preview URL

   ✅ **Verify**: Preview expired error shown

---

## Browser Compatibility

Test in multiple browsers:

- [ ] ✅ Chrome (latest)
- [ ] ✅ Firefox (latest)
- [ ] ✅ Safari (latest)
- [ ] ✅ Edge (latest)

**Web Crypto API Requirement**: All browsers must support Web Crypto API (Chrome 60+, Firefox 75+, Safari 11+)

---

## Test Results Summary

### Execution Record

**Test Date**: _________________
**Tester**: _________________
**Environment**: Local development
**Browser**: _________________
**Total Time**: _________ minutes

### Checklist Results

**Core Workflow** (Steps 1-4):
- [ ] ✅ Step 1: Upload Document
- [ ] ✅ Step 2: Assign Document
- [ ] ✅ Step 3: Preview Document (Employee)
- [ ] ✅ Step 4: Audit Trail Verification

**Additional Tests**:
- [ ] ✅ Test 5: RBAC Enforcement
- [ ] ✅ Test 6: File Type Validation
- [ ] ✅ Test 7: File Size Validation
- [ ] ✅ Test 8: Soft Delete Verification

**Performance Targets**:
- [ ] ✅ All operations <5s (except large file uploads)
- [ ] ✅ No console errors
- [ ] ✅ Encryption/decryption transparent to user

### Issues Encountered

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

### Overall Result

- [ ] ✅ **PASS** - All tests successful, ready for production
- [ ] ⚠️ **PASS WITH ISSUES** - Minor issues, can proceed with fixes
- [ ] ❌ **FAIL** - Critical issues, must fix before production

---

## Notes & Observations

```
[Space for tester notes]








```

---

## Next Steps

**If PASS**:
1. Mark T056 as complete
2. Update tasks.md (56 of 56 tasks complete - 100%)
3. Create pull request for feature 024
4. Schedule code review
5. Plan production deployment

**If FAIL**:
1. Document issues in GitHub
2. Create fix tasks
3. Re-run manual test after fixes
4. Update test results

---

**Document Version**: 1.0
**Feature**: 024 - Secure Employee Document Management
**Status**: Ready for Execution
**Estimated Time**: 15 minutes

🔬 **Execute this manual test to validate the complete document management system before production deployment.**
