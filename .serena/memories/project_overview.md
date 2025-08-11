# SvelteHR Project Overview

## Project Purpose
SvelteHR is a comprehensive Human Resources (HR) management application built with SvelteKit. It's part of the Mountain Care ecosystem and provides:

- Employee management (listing, creating, editing with advanced filtering and pagination)
- Task management and assignment
- Compliance tracking and document management
- Leave request management
- Dashboard with real-time metrics and streaming data
- Authentication system with JWT tokens
- Role-based access control
- Notifications and alerts
- Calendar functionality for scheduling
- Reports and analytics
- Settings management

## Current State
- **Authentication System**: Working login with JWT token management
- **Employee Management**: Functional with pagination, filtering, and search
- **UI Component Library**: Comprehensive set of reusable components
- **Base Infrastructure**: Routing, state management, API client setup
- Some pages are still UI-only stubs awaiting backend integration

## Backend Integration
- Backend API runs on localhost:8080/api/v1
- Admin credentials: admin/admin
- Comprehensive API with performance optimizations, pagination, filtering, and batch operations
- LLM-friendly schema endpoint at `/api/v1/llm/schema`
- Performance monitoring at `/api/v1/performance/metrics`

## Key Features
- Real-time streaming data capabilities
- Advanced filtering and search across all entities
- Batch operations for bulk updates
- Performance-optimized API with caching
- Responsive design with dark/light mode support
- Component-driven architecture with Storybook