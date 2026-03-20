require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function makePro() {
  // Find the user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) { console.error('listUsers error:', userError); return; }

  const user = users.users.find(u => u.email === 'agostinovitiello02@gmail.com');
  if (!user) { console.log('User not found'); return; }

  console.log('Found user:', user.id, user.email);

  // Update their profile tier to pro
  const { data, error } = await supabase
    .from('profiles')
    .update({ tier: 'pro' })
    .eq('id', user.id)
    .select();

  if (error) console.error('Update error:', error);
  else console.log('Successfully upgraded to Pro!', data);
}

makePro();
