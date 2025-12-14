import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    // URL'den slug'ı al (örn: /api/get-config?slug=omeravniyel)
    const { slug } = request.query;

    const targetSlug = slug || 'omeravniyel'; // Varsayılan

    const { data, error } = await supabase
        .from('institutions')
        .select('config')
        .eq('slug', targetSlug)
        .single();

    if (error) {
        console.error('API Error:', error);
        // Eğer tablo henüz yoksa veya veri bulamazsa boş dönmemek için eski yöntemi deneyebiliriz
        // Ama şimdilik hata dönelim, migration önemli.
        return response.status(500).json({ error: error.message });
    }

    if (!data) {
        return response.status(404).json({ error: 'Kurum bulunamadı' });
    }

    // Config JSON kolonunu direkt döndür
    return response.status(200).json(data.config || {});
}
