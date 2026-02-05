
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

module.exports = async (request, response) => {
    const { url, query } = request;

    // Vercel rewrite support: prefer 'path' query param if available
    let pathStr = url;
    if (query && query.path) {
        pathStr = query.path;
    }

    // Clean up
    const cleanUrl = pathStr.split('?')[0];
    const pathParts = cleanUrl.replace(/^\//, '').split('/'); // Remove leading slash and split

    // Logic: [slug, optional_mode]
    const slug = pathParts[0]; // First part is always the slug
    // Check if *any* subsequent part is 'admin' (to be safe e.g. /slug/admin/dashboard) or just the second part
    const isAdminMode = pathParts[1] === 'admin';

    // If slug is empty (should be handled by other rewrites, but safety check)
    if (!slug) {
        return response.status(404).send('Not Found');
    }

    try {
        // 1. Determine which HTML file to serve
        const fileName = isAdminMode ? 'panel.html' : 'board.html';
        const filePath = path.join(process.cwd(), fileName);

        // Debug: Check if file exists
        if (!fs.existsSync(filePath)) {
            // DIAGNOSTIC INFO FOR VERCEL
            const currentDir = process.cwd();
            const files = fs.readdirSync(currentDir);
            console.error(`File not found: ${filePath}`);

            // Try fallback path (sometimes Vercel puts files in different spots)
            // But for now, report error to user to fix "Gelmedi" issue
            return response.status(500).send(`
                <h1>Sistem Hatası: Dosya Bulunamadı</h1>
                <p>Aranan Dosya: ${fileName}</p>
                <p>Tam Yol: ${filePath}</p>
                <p>Mevcut Dizin: ${currentDir}</p>
                <p>Dizin İçeriği: ${JSON.stringify(files)}</p>
                <hr>
                <p>Lütfen bu ekranın görüntüsünü geliştiriciye iletin.</p>
            `);
        }

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
