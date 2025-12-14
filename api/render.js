import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(request, response) {
    const { slug } = request.query;

    // Default metadata
    let title = "Dijital Pano";
    let desc = "Dijital Pano Sistemi";
    let image = "https://kartaltepepano.com/logo.png";
    let url = "https://kartaltepepano.com";

    // 1. Slug verisini çek
    if (slug) {
        const { data } = await supabase
            .from('institutions')
            .select('name, config')
            .eq('slug', slug)
            .single(); // .limit(1) yerine single kullanıp null check yapabiliriz ama single daha temiz

        if (data) {
            title = data.name || title;
            const config = data.config || {};

            // Logo varsa
            if (config.institution_logo) image = config.institution_logo;
            // Slogan varsa desc yap
            if (config.institution_title) desc = config.institution_title;

            url = `https://kartaltepepano.com/${slug}`;
        }
    }

    try {
        // 2. index.html dosyasını oku
        const filePath = path.join(process.cwd(), 'index.html');
        let html = fs.readFileSync(filePath, 'utf8');

        // 3. Meta etiketlerini değiştir
        // Regex kullanarak mevcut tagleri bul ve değiştir
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
        html = html.replace(/meta property="og:title" content=".*?"/, `meta property="og:title" content="${title}"`);
        html = html.replace(/meta property="og:description" content=".*?"/, `meta property="og:description" content="${desc}"`);
        html = html.replace(/meta property="og:image" content=".*?"/, `meta property="og:image" content="${image}"`);
        html = html.replace(/meta property="og:url" content=".*?"/, `meta property="og:url" content="${url}"`);

        // 4. HTML'i döndür
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        return response.send(html);

    } catch (error) {
        console.error('Render error:', error);
        // Hata durumunda basic response dönebiliriz veya 500
        return response.status(500).send('Sunucu Hatası: Sayfa oluşturulamadı.');
    }
}
