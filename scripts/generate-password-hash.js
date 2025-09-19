#!/usr/bin/env node

import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'AdminPass123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
	if (err) {
		console.error('Error generating hash:', err);
		process.exit(1);
	}
	console.log(`Password: ${password}`);
	console.log(`Hash: ${hash}`);
	console.log('\nSQL Update Command:');
	console.log(
		`UPDATE hr_public.users SET password_hash = '${hash}' WHERE email = 'admin@postgraphile-hr.com';`
	);
});
