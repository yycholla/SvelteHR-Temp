import type { LayoutServerLoad } from './$types';
import { withAuthGuard, roleChecks } from '$lib/auth/guards';

// Require admin role for all admin pages
export const load: LayoutServerLoad = withAuthGuard(
  roleChecks.admin()
);