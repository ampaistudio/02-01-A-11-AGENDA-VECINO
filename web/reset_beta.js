
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from the parent folder's web/.env.local (since we'll run from web/)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function resetBetaUser() {
  console.log('Resetting beta user password...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  
  // First find the user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const betaUser = users.find(u => u.email === 'beta.usabilidad@nodoai.local');
  
  if (betaUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(betaUser.id, {
      password: 'Password123!'
    });
    if (updateError) {
      console.error('Error updating password:', updateError);
    } else {
      console.log('Beta user password reset to Password123!');
    }
  } else {
    console.log('Beta user not found. Creating it...');
    const { error: createError } = await supabase.auth.admin.createUser({
      email: 'beta.usabilidad@nodoai.local',
      password: 'Password123!',
      email_confirm: true
    });
    if (createError) {
      console.error('Error creating beta user:', createError);
    } else {
      console.log('Beta user created with Password123!');
    }
  }
}

resetBetaUser();
