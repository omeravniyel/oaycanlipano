const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(request, response) {
    const { slug, password } = request.body;

    if (!slug || !password) {
        return response.status(400).json({ error: 'Eksik bilgi.' });
    }

    const { data, error } = await supabase
        .from('institutions')
        .select('name')
        .eq('slug', slug)
        .eq('password', password)
        .single();

    if (error || !data) {
        return response.status(401).json({ error: 'Hatalı bilgiler.' });
    }

    return response.status(200).json({ success: true, name: data.name });
}
