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
    let config = record.config || {};

    // --- GLOBAL MERGE LOGIC ---
    // Eğer bu bir 'System' kaydı değilse ve 'institution_type' varsa global veriyi merge et
    if (slug !== 'system_globals' && config.institution_type) {
        try {
            const { data: globalData } = await supabase
                .from('institutions')
                .select('config')
                .eq('slug', 'system_globals')
                .single();

            if (globalData && globalData.config && globalData.config.weekly_hadiths) {
                const globalHadiths = globalData.config.weekly_hadiths;
                const type = config.institution_type; // 'Ortaokul', 'Lise', etc.

                // Eğer bu tip için tanımlı bir hadis varsa, local config'in üzerine yaz
                if (globalHadiths[type] && globalHadiths[type].content) {
                    // Mevcut hadith yapısını ez (veya oluştur)
                    config.hadith = {
                        text: globalHadiths[type].content
                    };
                }
            }
        } catch (mergeError) {
            console.error("Global merge error:", mergeError);
            // Hata olsa bile normal config dönsün, akışı bozma
        }
    }

    return response.status(200).json(config);
}
