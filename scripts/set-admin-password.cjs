#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function setAdminPassword() {
	const client = new Client({
		host: 'localhost',
		port: 5432,
		database: 'hr_system',
		user: 'postgres',
		password: 'postgres123'
	});

	try {
		await client.connect();

		// Generate password hash for "Admin123!"
		const password = 'Admin123!';
		const saltRounds = 10;
		const passwordHash = await bcrypt.hash(password, saltRounds);

		// Update admin user's password
		const query = `
      UPDATE hr_public.users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE email = 'admin@postgraphile-hr.com'
      RETURNING id, email, display_name;
    `;

		const result = await client.query(query, [passwordHash]);

		if (result.rows.length > 0) {
			console.log('✅ Admin password updated successfully!');
			console.log('');
			console.log('📧 Email: admin@postgraphile-hr.com');
			console.log('🔑 Password: Admin123!');
			console.log('');
			console.log('User details:', result.rows[0]);
		} else {
			console.log('❌ Admin user not found');
		}
	} catch (error) {
		console.error('Error setting admin password:', error);
	} finally {
		await client.end();
	}
}

setAdminPassword();
