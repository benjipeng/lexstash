
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verify() {
    // 1. Load Env Vars
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local not found!');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });

    const url = env['NEXT_PUBLIC_SUPABASE_URL'];
    const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

    if (!url || !key) {
        console.error('❌ Missing Supabase keys in .env.local');
        return;
    }

    console.log('Checking connection to:', url);

    // 2. Init Client
    const supabase = createClient(url, key);

    // 3. Test Query
    // We try to select from 'prompts'. 
    // If table doesn't exist -> Error 404 or 42P01
    // If RLS is on and we are anon -> Should return [] (empty) but NO error.
    const { data, error } = await supabase.from('prompts').select('*').limit(1);

    if (error) {
        console.error('❌ Verification Failed:', error.message);
        console.error('Details:', error);
    } else {
        console.log('✅ Connection Successful!');
        console.log('Table "prompts" exists and is accessible.');
        console.log('RLS Check: Returned', data.length, 'rows (Expected 0 for public anon access if empty or private).');
    }
}

verify();
