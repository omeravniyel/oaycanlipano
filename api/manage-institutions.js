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

    const { action, master_password, payload } = request.body;

    // 1. Master Password Kontrolü
    if (master_password !== MASTER_PASSWORD) {
        return response.status(401).json({ error: 'Yetkisiz Erişim! Ana şifre yanlış.' });
    }

    try {
        // --- LİSTELEME ---
        if (action === 'list') {
            const { data, error } = await supabase
                .from('institutions')
                .select('slug, name, password, config')
                .order('name');

            if (error) throw error;
            return response.status(200).json({ institutions: data });
        }

        // --- EKLEME / GÜNCELLEME ---
        if (action === 'upsert') {
            let { slug, name, password, type, institution_logo, logo_locked, institution_subtitle, institution_slogan1, institution_slogan2, cover, city, district, weekly_hadiths, admin_contact, module_dorm_active, module_bottom_right_type } = payload;
            slug = slug.trim(); // Boşlukları temizle

            // Legacy support (eski payload uyumluluğu - frontend düzeltildi ama yine de kalsın)
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

                // Gelen değerleri güncelle
                updatedConfig.institution_title = name;
                if (type) updatedConfig.institution_type = type;
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
                    institution_name: name,
                    institution_title: name,
                    institution_type: type || 'Ortaokul',
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

        // --- SİLME ---
        if (action === 'delete') {
            const { slug } = payload;
            const { error } = await supabase
                .from('institutions')
                .delete()
                .eq('slug', slug);

            if (error) throw error;
            return response.status(200).json({ success: true });
        }

        // --- HADİS DAĞITIMI (BULK UPDATE) ---
        if (action === 'distribute_hadiths') {
            const { type, hadiths } = payload;

            // 1. İlgili tipteki kurumları çek
            const { data: targets, error: fetchError } = await supabase
                .from('institutions')
                .select('*') // Json filtreleme supabase-js ile zor olabilir, client tarafında filtrelicem ya da raw query.
                // Supabase postgrest filter for json is tricky. Let's fetch all and filter in JS for safety or use column filtering if type was a column.
                // Wait, institution_type is inside config JSON.
                // .filter('config->>institution_type', 'eq', type) // Bu sözdizimi değişebilir.
                // Basitlik için hepsini çekip JS'de filtreleyelim (Kurum sayısı az olduğu için performans sorunu olmaz).
                .select('*');

            if (fetchError) throw fetchError;

            const updates = [];
            for (const inst of targets) {
                const cfg = inst.config || {};
                // Tip Kontrolü (Typosuz eşleşme)
                if (cfg.institution_type === type) {
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

        return response.status(400).json({ error: 'Geçersiz işlem' });

    } catch (err) {
        console.error('Admin API Hatası:', err);
        return response.status(500).json({ error: err.message });
    }
}
