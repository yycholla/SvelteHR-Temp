# Plan Update: Reverting "unknown" to "TypeSafeApiResult"

You correctly pointed out that using `unknown` and custom type guards in an ad-hoc manner for API responses is not the desired approach. We want **declared types** that reflect the contract, ensuring we use what we expect from the backend.

The goal is to use `TypeSafeApiResult` (or a similar generic wrapper) to enforce type safety on API calls without manually writing type guards for every single response, while still avoiding `any`.

## Strategy
1.  **Define `TypeSafeApiResult`**: Create a generic type wrapper for API responses if it doesn't exist, or use the existing `ApiResponse<T>` from `src/lib/types/index.ts`.
2.  **Revisit `src/lib/server/rbac-utils.ts`**: Replace the `unknown` + manual type guard pattern with `TypeSafeApiResult<DepartmentManagerResponse>`.
3.  **Audit other changes**: Ensure we haven't lost type information elsewhere.

I will verify if `TypeSafeApiResult` exists or if `ApiResponse<T>` is the intended target, then refactor `rbac-utils.ts`.
