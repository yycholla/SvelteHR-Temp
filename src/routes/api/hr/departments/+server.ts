/**
 * Departments API Endpoint - PostGraphile GraphQL Implementation
 * Note: This endpoint is deprecated in favor of direct GraphQL queries
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This endpoint has been deprecated and replaced with direct PostGraphile GraphQL queries

export const GET: RequestHandler = async () => {
  return json({
    error: 'This endpoint has been deprecated. Please use PostGraphile GraphQL directly at http://localhost:4001/graphql',
    message: 'Migration to PostGraphile complete - use direct GraphQL queries instead',
    graphql_endpoint: 'http://localhost:4001/graphql',
    graphiql_explorer: 'http://localhost:4001/graphiql'
  }, { status: 410 }); // 410 Gone
};

export const POST: RequestHandler = async () => {
  return json({
    error: 'This endpoint has been deprecated. Please use PostGraphile GraphQL directly at http://localhost:4001/graphql',
    message: 'Migration to PostGraphile complete - use direct GraphQL mutations instead',
    graphql_endpoint: 'http://localhost:4001/graphql',
    graphiql_explorer: 'http://localhost:4001/graphiql'
  }, { status: 410 }); // 410 Gone
};