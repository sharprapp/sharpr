require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'agostinovitiello02@gmail.com');
  if (!user) return console.log('User not found');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  console.log('Current profile:', JSON.stringify(profile, null, 2));

  // The auth middleware reads profile.tier, so ensure tier = 'pro'
  if (profile?.tier !== 'pro') {
    console.log('tier is not pro, updating...');
    const { error } = await supabase.from('profiles').update({ tier: 'pro' }).eq('id', user.id);
    if (error) console.log('Error:', error);
    else console.log('Updated tier to pro');
  } else {
    console.log('tier is already pro — badge should show correctly');
  }
}
check();
