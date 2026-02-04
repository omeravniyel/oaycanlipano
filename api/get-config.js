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
            // Helper to process central items (exclusion logic + REGION FILTER)
            function processCentralItems(items, currentSlug, institutionConfig = {}) {
                if (!items || !Array.isArray(items)) return [];

                return items
                    .filter(item => {
                        if (typeof item !== 'object') return true; // String items are always shown (legacy)
                        if (!item.url) return false;

                        // 1. EXCLUSION CHECK
                        if (item.exclude && Array.isArray(item.exclude)) {
                            if (item.exclude.includes(currentSlug)) return false;
                        }

                        // 2. REGION FILTER CHECK (NEW)
                        // If item has a region_filter, it must match the institution's region.
                        // If institution has NO region, it cannot see filtered items (Safe Default).
                        if (item.region_filter && item.region_filter.trim().length > 0) {
                            const requiredRegion = item.region_filter.trim().toLowerCase();
                            const myRegion = (institutionConfig.region || "").trim().toLowerCase();

                            if (myRegion !== requiredRegion) return false;
                        }

                        return true;
                    })
            };

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
                    // MERGE IMAGES (Central FIRST)
                    if (typeConfig.images && Array.isArray(typeConfig.images) && typeConfig.images.length > 0) {
                        let localGallery = [];
                        try {
                            if (Array.isArray(config.gallery_links)) localGallery = config.gallery_links;
                            else if (typeof config.gallery_links === 'string') localGallery = JSON.parse(config.gallery_links);
                        } catch (e) { }

                        const centralImages = processCentralItems(typeConfig.images, slug, config);

                        // Deduplicate: Local overrides central if exact duplicate? checking URL uniqueness
                        const combined = [...centralImages, ...localGallery].map(url => typeof url === 'string' ? url.trim() : url);
                        config.gallery_links = [...new Set(combined)];
                    }

                    // MERGE VIDEOS (Central FIRST)
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
                        const centralVideos = processCentralItems(typeConfig.videos, slug, config);

                        const combinedVideos = [...centralVideos, ...localVideos].map(v => typeof v === 'string' ? v.trim() : v);
                        config.video_urls = [...new Set(combinedVideos)];
                    }

                    // MERGE LEFT GALLERY (Central FIRST)
                    if (typeConfig.left_images && Array.isArray(typeConfig.left_images) && typeConfig.left_images.length > 0) {
                        let localLeft = [];
                        try {
                            if (Array.isArray(config.left_gallery_links)) localLeft = config.left_gallery_links;
                            else if (typeof config.left_gallery_links === 'string') localLeft = JSON.parse(config.left_gallery_links);
                        } catch (e) { }

                        const centralLeft = processCentralItems(typeConfig.left_images, slug, config);

                        const combinedLeft = [...centralLeft, ...localLeft].map(url => typeof url === 'string' ? url.trim() : url);
                        config.left_gallery_links = [...new Set(combinedLeft)];
                    }
                }
            }

            // 3. CENTRAL ANNOUNCEMENTS (Central FIRST)
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

                    // Central items don't have exclusion logic currently (simple strings), but logic is safe
                    // If we want exclude for announcements later, we need to adapt schema there too.
                    // For now, assuming string array.
                    const cleanAnnouncements = announcements.map(a => typeof a === 'string' ? a.trim() : a); // If obj logic needed, replicate processCentralItems

                    const combined = [...cleanAnnouncements, ...localAnnouncements];
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
