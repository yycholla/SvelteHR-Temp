#!/bin/bash

curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@postgraphile-hr.com","password":"AdminPass123!","rememberMe":false}' \
  -v