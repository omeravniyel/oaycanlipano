import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    const { data, error } = await supabase
        .from('config')
        .select('*');

    if (error) {
        return response.status(500).json({ error: error.message });
    }

    // Array'i objeye çevir (Frontend için daha kolay erişim)
    const config = {};
    data.forEach(item => {
        config[item.key] = item.value;
    });

    return response.status(200).json(config);
}
