import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    // URL'den slug'ı al (örn: /api/get-config?slug=omeravniyel)
    const { slug } = request.query;

    if (!slug) {
        return response.status(400).json({ error: 'Slug parametresi gereklidir' });
    }

    const { data, error } = await supabase
        .from('institutions')
        .select('config')
        .eq('slug', slug)
        .limit(1);

    const record = (data && data.length > 0) ? data[0] : null;

    if (error || !record) {
        return response.status(404).json({ error: 'Kurum bulunamadı', receivedSlug: slug, dbError: error });
    }

    // Config JSON kolonunu direkt döndür
    return response.status(200).json(record.config || {});
}
