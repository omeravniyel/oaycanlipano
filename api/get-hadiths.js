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

    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { type } = request.query; // 'ortaokul' or 'lise'

    if (!type) {
        return response.status(400).json({ error: 'Type parameter is required (ortaokul/lise)' });
    }

    // Fetch from 'school_configs' table where config_key is 'hadiths'
    const { data, error } = await supabase
        .from('school_configs')
        .select('config_value')
        .eq('config_key', 'hadiths')
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        return response.status(500).json({ error: error.message });
    }

    let allHadiths = data?.config_value || {};

    // Return specific type if exists, else return empty structure
    let typeData = allHadiths[type] || [];
    let startDate = allHadiths[type + '_date'] || null;

    return response.status(200).json({
        success: true,
        data: {
            weeks: typeData,
            startDate: startDate
        }
    });
}
