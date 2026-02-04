
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export default async function handler(request, response) {
    const { url } = request;

    // Extract slug from URL (e.g., "/enderun" -> "enderun")
    // Remove query params if any
    const cleanUrl = url.split('?')[0];
    const slug = cleanUrl.replace(/^\//, ''); // Remove leading slash

    // If slug is empty (should be handled by other rewrites, but safety check)
    if (!slug) {
        return response.status(404).send('Not Found');
    }

    try {
        // 1. Read board.html
        // In Vercel serverless environment, process.cwd() is usually the project root
        const filePath = path.join(process.cwd(), 'board.html');
        let html = fs.readFileSync(filePath, 'utf-8');

        // 2. Fetch Institution Config
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase credentials missing');
            // Serve raw HTML as fallback
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            return response.send(html);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: institution } = await supabase
            .from('institutions')
            .select('name, config')
            .eq('slug', slug)
            .single();

        if (institution) {
            const config = institution.config || {};
            const title = config.institution_title || institution.name || 'Kartaltepe Pano';
            // Use existing logo logic or fallback
            const logo = config.institution_logo || 'https://kartaltepepano.com/logo-share.png';
            const desc = config.institution_subtitle || 'Kurumsal Bilgilendirme Ekranı';

            // 3. Inject Meta Tags
            // We use simple regex replacement for valid OG tags

            // Note: RegExp is case insensitive just in case, though we know the file content
            html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
            html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${desc}" />`);
            html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${logo}" />`);

            // Twitter Cards
            html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
            html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${desc}" />`);
            html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${logo}" />`);

            // Standard Title
            html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
        }

        // 4. Serve HTML
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        return response.send(html);

    } catch (error) {
        console.error('Error serving board:', error);

        // Fallback: Try to serve the raw file
        try {
            const filePath = path.join(process.cwd(), 'board.html');
            if (fs.existsSync(filePath)) {
                const html = fs.readFileSync(filePath, 'utf-8');
                response.setHeader('Content-Type', 'text/html; charset=utf-8');
                return response.send(html);
            }
        } catch (e) {
            console.error('Fallback failed:', e);
        }

        return response.status(500).send('Internal Server Error');
    }
}
