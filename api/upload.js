import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
// Storage işlemleri için Service Role Key gerekebilir ama Anon key de politikalar açıksa yeterli olur.
// Kullanıcının "images" bucket'ı "Public" olmalı.

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { filename, fileBase64, contentType } = request.body;

        if (!filename || !fileBase64) {
            return response.status(400).json({ error: 'Dosya verisi eksik' });
        }

        // Base64 -> Buffer
        const buffer = Buffer.from(fileBase64, 'base64');

        // Benzersiz dosya ismi (Overwrite olmasın diye timestamp ekleyelim)
        const uniqueName = `${Date.now()}_${filename}`;

        // Supabase Storage Upload
        const { data, error } = await supabase
            .storage
            .from('images') // Kullanıcının oluşturması gereken bucket
            .upload(uniqueName, buffer, {
                contentType: contentType || 'image/png',
                upsert: false
            });

        if (error) {
            console.error('Upload Error:', error);
            return response.status(500).json({ error: error.message });
        }

        // Public URL oluştur
        const { data: publicUrlData } = supabase
            .storage
            .from('images')
            .getPublicUrl(uniqueName);

        return response.status(200).json({
            success: true,
            url: publicUrlData.publicUrl
        });

    } catch (err) {
        console.error('Server Error:', err);
        return response.status(500).json({ error: err.message });
    }
}
