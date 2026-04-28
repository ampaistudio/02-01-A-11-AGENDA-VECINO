
import { getSupabaseAdminClient } from './web/lib/supabase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'web/.env.local') });

async function createTestUser() {
  console.log('Creating test user...');
  const supabase = getSupabaseAdminClient();
  
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
