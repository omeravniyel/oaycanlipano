const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

// Normalize region for comparison
function normalizeRegion(region) {
    if (!region) return '';
    return region.toString().trim().toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'i')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'c');
}

module.exports = async (req, res) => {
    try {
        const { slug } = req.query;

        if (!supabase) {
            console.error('Supabase not configured for left gallery');
            return res.json({ images: [] });
        }

        if (!slug) {
            console.log('No slug provided');
            return res.json({ images: [] });
        }

        // 1. Get institution's region and type
        const { data: institution, error: instError } = await supabase
            .from('institutions')
            .select('config, region')
            .eq('slug', slug)
            .single();

        if (instError || !institution) {
            console.error('Institution not found:', slug, instError);
            return res.json({ images: [] });
        }

        const cfg = institution.config || {};
        const instRegion = (cfg.region || institution.region || '').trim();
        const instType = (cfg.institution_type || 'Ortaokul').trim();
        const normalizedInstRegion = normalizeRegion(instRegion);

        console.log('=== LEFT GALLERY DEBUG ===');
        console.log('Institution Slug:', slug);
        console.log('Institution Region (raw):', instRegion);
        console.log('Institution Region (normalized):', normalizedInstRegion);
        console.log('Institution Type:', instType);

        // 2. Get central gallery config
        const { data: galleryData, error: galleryError } = await supabase
            .from('institutions')
            .select('config')
            .eq('slug', 'system-global-gallery')
            .single();

        if (galleryError || !galleryData || !galleryData.config) {
            console.error('Gallery not found:', galleryError);
            return res.json({ images: [] });
        }

        const centralGallery = galleryData.config;
        console.log('Central Gallery Types:', Object.keys(centralGallery));

        // 3. Get left_gallery_links for the institution type
        const typeGallery = centralGallery[instType];
        console.log('Type Gallery Exists:', !!typeGallery);

        if (!typeGallery || !Array.isArray(typeGallery.left_gallery_links)) {
            console.log('No left_gallery_links for type:', instType);
            return res.json({ images: [] });
        }

        console.log('Total left gallery images:', typeGallery.left_gallery_links.length);
        console.log('Raw left_gallery_links:', JSON.stringify(typeGallery.left_gallery_links));

        // 4. Filter images by region
        const filteredImages = typeGallery.left_gallery_links.filter(img => {
            const imgRegionFilter = (img.region_filter || '').trim();
            const normalizedImgRegion = normalizeRegion(imgRegionFilter);

            console.log(`Checking image: region_filter="${imgRegionFilter}" (normalized: "${normalizedImgRegion}") vs institution="${instRegion}" (normalized: "${normalizedInstRegion}")`);

            // If no region filter, show to all
            if (!imgRegionFilter) {
                console.log('  -> MATCH (no region filter)');
                return true;
            }

            // Match region (normalized comparison)
            const matches = normalizedImgRegion === normalizedInstRegion;
            console.log(`  -> ${matches ? 'MATCH' : 'NO MATCH'}`);
            return matches;
        });

        console.log('Filtered images count:', filteredImages.length);

        // 5. Return image URLs
        const imageUrls = filteredImages.map(img => img.url);
        console.log('Returning URLs:', imageUrls);

        res.json({ images: imageUrls });
    } catch (error) {
        console.error('Sol galeri yükleme hatası:', error);
        res.json({ images: [], error: error.message });
    }
};
