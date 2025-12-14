import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { slug, password, config } = request.body;

    if (!slug || !config) {
        return response.status(400).json({ error: 'Eksik parametre (slug veya config)' });
    }

    // 1. Şifre Doğrulama (Basit)
    // Gerçek uygulamada şifre hashlenmeli ve JWT kullanılmalı.
    // Şimdilik veritabanındaki kayıtlı şifreyle eşleşiyor mu diye basitçe bakıyoruz.
    // Ancak güvenlik için SELECT sorgusuyla şifreyi alıp burada kontrol edelim.

    // Admin yetkisi kontrolü (Süper admin veya kurum admini)
    // Şimdilik sadece kurum şifresi kontrolü:

    const { data: institution, error: fetchError } = await supabase
        .from('institutions')
        .select('password')
        .eq('slug', slug)
        .single();

    if (fetchError || !institution) {
        return response.status(404).json({ error: 'Kurum bulunamadı' });
    }

    if (institution.password !== password) {
        return response.status(401).json({ error: 'Hatalı şifre!' });
    }

    // 2. Veriyi Güncelle
    const { data, error } = await supabase
        .from('institutions')
        .update({ config: config })
        .eq('slug', slug)
        .select();

    if (error) {
        return response.status(500).json({ error: error.message });
    }

    return response.status(200).json({ success: true, data });
}
