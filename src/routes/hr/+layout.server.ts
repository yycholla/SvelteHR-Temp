import type { LayoutServerLoad } from './$types';
import { withAuthGuard, roleChecks } from '$lib/auth/guards';

// Require HR role or admin role for all HR pages
export const load: LayoutServerLoad = withAuthGuard(
  roleChecks.hrOrAdmin()
);