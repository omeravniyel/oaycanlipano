import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use Service Role Key if available to bypass RLS (Row Level Security)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { filename, fileBase64, contentType, slug } = request.body;

        if (!filename || !fileBase64) {
            return response.status(400).json({ error: 'Dosya verisi eksik' });
        }

        // Base64 -> Buffer
        const buffer = Buffer.from(fileBase64, 'base64');

        // Benzersiz dosya ismi
        const uniqueName = `${Date.now()}_${filename}`;

        // Son dosya yolu (Klasörleme: slug/dosya_adi)
        const filePath = slug ? `${slug}/${uniqueName}` : uniqueName;

        // Supabase Storage Upload
        const { data, error } = await supabase
            .storage
            .from('images') // Kullanıcının oluşturması gereken bucket
            .upload(filePath, buffer, {
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
            .getPublicUrl(filePath);

        return response.status(200).json({
            success: true,
            url: publicUrlData.publicUrl
        });

    } catch (err) {
        console.error('Server Error:', err);
        return response.status(500).json({ error: err.message });
    }
}
