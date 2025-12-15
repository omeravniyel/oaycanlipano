const API_URL = '/api';

// URL'den slug al
const urlParams = new URLSearchParams(window.location.search);
// Normalde slug'ı path'den veya localStorage'dan alırız.
const CURRENT_SLUG = localStorage.getItem('admin_slug');
const CURRENT_PASSWORD = localStorage.getItem('admin_password');

if (!CURRENT_SLUG || !CURRENT_PASSWORD) {
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('admin_slug');
        localStorage.removeItem('admin_password');
        window.location.href = '/login.html';
    });

    // Save
    document.getElementById('save-btn').addEventListener('click', saveData);
});

async function loadData() {
    try {
        const res = await fetch(`/api/get-config?slug=${CURRENT_SLUG}`);
        if (!res.ok) throw new Error('Veri çekilemedi');
        const config = await res.json();

        // 1. Header Bilgileri
        setVal('institution-title', config.institution_title);
        setVal('institution-subtitle', config.institution_subtitle);
        setVal('institution-slogan1', config.institution_slogan1);
        setVal('institution-slogan2', config.institution_slogan2);
        setVal('institution-logo', config.institution_logo);

        // 2. Yatakhane Ayarları
        setVal('dorm-title', config.dorm_title);

        // Yatakhane 1
        if (config.dorm1_name) setVal('dorm1-name', config.dorm1_name);
        if (config.dorm1_count) setVal('dorm1-count', config.dorm1_count);
        if (config.dorm1_names && Array.isArray(config.dorm1_names)) {
            config.dorm1_names.forEach((name, i) => {
                const el = document.getElementById(`dorm1-s${i + 1}`);
                if (el) el.value = name;
            });
        }

        // Yatakhane 2
        if (config.dorm2_name) setVal('dorm2-name', config.dorm2_name);
        if (config.dorm2_count) setVal('dorm2-count', config.dorm2_count);
        if (config.dorm2_names && Array.isArray(config.dorm2_names)) {
            config.dorm2_names.forEach((name, i) => {
                const el = document.getElementById(`dorm2-s${i + 1}`);
                if (el) el.value = name;
            });
        }

        // 3. Duyurular
        const annContainer = document.getElementById('announcements-container');
        annContainer.innerHTML = '';
        if (config.announcements && Array.isArray(config.announcements)) {
            config.announcements.forEach(text => addAnnouncement(text));
        } else {
            addAnnouncement(); // Boş bir tane
        }

        // 4. Video Liste
        const vidContainer = document.getElementById('video-playlist-container');
        vidContainer.innerHTML = '';
        let vList = config.video_urls || [];
        // Geriye dönük uyumluluk
        if (config.video_url && (!config.video_urls || config.video_urls.length === 0)) {
            vList = [config.video_url];
        }

        if (vList.length > 0) {
            vList.forEach(url => addVideoItem(url));
        } else {
            addVideoItem();
        }

        // 5. Menü
        if (config.lunch_menu) setVal('lunch-menu', config.lunch_menu);
        if (config.dinner_menu) setVal('dinner-menu', config.dinner_menu);
        if (document.getElementById('menu-enabled')) {
            document.getElementById('menu-enabled').checked = (config.menu_enabled !== false);
        }

        // 6. Günün Sözü 
        if (config.quote_content) setVal('quote-content', config.quote_content);

        // 7. Sınav Sonuçları (Varsa)
        const winnerContainer = document.getElementById('winners-container');
        if (winnerContainer && config.exam_winners && Array.isArray(config.exam_winners)) {
            winnerContainer.innerHTML = '';
            config.exam_winners.forEach(w => addWinnerItem(w));
        }

        // 8. Galeri (Main)
        const galleryContainer = document.getElementById('gallery-container');
        if (galleryContainer) {
            galleryContainer.innerHTML = '';
            const gLinks = config.gallery_links || [];
            if (gLinks.length > 0) gLinks.forEach(l => addGalleryItem(l));
            else addGalleryItem();
        }

        // 9. Sol Galeri
        const leftGalleryContainer = document.getElementById('left-gallery-container');
        if (leftGalleryContainer) {
            leftGalleryContainer.innerHTML = '';
            const lLinks = config.left_gallery_links || [];
            if (lLinks.length > 0) lLinks.forEach(l => addLeftGalleryItem(l));
            else addLeftGalleryItem();
        }

    } catch (e) {
        console.error(e);
        // alert('Veriler yüklenirken hata oluştu: ' + e.message); // Kullanıcıyı korkutma, console yeterli
    }
}

