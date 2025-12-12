import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { key, value } = request.body;

    if (!key || value === undefined) {
        return response.status(400).json({ error: 'Missing key or value' });
    }

    // Upsert data
    const { data, error } = await supabase
        .from('config')
        .upsert({ key, value }, { onConflict: 'key' })
        .select();

    if (error) {
        return response.status(500).json({ error: error.message });
    }

    return response.status(200).json(data);
}
