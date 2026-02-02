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
    if (!slug.startsWith('system-') && config.institution_type) {
        try {
            // 1. GLOBAL HADITHS
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

            // 2. GLOBAL GALLERY & VIDEOS
            const { data: globalGallery } = await supabase
                .from('institutions')
                .select('config')
                .eq('slug', 'system-global-gallery')
                .single();

            if (globalGallery && globalGallery.config) {
                const type = config.institution_type;
                const typeConfig = globalGallery.config[type];

                if (typeConfig) {
                    // MERGE IMAGES
                    if (typeConfig.images && Array.isArray(typeConfig.images) && typeConfig.images.length > 0) {
                        let localGallery = [];
                        try {
                            if (Array.isArray(config.gallery_links)) localGallery = config.gallery_links;
                            else if (typeof config.gallery_links === 'string') localGallery = JSON.parse(config.gallery_links);
                        } catch (e) { }

                        // Robust Deduplication using Set
                        // We trim URLs to avoid whitespace issues matching
                        const combined = [...localGallery, ...typeConfig.images].map(url => typeof url === 'string' ? url.trim() : url);
                        config.gallery_links = [...new Set(combined)];
                    }

                    // MERGE VIDEOS
                    if (typeConfig.videos && Array.isArray(typeConfig.videos) && typeConfig.videos.length > 0) {
                        let localVideos = [];
                        try {
                            if (config.video_urls && Array.isArray(config.video_urls)) localVideos = config.video_urls;
                            else if (config.video_url) {
                                const v = config.video_url;
                                if (v.startsWith('[')) localVideos = JSON.parse(v);
                                else localVideos = [v];
                            }
                        } catch (e) { }

                        // Filter out empty and small strings
                        localVideos = localVideos.filter(v => v && v.length > 5);

                        // Robust Deduplication using Set
                        const combinedVideos = [...localVideos, ...typeConfig.videos].map(v => typeof v === 'string' ? v.trim() : v);
                        config.video_urls = [...new Set(combinedVideos)];
                    }
                }
            }

        } catch (mergeError) {
            console.error("Global merge error:", mergeError);
            // Hata olsa bile normal config dönsün, akışı bozma
        }
    }

    return response.status(200).json(config);
}
