
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), 'web/.env.local') });

async function createTestUser() {
  console.log('Creating test user...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'test@nodoai.local',
    password: 'Password123!',
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('User already exists, ready to go.');
    } else {
      console.error('Error creating user:', error);
    }
  } else {
    console.log('User created successfully:', data.user?.id);
  }
}

createTestUser();
