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
            let { slug, name, password, type, logo, subtitle, slogan1, slogan2, cover, city, district, weekly_hadiths, admin_contact, module_dorm_active, module_bottom_right_type } = payload;
            slug = slug.trim(); // Boşlukları temizle

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
                if (logo) updatedConfig.institution_logo = logo;
                // Opsiyonel alanlar
                if (subtitle) updatedConfig.institution_subtitle = subtitle;
                if (slogan1) updatedConfig.institution_slogan1 = slogan1;
                if (city) updatedConfig.city = city;
                if (district) updatedConfig.district = district;
                if (slogan2) updatedConfig.institution_slogan2 = slogan2;
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
                    institution_type: type || 'Daimi',
                    // Default values
                    institution_logo: logo || '',
                    institution_subtitle: subtitle || 'Canlı Pano Sistemi',
                    institution_slogan1: slogan1 || 'Hoş Geldiniz',
                    institution_slogan2: slogan2 || '',
                    institution_cover: cover || '',
                    city: city || '',
                    district: district || '',

                    // Arrays
                    dorm1_names: [],
                    dorm2_names: [],
                    announcements: [],
                    video_urls: [],
                    gallery_links: [],
                    left_gallery_links: [],
                    exam_winners: [],

                    // Objects
                    weekly_hadiths: payload.weekly_hadiths || {},
                    admin_contact: admin_contact || {},

                    // Dashboard Config
                    module_dorm_active: (module_dorm_active !== undefined) ? module_dorm_active : true,
                    module_bottom_right_type: module_bottom_right_type || 'auto'
                };

                const { data, error } = await supabase
                    .from('institutions')
                    .insert({ slug, name, password, config: newConfig })
                    .select();

                if (error) throw error;
                result = data;
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

        return response.status(400).json({ error: 'Geçersiz işlem' });

    } catch (err) {
        console.error('Admin API Hatası:', err);
        return response.status(500).json({ error: err.message });
    }
}
