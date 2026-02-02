import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Güvenlik için basit bir Master Password (Gerçek projede Environment Variable olmalı)
// Şimdilik kodda sabitliyorum, değiştirebilirsiniz.
const MASTER_PASSWORD = "kartaltepe-master";

export default async function handler(request, response) {
    // Sadece POST destekle (Güvenlik için basit tutalım)
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
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
    const PUBLIC_ACTIONS = ['get_landing_config', 'submit_application'];

    if (!PUBLIC_ACTIONS.includes(action) && master_password !== MASTER_PASSWORD) {
        return response.status(401).json({ error: 'Yetkisiz Erişim! Ana şifre yanlış.' });
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
            let { slug, name, password, type, institution_logo, logo_locked, institution_subtitle, institution_slogan1, institution_slogan2, cover, city, district, weekly_hadiths, admin_contact, module_dorm_active, module_bottom_right_type } = payload || {};

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

        // --- HADİS DAĞITIMI (BULK UPDATE) ---
        if (action === 'distribute_hadiths') {
            const { type, hadiths } = payload;

            // 1. İlgili tipteki kurumları çek
            const { data: targets, error: fetchError } = await supabase
                .from('institutions')
                .select('*');

            if (fetchError) throw fetchError;

            const updates = [];
            for (const inst of targets) {
                const cfg = inst.config || {};

                // Tip Kontrolü (Case-Insensitive ve Trim)
                const currentType = (cfg.institution_type || "").trim().toLowerCase();
                const targetType = (type || "").trim().toLowerCase();

                // Sadece GİZLİ OLMAYANLARA dağıt (Opsiyonel? Yoksa gizlilere de dağılsın mı? 
                // Karne sistemi kullanıyorsa dağıtılması iyi olabilir. 
                // Ama Pano için gizledik. Pano'da görünmeyecekse hadis de önemsiz.
                // Yine de veri bütünlüğü için dokunmayalım, dağılsın.)

                if (currentType === targetType) {
                    cfg.weekly_hadiths = hadiths;

                    // Update promise
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

            return response.status(200).json({ success: true, count: updates.length });
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

        return response.status(400).json({ error: 'Geçersiz işlem' });

    } catch (err) {
        console.error('Admin API Hatası:', err);
        return response.status(500).json({ error: err.message });
    }
}
