const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (request, response) => {
    // URL'den slug'ı al (örn: /api/get-config?slug=omeravniyel)
    const { slug, moderation } = request.query;

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

    // --- RAW MODE (For Admin Panel) ---
    // If raw=true, return ONLY the local config without merging system data.
    const { raw } = request.query;
    if (raw === 'true') {
        return response.status(200).json(config);
    }

    // --- GLOBAL MERGE LOGIC ---
    // Eğer bu bir 'System' kaydı değilse global veriyi merge et
    if (!slug.startsWith('system-')) {
        try {
            // Helper to process central items (exclusion logic + REGION FILTER)
            // Helper to process central items (exclusion logic + REGION FILTER + DATE FILTER)
            function processCentralItems(items, currentSlug, institutionConfig = {}, skipModeration = false) {
                if (!items || !Array.isArray(items)) return [];
                const now = new Date();

                return items
                    .filter(item => {
                        // Normalize item
                        let data = item;
                        if (typeof item === 'string') {
                            data = { url: item };
                        }

                        if (!data.url) return false;

                        // 1. EXCLUSION CHECK
                        if (data.exclude && Array.isArray(data.exclude)) {
                            if (data.exclude.includes(currentSlug)) return false;
                        }

                        // 2. SLUG FILTER (Target Specific Institutions)
                        if (data.slug_filter && Array.isArray(data.slug_filter) && data.slug_filter.length > 0) {
                            if (!data.slug_filter.includes(currentSlug)) return false;
                        }

                        // 3. MODERATION CHECK (Institutional Approval)
                        if (!skipModeration && institutionConfig.moderated_items && Array.isArray(institutionConfig.moderated_items)) {
                            const moderation = institutionConfig.moderated_items.find(m => m.url === data.url);
                            if (moderation && moderation.status === 'rejected') return false;
                        }

                        // 4. REGION FILTER CHECK (Loose Match)
                        if (data.region_filter && data.region_filter.trim().length > 0) {
                            const filter = data.region_filter.trim().toLocaleLowerCase('tr-TR');
                            const myRegion = (institutionConfig.region || "").trim().toLocaleLowerCase('tr-TR');
                            const myDistrict = (institutionConfig.district || "").trim().toLocaleLowerCase('tr-TR');
                            const myCity = (institutionConfig.city || "").trim().toLocaleLowerCase('tr-TR');

                            // Check against full region string, city, or district
                            const match = myRegion.includes(filter) || myCity.includes(filter) || myDistrict.includes(filter);
                            if (!match) return false;
                        }

                        // 4. DATE FILTER CHECK
                        if (data.start_date) {
                            const start = new Date(data.start_date);
                            if (now < start) return false;
                        }
                        if (data.end_date) {
                            const end = new Date(data.end_date);
                            if (now > end) return false;
                        }

                        return true;
                    })
                    .map(item => (typeof item === 'string') ? item : item.url); // Return simple URL array to frontend
            };

            // 0. EMERGENCY MODE CHECK
            try {
                const { data: emData } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', 'system-emergency')
                    .single();

                if (emData && emData.config && emData.config.active) {
                    const em = emData.config;
                    let showEmergency = true;

                    // Filter by Region
                    if (em.region_filter && em.region_filter.trim().length > 0) {
                        const myRegion = (config.region || "").trim().toLowerCase();
                        if (myRegion !== em.region_filter.trim().toLowerCase()) showEmergency = false;
                    }

                    // Filter by Type
                    if (em.type_filter && Array.isArray(em.type_filter) && em.type_filter.length > 0) {
                        const myType = (config.institution_type || "Ortaokul").trim();
                        if (!em.type_filter.includes(myType)) showEmergency = false;
                    }

                    // Date Check
                    const now = new Date();
                    if (em.start_date && now < new Date(em.start_date)) showEmergency = false;
                    if (em.end_date && now > new Date(em.end_date)) showEmergency = false;

                    if (showEmergency) {
                        config.emergency_alert = {
                            title: em.title || "ACİL DURUM",
                            message: em.message || "Lütfen bekleyiniz...",
                            style: em.style || "red" // red, yellow, blue
                        };
                    }
                }
            } catch (e) { console.error("Emergency check error:", e); }

            // 1. GLOBAL HADITHS
            const { data: globalData } = await supabase
                .from('institutions')
                .select('config')
                .eq('slug', 'system-hadiths')
                .single();

            if (globalData && globalData.config) {
                const rawType = config.institution_type || 'Ortaokul';
                // Case-insensitive lookup
                const matchKey = Object.keys(globalData.config).find(k => k.toLowerCase() === rawType.toLowerCase()) || 'Ortaokul';
                const hadithData = globalData.config[matchKey];

                if (hadithData && hadithData.weeks && hadithData.weeks.length > 0) {
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
                const rawType = config.institution_type || 'Ortaokul';
                const matchKey = Object.keys(globalGallery.config).find(k => k.toLowerCase() === rawType.toLowerCase()) || 'Ortaokul';
                const typeConfig = globalGallery.config[matchKey];

                if (typeConfig) {
                    // CENTRAL IMAGES
                    if (typeConfig.images && Array.isArray(typeConfig.images) && typeConfig.images.length > 0) {
                        const centralImages = processCentralItems(typeConfig.images, slug, config, moderation === 'true');
                        config.central_gallery_links = centralImages.map(u => u.trim ? u.trim() : u);
                    } else {
                        config.central_gallery_links = [];
                    }

                    // CENTRAL VIDEOS
                    if (typeConfig.videos && Array.isArray(typeConfig.videos) && typeConfig.videos.length > 0) {
                        const centralVideos = processCentralItems(typeConfig.videos, slug, config, moderation === 'true');
                        config.central_video_urls = centralVideos.map(v => v.trim ? v.trim() : v);
                    } else {
                        config.central_video_urls = [];
                    }

                    // CENTRAL LEFT GALLERY
                    if (typeConfig.left_images && Array.isArray(typeConfig.left_images) && typeConfig.left_images.length > 0) {
                        const centralLeft = processCentralItems(typeConfig.left_images, slug, config, moderation === 'true');
                        config.central_left_gallery_links = centralLeft.map(u => u.trim ? u.trim() : u);
                    } else {
                        config.central_left_gallery_links = [];
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
