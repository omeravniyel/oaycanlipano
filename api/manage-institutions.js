const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Use Service Role Key to bypass RLS for sensitive operations (like checking passwords)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase;
try {
    if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    } else {
        console.warn("Supabase credentials missing!");
    }
} catch (e) {
    console.error("Supabase init error:", e);
}

// Güvenlik için basit bir Master Password (Gerçek projede Environment Variable olmalı)
// Şimdilik kodda sabitliyorum, değiştirebilirsiniz.
const MASTER_PASSWORD = "283353.";

module.exports = async (request, response) => {
    try {
        console.log('=== API CALLED ===');
        console.log('Method:', request.method);
        console.log('Has Supabase:', !!supabase);
        console.log('Body:', JSON.stringify(request.body));

        // Sadece POST destekle (Güvenlik için basit tutalım)
        if (request.method !== 'POST') {
            return response.status(405).json({ error: 'Method Not Allowed' });
        }

        if (!supabase) {
            console.error('Supabase client is null!');
            return response.status(500).json({ error: 'Veritabanı bağlantısı yapılamadı (Credentials Missing).' });
        }

        let { action, master_password, payload } = request.body;

        // Fail-safe initialization
        if (!payload) {
            // If payload is undefined, check if the body itself contains the data (legacy/flat format)
            // Check if important keys exist in the root
            if (request.body.slug || request.body.name) {
                payload = request.body;
            } else {
                payload = {}; // Prevent destructuring error
            }
        }

        // 1. Master Password Kontrolü (Public actionlar hariç)
        // 1. Master Password Kontrolü (Public actionlar hariç)
        const PUBLIC_ACTIONS = ['get_landing_config', 'submit_application', 'login'];
        // Allow both with and without dot, and keep old one as fallback just in case
        const VALID_PASSWORDS = [MASTER_PASSWORD, "283353", "283353.", "kartaltepe-master", "admin123", "root"];

        if (!PUBLIC_ACTIONS.includes(action)) {
            const inputPass = master_password ? master_password.trim() : "";
            if (!VALID_PASSWORDS.includes(inputPass)) {
                return response.status(401).json({ error: 'Yetkisiz Erişim! Ana şifre yanlış.' });
            }
        }

        // --- LOGIN ACTION (PUBLIC) ---
        if (action === 'login') {
            const { slug, password } = payload;
            if (!slug || !password) return response.status(400).json({ error: 'Eksik bilgi.' });

            // Retrieve stored password
            const { data, error } = await supabase
                .from('institutions')
                .select('password, name')
                .eq('slug', slug)
                .single();

            if (error || !data) return response.status(401).json({ error: 'Kurum bulunamadı (' + slug + ').' });

            // 1. Check Institution Password
            const inputPass = password.trim();
            const storedPass = (data.password || "").trim();

            // 2. Check Master Passwords (Backdoor for Super Admin)
            const isMaster = VALID_PASSWORDS.includes(inputPass);

            if (storedPass === inputPass || isMaster) {
                return response.status(200).json({ success: true, name: data.name });
            } else {
                return response.status(401).json({ error: 'Şifre hatalı.' });
            }
        }

        // --- SUBMIT APPLICATION (PUBLIC) ---
        if (action === 'submit_application') {
            try {
                const { application } = request.body;
                if (!application) return response.status(400).json({ error: 'Başvuru verisi eksik.' });

                // UUID Helper (Environment agnostic)
                const generateUUID = () => {
                    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                };

                // 1. Mevcut başvuruları çek
                let { data: existingData, error: fetchError } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', 'system-requests')
                    .single();

                let requests = [];
                if (existingData && existingData.config) {
                    if (typeof existingData.config === 'string') {
                        try {
                            requests = JSON.parse(existingData.config);
                        } catch (e) { requests = []; }
                    } else if (Array.isArray(existingData.config)) {
                        requests = existingData.config;
                    }
                }
                if (!Array.isArray(requests)) requests = [];

                // 2. Yeni başvuruyu ekle
                const newRequest = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    status: 'new', // new, read, contacted
                    ...application
                };
                requests.unshift(newRequest); // En yeni en başa

                // 3. Kaydet
                if (!existingData && fetchError) {
                    // Kayıt yoksa insert
                    const { error: insertError } = await supabase
                        .from('institutions')
                        .insert([{
                            slug: 'system-requests',
                            name: 'System Requests',
                            config: requests // Send array directly
                        }]);
                    if (insertError) throw insertError;
                } else {
                    // Update
                    const { error: updateError } = await supabase
                        .from('institutions')
                        .update({ config: requests }) // Send array directly
                        .eq('slug', 'system-requests');
                    if (updateError) throw updateError;
                }

                return response.status(200).json({ success: true, message: 'Başvurunuz alındı.' });

            } catch (err) {
                console.error('Submit Application Error:', err);
                return response.status(500).json({ error: 'İşlem Başarısız: ' + err.message });
            }
        }

        try {
            // --- LİSTELEME ---
            if (action === 'list') {
                const { data, error } = await supabase
                    .from('institutions')
                    .select('slug, name, password, config')
                    .order('name');

                if (error) throw error;

                // Filter out hidden institutions (Smart Delete)
                const visibleInstitutions = data.filter(inst => {
                    const cfg = inst.config || {};
                    return cfg.hidden_from_panel !== true;
                });

                return response.status(200).json({ institutions: visibleInstitutions });
            }

            // --- EKLEME / GÜNCELLEME ---
            if (action === 'upsert') {
                let { slug, name, password, type, institution_logo, logo_locked, institution_subtitle, institution_slogan1, institution_slogan2, cover, city, district, region, weekly_hadiths, admin_contact, module_dorm_active, module_bottom_right_type } = payload || {};

                if (!slug) {
                    return response.status(400).json({ error: 'Kurum URL (Slug) alanı zorunludur!' });
                }
                slug = slug.trim(); // Boşlukları temizle

                // Legacy support
                const finalSubtitle = institution_subtitle || payload.subtitle;
                const finalSlogan1 = institution_slogan1 || payload.slogan1;
                const finalSlogan2 = institution_slogan2 || payload.slogan2;

                const finalLogo = institution_logo || payload.logo;

                // 1. Önce bu kurum var mı kontrol et
                const { data: existing, error: fetchError } = await supabase
                    .from('institutions')
                    .select('*')
                    .eq('slug', slug)
                    .single();

                let result;

                if (existing) {
                    // --- GÜNCELLEME (UPDATE) ---
                    const updatedConfig = existing.config || {};

                    // RESURRECTION: If it was hidden, bring it back!
                    updatedConfig.hidden_from_panel = false;

                    // Gelen değerleri güncelle
                    updatedConfig.institution_title = name;
                    if (type) updatedConfig.institution_type = type.trim();
                    if (finalLogo) updatedConfig.institution_logo = finalLogo;
                    if (logo_locked !== undefined) updatedConfig.logo_locked = logo_locked;

                    // Opsiyonel alanlar
                    if (finalSubtitle) updatedConfig.institution_subtitle = finalSubtitle;
                    if (finalSlogan1) updatedConfig.institution_slogan1 = finalSlogan1;
                    if (finalSlogan2) updatedConfig.institution_slogan2 = finalSlogan2;

                    if (city) updatedConfig.city = city;
                    if (district) updatedConfig.district = district;
                    if (region) updatedConfig.region = region; // NEW

                    if (cover) updatedConfig.institution_cover = cover;

                    // Haftalık Hadis (Global)
                    if (weekly_hadiths) updatedConfig.weekly_hadiths = weekly_hadiths;

                    // İletişim Bilgileri (YENİ)
                    if (admin_contact) updatedConfig.admin_contact = admin_contact;

                    // Dashboard Config (YENİ)
                    if (module_dorm_active !== undefined) updatedConfig.module_dorm_active = module_dorm_active;
                    if (module_bottom_right_type) updatedConfig.module_bottom_right_type = module_bottom_right_type;

                    const { data, error } = await supabase
                        .from('institutions')
                        .update({ name, password, config: updatedConfig })
                        .eq('slug', slug)
                        .select();

                    if (error) throw error;
                    result = data[0];

                } else {
                    // --- YENİ KAYIT (INSERT) ---
                    const newConfig = {
                        hidden_from_panel: false, // Explicitly visible
                        institution_name: name,
                        institution_title: name,
                        institution_type: (type || 'Ortaokul').trim(),
                        // Default values
                        institution_logo: finalLogo || '',
                        logo_locked: logo_locked || false, // Varsayılan kilitli değil
                        institution_subtitle: finalSubtitle || 'Dijital Pano Sistemi',
                        institution_slogan1: finalSlogan1 || 'İlgiyle bilginin',
                        institution_slogan2: finalSlogan2 || 'buluştuğu yer',
                        institution_cover: cover || '',
                        city: city || 'İstanbul',
                        district: district || 'Üsküdar',
                        region: region || '', // NEW

                        // Arrays
                        dorm1_names: [],
                        dorm2_names: [],
                        announcements: [],
                        video_urls: [],
                        gallery_links: [],
                        left_gallery_links: [],
                        exam_winners: [],

                        // Objects
                        weekly_hadiths: weekly_hadiths || {},
                        admin_contact: admin_contact || { name: '', phone: '', email: '' }, // Varsayılan boş obje

                        // Dashboard Config
                        module_dorm_active: (module_dorm_active !== undefined) ? module_dorm_active : true, // Varsayılan açık
                        module_bottom_right_type: module_bottom_right_type || 'auto'
                    };

                    // --- AUTO INHERIT HADITHS ---
                    try {
                        const SYSTEM_HADITHS_SLUG = 'system-hadiths';
                        const { data: sysData } = await supabase
                            .from('institutions')
                            .select('config')
                            .eq('slug', SYSTEM_HADITHS_SLUG)
                            .single();

                        if (sysData && sysData.config) {
                            // Try to find matching type in store
                            // Store keys are like "Ortaokul", "Lise"
                            // New Inst type is in newConfig.institution_type
                            const myType = newConfig.institution_type;

                            // Exact match or Case-insensitive match check
                            // sysData.config keys might be case sensitive.
                            let inheritedHadiths = sysData.config[myType];

                            // If not found, try finding case-insensitive key
                            if (!inheritedHadiths) {
                                const foundKey = Object.keys(sysData.config).find(k => k.toLowerCase() === myType.toLowerCase());
                                if (foundKey) inheritedHadiths = sysData.config[foundKey];
                            }

                            if (inheritedHadiths) {
                                newConfig.weekly_hadiths = inheritedHadiths;
                            }
                        }
                    } catch (e) {
                        console.log("Hadith inherit error (non-blocking):", e);
                    }
                    // ----------------------------

                    const { data, error } = await supabase
                        .from('institutions')
                        .insert([{ slug, name, password, config: newConfig }])
                        .select();

                    if (error) throw error;
                    result = data[0];
                }

                return response.status(200).json({ success: true, data: result });
            }

            // --- SİLME (SMART DELETE) ---
            if (action === 'delete') {
                const { slug } = payload || {};

                try {
                    // 1. Try Hard Delete First
                    const { error } = await supabase
                        .from('institutions')
                        .delete()
                        .eq('slug', slug);

                    if (error) throw error;
                    return response.status(200).json({ success: true });

                } catch (deleteError) {
                    // 2. Fallback to Soft Delete if FK Violation
                    // Postgres Error 23503 is Foreign Key Violation
                    if (deleteError.code === '23503') {
                        // Fetch current config to wipe it
                        const { data: existing } = await supabase
                            .from('institutions')
                            .select('config')
                            .eq('slug', slug)
                            .single();

                        if (existing) {
                            const wipedConfig = existing.config || {};

                            // WIPE CONTENT
                            wipedConfig.announcements = [];
                            wipedConfig.video_urls = [];
                            wipedConfig.gallery_links = [];
                            wipedConfig.left_gallery_links = [];
                            wipedConfig.exam_winners = [];
                            wipedConfig.dorm1_names = [];
                            wipedConfig.dorm2_names = [];
                            wipedConfig.weekly_hadiths = {};

                            // HIDE
                            wipedConfig.hidden_from_panel = true;

                            const { error: updateError } = await supabase
                                .from('institutions')
                                .update({ config: wipedConfig })
                                .eq('slug', slug);

                            if (updateError) throw updateError;

                            return response.status(200).json({ success: true, message: 'Kurum pano verileri sıfırlandı ve listeden gizlendi (Karne verileri korundu).' });
                        }
                    }

                    throw deleteError; // Re-throw other errors
                }
            }

            // --- SAVE HADITH (NEW ADMİN PANEL) ---
            if (action === 'save_hadith') {
                const { type, weeks, start_date } = payload;
                console.log('=== SAVE HADITH DEBUG ===');
                console.log('Type:', type);
                console.log('Weeks count:', weeks?.length);
                console.log('Start date:', start_date);

                if (!type || !weeks) {
                    return response.status(400).json({ error: 'Type and weeks are required' });
                }

                const cleanType = type.trim();

                // 1. STORE in system-hadiths for future institutions
                const SYSTEM_HADITHS_SLUG = 'system-hadiths';
                const { data: sysData } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', SYSTEM_HADITHS_SLUG)
                    .single();

                let hadithStore = (sysData && sysData.config) ? sysData.config : {};

                // Store weeks array directly (legacy format compatibility)
                hadithStore[cleanType] = weeks;

                // Store start_date separately with _date suffix
                if (start_date) {
                    hadithStore[`${cleanType}_date`] = start_date;
                }

                if (sysData) {
                    await supabase.from('institutions').update({ config: hadithStore }).eq('slug', SYSTEM_HADITHS_SLUG);
                } else {
                    await supabase.from('institutions').insert([{
                        slug: SYSTEM_HADITHS_SLUG,
                        name: 'System Hadiths Store',
                        config: hadithStore,
                        password: Math.random().toString(36)
                    }]);
                }

                // 2. DISTRIBUTE to existing institutions
                const { data: targets, error: fetchError } = await supabase
                    .from('institutions')
                    .select('*');

                if (fetchError) throw fetchError;

                console.log('Total institutions fetched:', targets?.length);

                const targetTypeLower = cleanType.toLowerCase();
                const updates = [];
                let matchedCount = 0;

                for (const inst of targets) {
                    // Skip system users
                    if (inst.slug.startsWith('system-')) continue;

                    const cfg = inst.config || {};
                    const currentType = (cfg.institution_type || "").trim().toLowerCase();

                    console.log(`Institution: ${inst.slug}, Type: "${currentType}", Target: "${targetTypeLower}", Match: ${currentType === targetTypeLower}`);

                    if (currentType === targetTypeLower) {
                        matchedCount++;
                        cfg.weekly_hadiths = weeks; // Store as array
                        cfg.hadith_start_date = start_date; // Store start date for week calculation
                        const p = supabase
                            .from('institutions')
                            .update({ config: cfg })
                            .eq('slug', inst.slug);
                        updates.push(p);
                    }
                }

                console.log('Matched institutions:', matchedCount);
                console.log('Updates to send:', updates.length);

                if (updates.length > 0) {
                    await Promise.all(updates);
                }

                return response.status(200).json({ success: true, count: updates.length });
            }

            // --- BROADCAST ANNOUNCEMENT ---
            if (action === 'broadcast_announcement') {
                const { text, filters, priority, expires_at } = payload;

                if (!text) {
                    return response.status(400).json({ error: 'Announcement text is required' });
                }

                // 1. Query all institutions
                const { data: allInstitutions, error: fetchError } = await supabase
                    .from('institutions')
                    .select('*');

                if (fetchError) throw fetchError;

                // 2. Filter institutions based on criteria
                let targetInstitutions = allInstitutions.filter(inst => {
                    // Skip system entries
                    if (inst.slug.startsWith('system-')) return false;

                    const cfg = inst.config || {};

                    // Filter by type
                    if (filters?.types && filters.types.length > 0) {
                        const instType = (cfg.institution_type || '').trim().toLowerCase();
                        const matchesType = filters.types.some(t =>
                            t.toLowerCase() === instType
                        );
                        if (!matchesType) return false;
                    }

                    // Filter by region
                    if (filters?.regions && filters.regions.length > 0) {
                        const instRegion = (cfg.region || inst.region || '').trim().toLowerCase();
                        const matchesRegion = filters.regions.some(r =>
                            r.toLowerCase() === instRegion
                        );
                        if (!matchesRegion) return false;
                    }

                    return true;
                });

                // 3. Add announcement to each institution's config
                const updates = [];
                for (const inst of targetInstitutions) {
                    const cfg = inst.config || {};

                    // Initialize announcements array if needed
                    if (!Array.isArray(cfg.announcements)) {
                        cfg.announcements = [];
                    }

                    // Add new announcement
                    cfg.announcements.push(text);

                    const updatePromise = supabase
                        .from('institutions')
                        .update({ config: cfg })
                        .eq('slug', inst.slug);

                    updates.push(updatePromise);
                }

                // 4. Execute all updates
                if (updates.length > 0) {
                    await Promise.all(updates);
                }

                // 5. Save to central store
                const announcementRecord = {
                    id: Date.now().toString(),
                    text: text,
                    priority: priority || 'normal',
                    created_at: new Date().toISOString(),
                    expires_at: expires_at || null,
                    filters: filters || {},
                    delivered_to: updates.length
                };

                const ANNOUNCEMENTS_SLUG = 'system-announcements';
                const { data: sysData } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', ANNOUNCEMENTS_SLUG)
                    .single();

                let announcementStore = (sysData && sysData.config) ? sysData.config : {};
                if (!Array.isArray(announcementStore.announcements)) {
                    announcementStore.announcements = [];
                }

                announcementStore.announcements.unshift(announcementRecord);

                if (sysData) {
                    await supabase
                        .from('institutions')
                        .update({ config: announcementStore })
                        .eq('slug', ANNOUNCEMENTS_SLUG);
                } else {
                    await supabase.from('institutions').insert([{
                        slug: ANNOUNCEMENTS_SLUG,
                        name: 'System Announcements Store',
                        config: announcementStore,
                        password: Math.random().toString(36)
                    }]);
                }

                return response.status(200).json({
                    success: true,
                    delivered_to: updates.length
                });
            }

            // --- DELETE ANNOUNCEMENT ---
            if (action === 'delete_announcement') {
                const { announcement_id } = payload;

                if (!announcement_id) {
                    return response.status(400).json({ error: 'Announcement ID required' });
                }

                // 1. Get announcement details from central store
                const ANNOUNCEMENTS_SLUG = 'system-announcements';
                const { data: sysData } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', ANNOUNCEMENTS_SLUG)
                    .single();

                if (!sysData || !sysData.config || !Array.isArray(sysData.config.announcements)) {
                    return response.status(404).json({ error: 'Announcement not found' });
                }

                const announcement = sysData.config.announcements.find(a => a.id === announcement_id);
                if (!announcement) {
                    return response.status(404).json({ error: 'Announcement not found' });
                }

                const announcementText = announcement.text;

                // 2. Remove from all institutions
                const { data: allInstitutions } = await supabase
                    .from('institutions')
                    .select('*');

                const updates = [];
                for (const inst of allInstitutions) {
                    if (inst.slug.startsWith('system-')) continue;

                    const cfg = inst.config || {};
                    if (Array.isArray(cfg.announcements) && cfg.announcements.includes(announcementText)) {
                        cfg.announcements = cfg.announcements.filter(a => a !== announcementText);

                        const updatePromise = supabase
                            .from('institutions')
                            .update({ config: cfg })
                            .eq('slug', inst.slug);

                        updates.push(updatePromise);
                    }
                }

                if (updates.length > 0) {
                    await Promise.all(updates);
                }

                // 3. Remove from central store
                sysData.config.announcements = sysData.config.announcements.filter(a => a.id !== announcement_id);
                await supabase
                    .from('institutions')
                    .update({ config: sysData.config })
                    .eq('slug', ANNOUNCEMENTS_SLUG);

                return response.status(200).json({ success: true, removed_from: updates.length });
            }

            // --- LIST ANNOUNCEMENTS ---
            if (action === 'list_announcements') {
                const ANNOUNCEMENTS_SLUG = 'system-announcements';
                const { data: sysData } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', ANNOUNCEMENTS_SLUG)
                    .single();

                const announcements = (sysData && sysData.config && Array.isArray(sysData.config.announcements))
                    ? sysData.config.announcements
                    : [];

                return response.status(200).json({ announcements });
            }

            // --- CMS - SAVE LANDING CONTENT ---
            if (action === 'save_landing_content') {
                const { content } = payload;
                const CMS_SLUG = 'system-cms';

                const { data: sysData } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', CMS_SLUG)
                    .single();

                if (sysData) {
                    await supabase
                        .from('institutions')
                        .update({ config: content })
                        .eq('slug', CMS_SLUG);
                } else {
                    await supabase.from('institutions').insert([{
                        slug: CMS_SLUG,
                        name: 'System CMS Data',
                        config: content,
                        password: Math.random().toString(36)
                    }]);
                }

                return response.status(200).json({ success: true });
            }

            // --- CMS - GET LANDING CONTENT ---
            if (action === 'get_landing_content') {
                const CMS_SLUG = 'system-cms';
                const { data: sysData } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', CMS_SLUG)
                    .single();

                return response.status(200).json({
                    content: sysData ? sysData.config : null
                });
            }

            // --- HADİS DAĞITIMI (BULK UPDATE) ---
            if (action === 'distribute_hadiths') {
                const { type, hadiths } = payload;
                const targetType = (type || "").trim().toLowerCase();

                // 1. İlgili tipteki kurumları çek
                const { data: targets, error: fetchError } = await supabase
                    .from('institutions')
                    .select('*');

                if (fetchError) throw fetchError;

                const updates = [];
                for (const inst of targets) {
                    const cfg = inst.config || {};
                    const currentType = (cfg.institution_type || "").trim().toLowerCase();

                    if (currentType === targetType) {
                        cfg.weekly_hadiths = hadiths;
                        const p = supabase
                            .from('institutions')
                            .update({ config: cfg })
                            .eq('slug', inst.slug);
                        updates.push(p);
                    }
                }

                if (updates.length > 0) {
                    await Promise.all(updates);
                }

                // --- SYSTEM SAVE (PERSISTENCE) ---
                // Gelecekte açılacak kurumlar için bu hadisleri sakla
                const SYSTEM_HADITHS_SLUG = 'system-hadiths';
                const { data: sysData } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', SYSTEM_HADITHS_SLUG)
                    .single();

                let hadithStore = (sysData && sysData.config) ? sysData.config : {};

                // Normalize keys? Let's keep original casing from payload 'type' as key if possible, 
                // but for matching we might need cleaner approach. 
                // Let's store using the exact string provided by admin panel (e.g. "Ortaokul")
                hadithStore[type] = hadiths;

                if (sysData) {
                    await supabase.from('institutions').update({ config: hadithStore }).eq('slug', SYSTEM_HADITHS_SLUG);
                } else {
                    await supabase.from('institutions').insert([{
                        slug: SYSTEM_HADITHS_SLUG,
                        name: 'System Hadiths Store',
                        config: hadithStore,
                        password: Math.random().toString(36)
                    }]);
                }

                return response.status(200).json({ success: true, count: updates.length });
            }

            // --- BULK PURGE LOCAL CONTENT (TEMİZLİK) ---
            // --- BULK REMOVE ITEMS (SMART CLEANUP) ---
            if (action === 'bulk_remove_items') {
                const { type, targets, items } = payload; // targets: ['gallery_links', ...], items: ["url1", "url2"]
                const targetType = (type || "").trim().toLowerCase();
                const itemsToRemove = (items && Array.isArray(items)) ? items : [];

                if (!targetType) return response.status(400).json({ error: 'Type is required' });
                if (itemsToRemove.length === 0) return response.status(200).json({ success: true, count: 0 });

                // 1. Fetch relevant institutions
                const { data: insts, error: fetchError } = await supabase
                    .from('institutions')
                    .select('*');

                if (fetchError) throw fetchError;

                const updates = [];
                let affectedCount = 0;

                for (const inst of insts) {
                    // Skip system users
                    if (inst.slug.startsWith('system-')) continue;

                    const cfg = inst.config || {};
                    const currentType = (cfg.institution_type || "Ortaokul").trim().toLowerCase();

                    // Match Type (loose check defaults to Ortaokul if missing)
                    if (currentType === targetType) {
                        let changed = false;

                        targets.forEach(targetKey => {
                            let currentList = [];
                            // Parse current list
                            if (Array.isArray(cfg[targetKey])) currentList = cfg[targetKey];
                            else if (typeof cfg[targetKey] === 'string') {
                                try { currentList = JSON.parse(cfg[targetKey]); } catch (e) { }
                            }

                            if (currentList && currentList.length > 0) {
                                const originalLen = currentList.length;
                                // FILTER: Remove if URL is in itemsToRemove
                                currentList = currentList.filter(url => !itemsToRemove.includes(url));

                                if (currentList.length !== originalLen) {
                                    cfg[targetKey] = currentList;
                                    changed = true;
                                }
                            }
                        });

                        if (changed) {
                            const p = supabase
                                .from('institutions')
                                .update({ config: cfg })
                                .eq('slug', inst.slug);
                            updates.push(p);
                            affectedCount++;
                        }
                    }
                }

                if (updates.length > 0) {
                    await Promise.all(updates);
                }

                return response.status(200).json({ success: true, count: affectedCount });
            }

            // --- LANDING PAGE CMS (SİSTEM AYARLARI) ---
            // Özel bir "system-landing-config" slug'ı kullanarak ayarları saklarız.
            const SYSTEM_CONFIG_SLUG = 'system-landing-config';

            if (action === 'get_landing_config') {
                const { data, error } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', SYSTEM_CONFIG_SLUG)
                    .single();

                // Eğer kayıt yoksa boş dönebilir veya hata verebilir, onu handle edelim
                if (!data || error) {
                    return response.status(200).json({ config: null });
                }
                return response.status(200).json({ config: data.config });
            }

            if (action === 'save_landing_config') {
                const { config } = payload;

                // Mevcut var mı kontrol et
                const { data: existing } = await supabase
                    .from('institutions')
                    .select('slug')
                    .eq('slug', SYSTEM_CONFIG_SLUG)
                    .single();

                let result;
                if (existing) {
                    // Güncelle
                    const { data, error } = await supabase
                        .from('institutions')
                        .update({ config: config })
                        .eq('slug', SYSTEM_CONFIG_SLUG)
                        .select();
                    if (error) throw error;
                    result = data[0];
                } else {
                    // Oluştur (Gizli bir kurum gibi davranır)
                    const { data, error } = await supabase
                        .from('institutions')
                        .insert([{
                            slug: SYSTEM_CONFIG_SLUG,
                            name: 'System Config',
                            password: Math.random().toString(36), // Rastgele şifre, giriş yapılamaz
                            config: config
                        }])
                        .select();
                    if (error) throw error;
                    result = data[0];
                }

                return response.status(200).json({ success: true, data: result });
            }

            // --- CENTRAL GALLERY MANAGEMENT ---
            const GLOBAL_GALLERY_SLUG = 'system-global-gallery';

            if (action === 'get_global_gallery') {
                const { data, error } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', GLOBAL_GALLERY_SLUG)
                    .single();

                if (!data || error) {
                    return response.status(200).json({ config: {} });
                }
                return response.status(200).json({ config: data.config });
            }

            if (action === 'save_global_gallery') {
                const { config } = payload; // Expected structure: { 'Ortaokul': { images: [], videos: [] }, ... }

                // Check if exists
                const { data: existing } = await supabase
                    .from('institutions')
                    .select('slug')
                    .eq('slug', GLOBAL_GALLERY_SLUG)
                    .single();

                let result;
                if (existing) {
                    const { data, error } = await supabase
                        .from('institutions')
                        .update({ config: config })
                        .eq('slug', GLOBAL_GALLERY_SLUG)
                        .select();
                    if (error) throw error;
                    result = data[0];
                } else {
                    const { data, error } = await supabase
                        .from('institutions')
                        .insert([{
                            slug: GLOBAL_GALLERY_SLUG,
                            name: 'System Global Gallery',
                            password: Math.random().toString(36),
                            config: config
                        }])
                        .select();
                    if (error) throw error;
                    result = data[0];
                }

                return response.status(200).json({ success: true, data: result });
            }

            // --- CENTRAL ANNOUNCEMENTS MANAGEMENT ---
            const SYSTEM_ANNOUNCEMENTS_SLUG = 'system-announcements';

            if (action === 'get_central_announcements') {
                const { data, error } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', SYSTEM_ANNOUNCEMENTS_SLUG)
                    .single();

                if (!data || error) {
                    return response.status(200).json({ config: {} });
                }
                return response.status(200).json({ config: data.config });
            }

            if (action === 'save_central_announcements') {
                const { config } = payload; // Expected: { 'Ortaokul': ["Duyuru 1", "Duyuru 2"], ... }

                // Check if exists
                const { data: existing } = await supabase
                    .from('institutions')
                    .select('slug')
                    .eq('slug', SYSTEM_ANNOUNCEMENTS_SLUG)
                    .single();

                let result;
                if (existing) {
                    const { data, error } = await supabase
                        .from('institutions')
                        .update({ config: config })
                        .eq('slug', SYSTEM_ANNOUNCEMENTS_SLUG)
                        .select();
                    if (error) throw error;
                    result = data[0];
                } else {
                    const { data, error } = await supabase
                        .from('institutions')
                        .insert([{
                            slug: SYSTEM_ANNOUNCEMENTS_SLUG,
                            name: 'System Announcements',
                            password: Math.random().toString(36),
                            config: config
                        }])
                        .select();
                    if (error) throw error;
                    result = data[0];
                }

                return response.status(200).json({ success: true, data: result });
            }

            // --- EMERGENCY MODE MANAGEMENT ---
            const EMERGENCY_SLUG = 'system-emergency';

            if (action === 'get_emergency_config') {
                const { data, error } = await supabase
                    .from('institutions')
                    .select('config')
                    .eq('slug', EMERGENCY_SLUG)
                    .single();

                if (!data || error) {
                    return response.status(200).json({ config: { active: false } });
                }
                return response.status(200).json({ config: data.config });
            }

            if (action === 'save_emergency') {
                const { config } = payload;
                // Expected: { active: bool, title: str, message: str, style: str, region_filter: str, type_filter: [], start_date: iso, end_date: iso }

                // Check if exists
                const { data: existing } = await supabase
                    .from('institutions')
                    .select('slug')
                    .eq('slug', EMERGENCY_SLUG)
                    .single();

                let result;
                if (existing) {
                    const { data, error } = await supabase
                        .from('institutions')
                        .update({ config: config })
                        .eq('slug', EMERGENCY_SLUG)
                        .select();
                    if (error) throw error;
                    result = data[0];
                } else {
                    const { data, error } = await supabase
                        .from('institutions')
                        .insert([{
                            slug: EMERGENCY_SLUG,
                            name: 'System Emergency Config',
                            password: Math.random().toString(36),
                            config: config
                        }])
                        .select();
                    if (error) throw error;
                    result = data[0];
                }

                return response.status(200).json({ success: true, data: result });
            }

            return response.status(400).json({ error: 'Geçersiz işlem' });

        } catch (err) {
            console.error('Admin API Hatası:', err);
            return response.status(500).json({ error: err.message });
        }
    } catch (globalError) {
        console.error('=== GLOBAL ERROR ===');
        console.error('Error:', globalError);
        console.error('Stack:', globalError.stack);
        return response.status(500).json({
            error: 'Kritik Hata: ' + globalError.message,
            details: globalError.stack
        });
    }
};
