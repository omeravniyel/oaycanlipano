-- Check system-global-gallery data
SELECT 
    slug,
    config->'Ortaokul'->'left_gallery_links' as ortaokul_left_gallery
FROM institutions 
WHERE slug = 'system-global-gallery';

-- Check ahmediye institution data
SELECT 
    slug,
    region,
    config->>'region' as config_region,
    config->>'institution_type' as institution_type
FROM institutions 
WHERE slug = 'ahmediye';

-- Check all institutions with their regions
SELECT 
    slug,
    region,
    config->>'region' as config_region,
    config->>'institution_type' as institution_type
FROM institutions 
WHERE slug NOT IN ('system-config', 'system-global-gallery')
ORDER BY slug;
