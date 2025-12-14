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
            const { slug, name, password, logo } = payload;

            // Varsayılan config yapısı
            const defaultConfig = {
                institution_title: name,
                institution_subtitle: 'DİJİTAL PANO SİSTEMİ',
                institution_slogan1: 'Hoşgeldiniz',
                institution_slogan2: 'Bilgi Ekranı',
                institution_logo: logo || '',
                // Diğerleri boş gelsin
                announcements: [],
                menu: []
            };

            // Önce mevcut var mı bak (Sadece config'i merge etmek isterseniz)
            // Ama burada basitçe yeni oluşturuyoruz veya üzerine yazıyoruz.
            const { data, error } = await supabase
                .from('institutions')
                .upsert({
                    slug,
                    name,
                    password,
                    config: defaultConfig // Not: Bu işlem mevcut config'i sıfırlar! Dikkatli kullanım için UI uyarısı eklenmeli.
                })
                .select();

            if (error) throw error;
            return response.status(200).json({ success: true, data });
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
