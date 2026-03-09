// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: '.env.local' });
}
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(request, response) {
    // Enable CORS
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { type, weeks, start_date } = request.body;

    if (!type || !weeks) {
        return response.status(400).json({ error: 'Missing parameters (type, weeks)' });
    }

    // 1. Fetch current config to merge
    const { data: currentData, error: fetchError } = await supabase
        .from('school_configs')
        .select('config_value')
        .eq('config_key', 'hadiths')
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        return response.status(500).json({ error: fetchError.message });
    }

    let allHadiths = currentData?.config_value || {};

    // 2. Update specific type
    if (type === 'Tümü') {
        const allTypes = ['Ortaokul', 'Lise', 'Üniversite Hazırlık', 'Daimi', 'Üniversite', 'Tekamül', 'Tümü'];
        allTypes.forEach(t => {
            allHadiths[t] = weeks;
            if (start_date) {
                allHadiths[t + '_date'] = start_date;
            }
        });
    } else {
        allHadiths[type] = weeks;
        if (start_date) {
            allHadiths[type + '_date'] = start_date;
        }
    }

    // 3. Upsert back to DB
    const { data, error } = await supabase
        .from('school_configs')
        .upsert({
            config_key: 'hadiths',
            config_value: allHadiths
        })
        .select();

    if (error) {
        return response.status(500).json({ error: error.message });
    }

    return response.status(200).json({ success: true, data });
}
