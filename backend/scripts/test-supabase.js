require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function test() {
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ set' : '❌ missing');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ set' : '❌ missing');

  const { data, error } = await supabase.from('profiles').select('id, tier, email').limit(3);
  if (error) console.log('❌ Supabase error:', error.message);
  else console.log('✅ Supabase connected. Sample profiles:', data);
}
test();
