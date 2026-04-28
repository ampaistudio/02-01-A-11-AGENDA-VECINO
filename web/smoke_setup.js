
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  // 1. Upgrade beta user to admin role
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const beta = users.find(u => u.email === 'beta.usabilidad@nodoai.local');
  if (beta) {
    await supabase.auth.admin.updateUserById(beta.id, {
      user_metadata: { role: 'admin', email_verified: true }
    });
    console.log('✅ beta user upgraded to admin');
  }

  // 2. Create a test citizen_request with status 'approved'
  const { data: req, error: reqErr } = await supabase
    .from('citizen_request')
    .insert({
      citizen_name: 'Vecino Test 1-CORE',
      citizen_phone: '+54 9 2901 000000',
      topic: 'Prueba Smoke Test Agenda',
      reason: 'Validación técnica del sistema de turnos bajo protocolo 1-CORE.',
      locality: 'Ushuaia',
      neighborhood: 'Centro',
      status: 'approved',
      created_by_agent_id: 'supabase-auth:' + beta?.id
    })
    .select('id')
    .single();

  if (reqErr) {
    console.error('❌ Error creating request:', reqErr.message);
    return;
  }

  console.log('✅ citizen_request created with id:', req.id);
  console.log('→ Use this requestId in the schedule POST call');
}

main();
