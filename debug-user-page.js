// Simple debug script to test user page loading
const url = 'http://localhost:5174/dashboard/admin/users';

console.log('Testing user management page...');
console.log('URL:', url);

fetch(url)
  .then(response => {
    console.log('Response status:', response.status);
    if (response.ok) {
      console.log('✅ Page loads successfully');
      console.log('Check browser console logs by visiting:', url);
    } else {
      console.log('❌ Page failed to load');
    }
  })
  .catch(error => {
    console.error('❌ Fetch error:', error);
  });