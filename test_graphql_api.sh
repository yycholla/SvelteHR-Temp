#!/bin/bash

# GraphQL API Test Script
# Tests all endpoints against frontend expectations

TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NDQ1YmVjYS1jMDI3LTQ3YzUtOTlhOC0zYmUyY2MwYjVlZWEiLCJ1c2VyX2lkIjoiNjQ0NWJlY2EtYzAyNy00N2M1LTk5YTgtM2JlMmNjMGI1ZWVhIiwiZW1haWwiOiJhZG1pbkBtb3VudGFpbmhyLmRldiIsInJvbGVzIjpbInN1cGVyX2FkbWluIl0sInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzYwMzc4MDI2LCJleHAiOjE3NjA0NjQ0MjZ9.IdPUnYfJfr2Pu3lxN0Jvkn7VgpxKaWw_sNEGjU02gw4"
API_URL="http://localhost:4001/graphql"

echo "=========================================="
echo "Testing GraphQL API"
echo "=========================================="
echo ""

echo "=========================================="
echo "1. Testing Users Endpoint"
echo "=========================================="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "{ users(limit: 1) { id email firstName lastName displayName fullName role phone alternatePhone jobTitle status departmentId managerId hireDate isActive createdAt updatedAt } }"
  }' | python3 -m json.tool

echo ""
echo ""

echo "=========================================="
echo "2. Testing Tasks Endpoint"
echo "=========================================="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "{ tasks(limit: 1) { id title description status priority dueDate assigneeId createdBy parentTaskId archived archivedAt archivedBy departmentId createdAt updatedAt } }"
  }' | python3 -m json.tool

echo ""
echo ""

echo "=========================================="
echo "3. Testing Performance Reviews Endpoint"
echo "=========================================="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "{ performanceReviews(limit: 1) { id employeeId reviewerId reviewPeriod status overallRating goals achievements areasForImprovement managerFeedback reviewPeriodStart reviewPeriodEnd reviewType notes createdAt updatedAt } }"
  }' | python3 -m json.tool

echo ""
echo ""

echo "=========================================="
echo "4. Testing Event Attendees Endpoint"
echo "=========================================="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "{ eventAttendees(limit: 1) { id eventId employeeId responseStatus isRequired reminderTime scope isOrganizer createdAt } }"
  }' | python3 -m json.tool

echo ""
echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
