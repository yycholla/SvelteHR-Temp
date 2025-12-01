import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';

async function migrateAuthStore() {
    console.log('Finding files importing from $lib/stores/auth...');
    const files = await glob('src/**/*.{svelte,ts}', { ignore: ['src/lib/stores/auth.ts', 'src/lib/stores/auth.svelte.ts'] });
    
    let updatedCount = 0;

    for (const file of files) {
        let content = await readFile(file, 'utf-8');
        const originalContent = content;

        // 1. Update import statements
        // Matches: import { ... } from '$lib/stores/auth';
        const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]\$lib\/stores\/auth['"];?/g;
        
        if (importRegex.test(content)) {
            content = content.replace(importRegex, (match, imports) => {
                const importsList = imports.split(',').map(i => i.trim());
                const newImports = [];
                let needsAuth = false;
                let needsUserType = false;

                for (const imp of importsList) {
                    if (imp === 'authStore' || imp === 'authActions' || imp === 'currentUser' || imp === 'isAuthenticated' || imp === 'isLoading' || imp === 'authError' || imp === 'rbac' || imp === 'userRoles') {
                        needsAuth = true;
                    } else if (imp === 'hasPermission' || imp === 'hasRole' || imp === 'hasMinimumRoleLevel' || imp === 'canManageUser') {
                        needsAuth = true; // These are now methods on auth store instance
                    } else if (imp === 'User') {
                        needsUserType = true;
                    } else if (imp.startsWith('can')) { // canViewUsers, etc.
                        needsAuth = true;
                    }
                }

                const parts = [];
                if (needsAuth) parts.push('auth');
                if (needsUserType) parts.push('type User');
                
                if (parts.length === 0) return match; // Keep as is if we don't know how to migrate

                return `import { ${parts.join(', ')} } from '$lib/stores/auth.svelte';`;
            });
        }

        // 2. Update usages
        // $authStore -> auth
        content = content.replace(/\$authStore/g, 'auth');
        // authStore. -> auth.
        content = content.replace(/authStore\./g, 'auth.');
        
        // $currentUser -> auth.user
        content = content.replace(/\$currentUser/g, 'auth.user');
        // currentUser -> auth.user (if not part of import) - risky, but usually $currentUser
        // We handle imports above, so currentUser symbol might remain if used as variable name locally?
        // But typically we use $currentUser. 
        // If someone did `get(currentUser)`, that's harder.
        
        // $isAuthenticated -> auth.isAuthenticated
        content = content.replace(/\$isAuthenticated/g, 'auth.isAuthenticated');
        
        // $isLoading -> auth.isLoading
        content = content.replace(/\$isLoading/g, 'auth.isLoading');
        
        // $authError -> auth.error
        content = content.replace(/\$authError/g, 'auth.error');
        
        // $rbac -> auth.rbac
        content = content.replace(/\$rbac/g, 'auth.rbac');
        
        // $canViewUsers -> auth.canViewUsers (and other permissions)
        const permissionStores = [
            'canViewUsers', 'canManageUsers', 'canViewSensitiveData', 'canManageRoles',
            'canApproveLeave', 'canManageWorkflows', 'canManageCompliance', 'userHighestRole'
        ];
        
        for (const store of permissionStores) {
            const regex = new RegExp(`\$${store}`, 'g');
            content = content.replace(regex, `auth.${store}`);
        }

        // authActions.login -> auth.login
        content = content.replace(/authActions\./g, 'auth.');

        // Standalone functions imported from auth store
        // hasPermission(p) -> auth.hasPermission(p)
        // Careful not to replace definition `function hasPermission` or local var.
        // We rely on the fact that we changed the import to `auth`. 
        // So `hasPermission(...)` will now fail if not prefixed, unless we aliased it or kept it.
        // But we removed `hasPermission` from import. So we must update usage.
        // Simple regex might catch local definitions.
        // Strategy: look for `hasPermission(` that is NOT preceded by `function ` or `.`.
        content = content.replace(/(?<!function\s|[\w\.])hasPermission\(/g, 'auth.hasPermission(');
        content = content.replace(/(?<!function\s|[\w\.])hasRole\(/g, 'auth.hasRole(');
        content = content.replace(/(?<!function\s|[\w\.])hasMinimumRoleLevel\(/g, 'auth.hasMinimumRoleLevel(');
        content = content.replace(/(?<!function\s|[\w\.])canManageUser\(/g, 'auth.canManageUser(');

        // $userRoles -> auth.user?.roles (or auth.roles)
        // In auth.ts, $userRoles returns $state.roles. In auth.svelte.ts, roles is public property.
        // So $userRoles -> auth.roles
        content = content.replace(/\$userRoles/g, 'auth.roles');

        // get(currentUser) -> auth.user
        // get(authStore) -> auth
        // This requires `get` from `svelte/store`.
        // If we removed `get` from imports, this code breaks if we don't replace.
        // Regex: get(\s*currentUser\s*)
        content = content.replace(/get\(\s*currentUser\s*\)/g, 'auth.user');
        content = content.replace(/get\(\s*authStore\s*\)/g, 'auth');
        content = content.replace(/get\(\s*isAuthenticated\s*\)/g, 'auth.isAuthenticated');

        if (content !== originalContent) {
            console.log(`Updating ${file}...`);
            await writeFile(file, content, 'utf-8');
            updatedCount++;
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} files.`);
}

migrateAuthStore().catch(console.error);
