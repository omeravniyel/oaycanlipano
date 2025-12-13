const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    try {
        const galleryPath = path.join(process.cwd(), 'galeri');

        // Klasör var mı kontrol et
        if (!fs.existsSync(galleryPath)) {
            return res.json({ images: [] });
        }

        // Klasördeki dosyaları oku
        const files = fs.readdirSync(galleryPath);

        // Sadece resim dosyalarını filtrele
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const images = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return imageExtensions.includes(ext);
            })
            .map(file => `/galeri/${file}`);

        res.json({ images });
    } catch (error) {
        console.error('Galeri yükleme hatası:', error);
        res.json({ images: [] });
    }
};
