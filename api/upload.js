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
        // Türkçe karakterleri temizle ve boşlukları tire ile değiştir
        const sanitizedFilename = filename
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents (ü -> u, ş -> s)
            .replace(/[^a-zA-Z0-9.-]/g, '-') // Replace non-alphanumeric (like spaces) with -
            .replace(/-+/g, '-'); // Merge multiple hyphens

        const uniqueName = `${Date.now()}_${sanitizedFilename}`;

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

            // Detailed diagnostics for "Bucket not found"
            if (error.message.includes('Bucket not found') || error.statusCode === '404') {
                try {
                    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
                    if (buckets) {
                        const bucketNames = buckets.map(b => b.name).join(', ');
                        return response.status(500).json({
                            error: `Bucket 'images' bulunamadı. Mevcut bucketlar: ${bucketNames}. Lütfen Supabase panelinden 'images' adında public bir bucket oluşturun.`
                        });
                    }
                } catch (e) {
                    console.error('List buckets error:', e);
                }
            }

            return response.status(500).json({ error: `Yükleme Hatası: ${error.message}` });
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
