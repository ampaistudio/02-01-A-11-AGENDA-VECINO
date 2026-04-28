
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

  const { data: { users } } = await supabase.auth.admin.listUsers();
  let user = users.find(u => u.email === email);

  if (user) {
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { role: 'lider' }
    });
    console.log('✅ User test.vecino UPGRADED to role: lider');
  } else {
    console.error('❌ User not found');
  }
}

main();
