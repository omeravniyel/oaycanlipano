const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (except /api)
app.use(express.static(path.join(__dirname), {
    index: false // We handle index routing manually
}));

// API Route Handler
app.use('/api/:functionName', async (req, res) => {
    const { functionName } = req.params;
    const apiPath = path.join(__dirname, 'api', `${functionName}.js`);

    if (fs.existsSync(apiPath)) {
        try {
            const apiFunction = require(apiPath);
            // Vercel Serverless Function Signature: (req, res)
            await apiFunction(req, res);
        } catch (error) {
            console.error(`API Error (${functionName}):`, error);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    } else {
        res.status(404).json({ error: 'API Function Route Not Found' });
    }
});

// --- VERCEL REWRITES SIMULATION ---

// 1. Root -> index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. /admin -> admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 3. /:slug/admin -> panel.html
app.get('/:slug/admin', (req, res) => {
    // We serve panel.html directly.
    // The frontend logic we added (checking URL path) handles extracting the slug.
    res.sendFile(path.join(__dirname, 'panel.html'));
});

// 4. Fallback /:slug -> api/serve-board.js logic
app.get(/.*/, async (req, res) => {
    // If it looks like a file extension (e.g. .css, .js) that wasn't found in static middleware, 404 it.
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).send('Not Found');
    }

    // Pass to serve-board.js logic
    try {
        const serveBoard = require('./api/serve-board.js');
        // serve-board expects query.path to act like a rewrite if provided, or url.
        // We can just pass the req object as is, but let's ensure 'path' query is set if needed by our logic?
        // Actually serve-board checks `req.url` or `req.query.path`.
        // Let's manually inject the path for consistency if needed, but passing `req` is usually enough.
        await serveBoard(req, res);
    } catch (e) {
        console.error("Serve Board Error:", e);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Local Server Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
    console.log(`🏫 Example: http://localhost:${PORT}/test-lisesi`);
    console.log(`\n(Press Ctrl+C to stop)\n`);
});
