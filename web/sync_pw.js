
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function syncPassword() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const betaUser = users.find(u => u.email === 'beta.usabilidad@nodoai.local');
  if (betaUser) {
    await supabase.auth.admin.updateUserById(betaUser.id, { password: '123456' });
    console.log('Password synced to 123456');
  }
}
syncPassword();
