// Quick test script to check Supabase data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
    console.log('=== CHECKING GALLERY DATA ===');

    // 1. Check system-global-gallery
    const { data: galleryData, error: galleryError } = await supabase
        .from('institutions')
        .select('config')
        .eq('slug', 'system-global-gallery')
        .single();

    if (galleryError) {
        console.error('Gallery Error:', galleryError);
    } else {
        console.log('Gallery exists:', !!galleryData);
        if (galleryData?.config) {
            console.log('Gallery types:', Object.keys(galleryData.config));
            if (galleryData.config.Ortaokul) {
                console.log('Ortaokul left_gallery_links count:',
                    galleryData.config.Ortaokul.left_gallery_links?.length || 0);
                console.log('First image:',
                    galleryData.config.Ortaokul.left_gallery_links?.[0]);
            }
        }
    }

    // 2. Check ahmediye
    const { data: ahmediyeData, error: ahmediyeError } = await supabase
        .from('institutions')
        .select('slug, config, region')
        .eq('slug', 'ahmediye')
        .single();

    if (ahmediyeError) {
        console.error('Ahmediye Error:', ahmediyeError);
    } else {
        console.log('\n=== AHMEDIYE DATA ===');
        console.log('Region:', ahmediyeData?.region);
        console.log('Config region:', ahmediyeData?.config?.region);
        console.log('Institution type:', ahmediyeData?.config?.institution_type);
    }
}

checkData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
