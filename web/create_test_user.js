
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  const email = 'test.vecino@nodoai.local';
  const password = '123456';

  // Create or update the test user with role 'usuario'
  const { data: { users } } = await supabase.auth.admin.listUsers();
  let user = users.find(u => u.email === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'usuario' }
    });
    if (error) console.error('Error creating user:', error.message);
    else console.log('✅ User test.vecino created successfully');
  } else {
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { role: 'usuario' }
    });
    console.log('✅ User test.vecino updated to role: usuario');
  }
}

main();
