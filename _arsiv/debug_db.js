const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yjwaamgydtdqlkhmwkyt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqd2FhbWd5ZHRkcWxraG13a3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTkwMzUsImV4cCI6MjA4MTEzNTAzNX0.7Lf3wq6AglPzin7WUDCt-10jyWbeOace-l_InA-ypQM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Checking omeravniyel...");
    const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('slug', 'omeravniyel')
        .single();

    if (error) {
        console.error("omeravniyel Error:", error);
    } else {
        console.log("omeravniyel FOUND:", data.slug);
        console.log("Config:", JSON.stringify(data.config, null, 2));
    }

    console.log("Checking avniyel...");
    const { data: d2, error: e2 } = await supabase
        .from('institutions')
        .select('*')
        .eq('slug', 'avniyel')
        .single();
    if (d2) console.log("avniyel FOUND:", d2.slug);
}

run();
