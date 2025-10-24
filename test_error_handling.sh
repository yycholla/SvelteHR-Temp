#!/bin/bash

# Test GraphQL error handling with extensions

echo "Testing GraphQL error handling..."

# Test 1: Query non-existent task (should return NOT_FOUND)
echo "Test 1: Query non-existent task"
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { task(id: \"550e8400-e29b-41d4-a716-446655440000\") { id title } }"
  }' | jq .

echo -e "\n"

# Test 2: Try to create task without authentication (should return UNAUTHENTICATED)
echo "Test 2: Create task without authentication"
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { tasks { createTask(input: { title: \"Test Task\", description: \"Test\", priority: HIGH }) { id } } }"
  }' | jq .

echo -e "\n"

# Test 3: Invalid input (should return BAD_USER_INPUT)
echo "Test 3: Invalid task input"
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { tasks { createTask(input: { title: \"\", description: \"Test\", priority: HIGH }) { id } } }"
  }' | jq .

echo -e "\n"

# Test 4: Try to update non-existent task (should return NOT_FOUND)
echo "Test 4: Update non-existent task"
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { tasks { updateTask(id: \"550e8400-e29b-41d4-a716-446655440000\", input: { title: \"Updated Title\" }) { id } } }"
  }' | jq .

echo "Error handling tests completed."