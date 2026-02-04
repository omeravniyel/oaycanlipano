const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (request, response) => {
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
                .eq('slug', 'system-hadiths')
                .single();

            if (globalData && globalData.config) {
                const type = config.institution_type || 'Ortaokul'; // Default to Ortaokul if missing
                const hadithData = globalData.config[type];

                if (hadithData && hadithData.weeks && hadithData.weeks.length > 0) {
                    // Pass the FULL structure so frontend can calculate date ranges and week index correctly
                    config.weekly_hadiths = hadithData;
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

                        // Robust Deduplication
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

                        localVideos = localVideos.filter(v => v && v.length > 5);
                        const combinedVideos = [...localVideos, ...typeConfig.videos].map(v => typeof v === 'string' ? v.trim() : v);
                        config.video_urls = [...new Set(combinedVideos)];
                    }

                    // MERGE LEFT GALLERY (NEW)
                    if (typeConfig.left_images && Array.isArray(typeConfig.left_images) && typeConfig.left_images.length > 0) {
                        let localLeft = [];
                        try {
                            if (Array.isArray(config.left_gallery_links)) localLeft = config.left_gallery_links;
                            else if (typeof config.left_gallery_links === 'string') localLeft = JSON.parse(config.left_gallery_links);
                        } catch (e) { }

                        const combinedLeft = [...localLeft, ...typeConfig.left_images].map(url => typeof url === 'string' ? url.trim() : url);
                        config.left_gallery_links = [...new Set(combinedLeft)];
                    }
                }
            }

            // 3. CENTRAL ANNOUNCEMENTS (NEW)
            const { data: centralAnnouncements } = await supabase
                .from('institutions')
                .select('config')
                .eq('slug', 'system-announcements')
                .single();

            if (centralAnnouncements && centralAnnouncements.config) {
                const type = config.institution_type;
                const announcements = centralAnnouncements.config[type];

                if (announcements && Array.isArray(announcements) && announcements.length > 0) {
                    let localAnnouncements = [];
                    if (config.announcements && Array.isArray(config.announcements)) {
                        localAnnouncements = config.announcements;
                    }

                    // Merge and Deduplicate
                    const combined = [...localAnnouncements, ...announcements].map(a => typeof a === 'string' ? a.trim() : a);
                    config.announcements = [...new Set(combined)];
                }
            }

        } catch (mergeError) {
            console.error("Global merge error:", mergeError);
            // Hata olsa bile normal config dönsün, akışı bozma
        }
    }

    return response.status(200).json(config);
};