async function saveData() {
    const btn = document.getElementById('save-btn');
    const originalText = btn.innerText;

    try {
        btn.innerText = '⏳ Kaydediliyor...';
        btn.disabled = true;

        // Helperlar
        const getList = (cls) => Array.from(document.getElementsByClassName(cls)).map(e => e.value.trim()).filter(v => v);

        const dorm1 = [];
        for (let i = 1; i <= 6; i++) dorm1.push(document.getElementById(`dorm1-s${i}`).value.trim());

        const dorm2 = [];
        for (let i = 1; i <= 6; i++) dorm2.push(document.getElementById(`dorm2-s${i}`).value.trim());

        const newConfig = {
            institution_title: getVal('institution-title'),
            institution_subtitle: getVal('institution-subtitle'),
            institution_slogan1: getVal('institution-slogan1'),
            institution_slogan2: getVal('institution-slogan2'),
            institution_logo: getVal('institution-logo'),

            dorm_title: getVal('dorm-title'),
            dorm1_name: getVal('dorm1-name'),
            dorm1_count: getVal('dorm1-count'),
            dorm1_names: dorm1,

            dorm2_name: getVal('dorm2-name'),
            dorm2_count: getVal('dorm2-count'),
            dorm2_names: dorm2,

            announcements: getList('announcement-input'),

            // Video Playlist
            video_urls: getList('video-item-input'),

            // Menü
            lunch_menu: getVal('lunch-menu'),
            dinner_menu: getVal('dinner-menu'),
            menu_enabled: document.getElementById('menu-enabled') ? document.getElementById('menu-enabled').checked : true,

            // Quote
            quote_content: getVal('quote-content'),

            // Sınav (Winner)
            exam_winners: getList('winner-input'),

            // Galeri
            gallery_links: getList('gallery-input'),
            left_gallery_links: getList('left-gallery-input')
        };

        const res = await fetch('/api/save-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: CURRENT_SLUG,
                password: CURRENT_PASSWORD,
                config: newConfig
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        btn.innerText = '✅ Kaydedildi';
        setTimeout(() => btn.innerText = originalText, 2000);

    } catch (e) {
        console.error(e);
        alert('Kaydetme hatası: ' + e.message);
        btn.innerText = '❌ Hata';
    } finally {
        btn.disabled = false;
    }
}

// --- HELPER FUNCTIONS ---

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function removeParent(btn) {
    btn.parentElement.remove();
}

// Announcements
function addAnnouncement(text = '') {
    const container = document.getElementById('announcements-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="announcement-input flex-1 px-4 py-2 border border-gray-300 rounded-lg" value="${text}" placeholder="Duyuru metni...">
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Videos
function addVideoItem(url = '') {
    const container = document.getElementById('video-playlist-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <div class="flex-1">
            <input type="text" class="video-item-input w-full px-4 py-2 border border-gray-300 rounded-lg" value="${url}" placeholder="Youtube Linki (https://...)">
        </div>
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Gallery (Main)
function addGalleryItem(url = '') {
    const container = document.getElementById('gallery-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <div class="relative flex-1 group">
            <input type="text" class="gallery-input w-full px-4 py-2 border border-gray-300 rounded-lg" value="${url}" placeholder="Resim URL">
            ${url ? `<img src="${url}" class="absolute right-2 top-1 h-8 w-8 object-cover rounded border bg-white group-hover:scale-150 transition z-10">` : ''}
        </div>
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Left Gallery
function addLeftGalleryItem(url = '') {
    const container = document.getElementById('left-gallery-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <div class="relative flex-1 group">
             <input type="text" class="left-gallery-input w-full px-4 py-2 border border-gray-300 rounded-lg" value="${url}" placeholder="Resim URL">
             ${url ? `<img src="${url}" class="absolute right-2 top-1 h-8 w-8 object-cover rounded border bg-white group-hover:scale-150 transition z-10">` : ''}
        </div>
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Winners
function addWinnerItem(text = '') {
    const container = document.getElementById('winners-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="winner-input flex-1 px-4 py-2 border border-gray-300 rounded-lg" value="${text}" placeholder="Öğrenci Adı - Puan">
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Upload Helper (Logo)
async function uploadFile(input, targetId) {
    const file = input.files[0];
    if (!file) return;

    const btn = input.nextElementSibling;
    const originalText = btn.innerText;
    btn.innerText = "⏳";
    btn.disabled = true;

    try {
        const resized = await resizeImage(file, 800);
        const reader = new FileReader();
        reader.readAsDataURL(resized);
        reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    fileBase64: base64,
                    contentType: file.type
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            document.getElementById(targetId).value = data.url;
            btn.innerText = "✅";
        };
    } catch (e) {
        console.error(e);
        alert('Yükleme hatası');
        btn.innerText = "❌";
    } finally {
        setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
    }
}

// Basit Image Resize
function resizeImage(file, maxWidth) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Blob dön
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
        };
        reader.onerror = reject;
    });
}
