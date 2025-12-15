const API_URL = '/api';

// URL'den slug al
// Path: /:slug/admin (Örn: /omeravniyel/admin)
const pathSlugMatch = window.location.pathname.match(/^\/([^/]+)\/admin/);
let pathSlug = pathSlugMatch ? pathSlugMatch[1] : null;

// Eğer direkt admin.html açıldıysa ve pathSlug yoksa, localStorage'a güven (fakat bu güvenlik açığı olabilir, neyse)
// Better: URL'de slug varsa, localStorage ile EŞLEŞMEK ZORUNDA.

const CURRENT_SLUG = localStorage.getItem('admin_slug');
const CURRENT_PASSWORD = localStorage.getItem('admin_password');

// 1. Yetki Kontrolü
if (!CURRENT_SLUG || !CURRENT_PASSWORD) {
    // Hiç giriş yok -> Login
    console.log("Oturum yok, login'e yönlendiriliyor.");
    window.location.href = '/login.html';
} else if (pathSlug && pathSlug !== CURRENT_SLUG) {
    // URL'deki slug ile Giriş yapılan slug farklı -> Çıkış yap ve Login'e at
    console.log("Yetkisiz erişim denemesi (Slug uyuşmuyor).");
    localStorage.removeItem('admin_slug');
    localStorage.removeItem('admin_password');
    localStorage.removeItem('admin_name');
    window.location.href = '/login.html';
}
// Eğer her şey yolundaysa, CURRENT_SLUG ile devam et.

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

        // Admin Panel Başlığını Güncelle
        if (config.institution_title) {
            const headerTitleEl = document.getElementById('admin-header-title');
            if (headerTitleEl) headerTitleEl.innerText = `🎛️ Admin Panel - ${config.institution_title}`;
        }

        setVal('institution-subtitle', config.institution_subtitle);
        setVal('institution-slogan1', config.institution_slogan1);
        setVal('institution-slogan2', config.institution_slogan2);
        setVal('institution-logo', config.institution_logo);

        // Logo Kilit Kontrolü
        if (config.logo_locked) {
            const logoInput = document.getElementById('institution-logo');
            if (logoInput) {
                // Input'un olduğu container'ı bulup gizle
                // Genelde label + input + button bir div içindedir.
                // En garantisi: parentElement'i gizle (eğer structure admin.html'de uygunsa)
                // admin.html'de bu input: <div> <label>Logo URL</label> ... </div> içinde.
                const container = logoInput.closest('div');
                if (container) {
                    container.style.display = 'none';
                    // Kullanıcıya bilgi ver (Opsiyonel, şimdilik gizliyoruz)
                }
            }
        }

        // 2. Yatakhane Ayarları
        setVal('dorm-title', config.dorm_title); // Custom Title

        // Yatakhane 1
        setVal('dorm1-custom-title', config.dorm1_custom_title);
        if (config.dorm1_name) setVal('dorm1-name', config.dorm1_name);
        if (config.dorm1_count) setVal('dorm1-count', config.dorm1_count);
        if (config.dorm1_names && Array.isArray(config.dorm1_names)) {
            config.dorm1_names.forEach((name, i) => {
                const el = document.getElementById(`dorm1-s${i + 1}`);
                if (el) el.value = name;
            });
        }

        // Yatakhane 2
        setVal('dorm2-custom-title', config.dorm2_custom_title);
        if (config.dorm2_name) setVal('dorm2-name', config.dorm2_name);
        if (config.dorm2_count) setVal('dorm2-count', config.dorm2_count);
        if (config.dorm2_names && Array.isArray(config.dorm2_names)) {
            config.dorm2_names.forEach((name, i) => {
                const el = document.getElementById(`dorm2-s${i + 1}`);
                if (el) el.value = name;
            });
        }

        // 3. Sağ Alt Widget
        const wType = config.bottom_widget_type || 'exam';
        setVal('bottom-widget-type', wType);

        // Widget Data Loading
        // A. Exam
        const winnerContainer = document.getElementById('exam-winners-container');
        if (winnerContainer) {
            winnerContainer.innerHTML = '';
            const winners = config.exam_winners || [];
            if (winners.length > 0) winners.forEach(w => addExamWinner(w));
            else addExamWinner(); // Empty slot
        }

        // B. Student of Week
        if (config.student_of_week) {
            setVal('student-name', config.student_of_week.name);
            setVal('student-class', config.student_of_week.class);
            setVal('student-message', config.student_of_week.message);
            setVal('student-image', config.student_of_week.image);
            if (config.student_of_week.image) {
                const img = document.getElementById('student-preview');
                img.src = config.student_of_week.image;
                img.classList.remove('hidden');
            }
        }

        // C. Most Improved
        const improvedContainer = document.getElementById('improved-list-container');
        if (improvedContainer) {
            improvedContainer.innerHTML = '';
            const improved = config.most_improved_list || [];
            if (improved.length > 0) improved.forEach(s => addImprovedStudent(s));
            else addImprovedStudent();
        }

        // Trigger UI update
        if (window.toggleBottomWidget) toggleBottomWidget();


        // 4. Duyurular
        const annContainer = document.getElementById('announcements-container');
        annContainer.innerHTML = '';
        if (config.announcements && Array.isArray(config.announcements)) {
            config.announcements.forEach(text => addAnnouncement(text));
        } else {
            addAnnouncement(); // Boş bir tane
        }

        // 5. Video Liste
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

        // 6. Menü
        if (config.lunch_menu) setVal('lunch-menu', config.lunch_menu);
        if (config.dinner_menu) setVal('dinner-menu', config.dinner_menu);
        if (document.getElementById('menu-enabled')) {
            document.getElementById('menu-enabled').checked = (config.menu_enabled !== false);
        }

        // 7. Günün Sözü 
        if (config.quote_content) setVal('quote-content', config.quote_content);

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

            // Yatakhane
            dorm_title: getVal('dorm-title'),
            dorm1_custom_title: getVal('dorm1-custom-title'),
            dorm1_name: getVal('dorm1-name'),
            dorm1_count: getVal('dorm1-count'),
            dorm1_names: dorm1,

            dorm2_custom_title: getVal('dorm2-custom-title'),
            dorm2_name: getVal('dorm2-name'),
            dorm2_count: getVal('dorm2-count'),
            dorm2_names: dorm2,

            // Sağ Alt Widget
            bottom_widget_type: getVal('bottom-widget-type'),

            // A. Exam
            exam_winners: getList('winner-input'),

            // B. Student of Week
            student_of_week: {
                name: getVal('student-name'),
                class: getVal('student-class'),
                message: getVal('student-message'),
                image: getVal('student-image')
            },

            // C. Most Improved
            most_improved_list: getList('improved-input'),

            // Diğer
            announcements: getList('announcement-input'),

            // Video Playlist
            video_urls: getList('video-item-input'),

            // Menü
            lunch_menu: getVal('lunch-menu'),
            dinner_menu: getVal('dinner-menu'),
            menu_enabled: document.getElementById('menu-enabled') ? document.getElementById('menu-enabled').checked : true,

            // Quote
            quote_content: getVal('quote-content'),

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

// --- TABS ---
window.openTab = function (tabName) {
    // Hide all
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('text-indigo-600', 'bg-indigo-50', 'border-indigo-100');
        el.classList.add('text-gray-500');
    });

    // Show target
    document.getElementById('tab-' + tabName).classList.remove('hidden');

    // Highlight btn
    const btn = document.getElementById('tab-btn-' + tabName);
    if (btn) {
        btn.classList.add('text-indigo-600', 'bg-indigo-50', 'border-indigo-100');
        btn.classList.remove('text-gray-500');
    }
}

// --- AI CHATBOT ---
window.toggleChat = function () {
    const chat = document.getElementById('ai-chat-window');
    chat.classList.toggle('hidden');
}

window.handleChat = function (e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const msg = input.value.trim().toLowerCase();
    if (!msg) return;

    addMsg(input.value, 'user');
    input.value = '';

    // Logic
    setTimeout(() => {
        let response = "Bunu tam anlayamadım, ama menülerden yardımcı olabilirim.";
        let action = null;

        if (msg.includes('logo') || msg.includes('isim') || msg.includes('başlık')) {
            response = "Genel Ayarlar sekmesinden kurum ismini, logosunu ve sloganları değiştirebilirsiniz. Sizi oraya götürüyorum.";
            action = () => openTab('settings');
        } else if (msg.includes('yemek') || msg.includes('menü')) {
            response = "Yemek menüsü 'Yemek & Galeri' sekmesinde. Orayı açıyorum.";
            action = () => openTab('media');
        } else if (msg.includes('video') || msg.includes('galeri') || msg.includes('resim')) {
            response = "Resim ve Videoları 'Yemek & Galeri' sekmesinden yönetebilirsiniz.";
            action = () => openTab('media');
        } else if (msg.includes('hadis') || msg.includes('duyuru') || msg.includes('söz')) {
            response = "Duyurular ve Hadis girişleri 'İçerik Yönetimi' sekmesinde.";
            action = () => openTab('content');
        } else if (msg.includes('öğrenci') || msg.includes('yurt') || msg.includes('sınav') || msg.includes('kazanan')) {
            response = "Öğrenci listeleri ve sınav sonuçları 'Öğrenci & Yurt' sekmesinde.";
            action = () => openTab('students');
        } else if (msg.includes('merhaba') || msg.includes('selam')) {
            response = "Merhaba! Size nasıl yardımcı olabilirim? Menüleri bulamazsanız bana sorun.";
        }

        addMsg(response, 'bot');
        if (action) action();

    }, 600);
}

function addMsg(text, sender) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = sender === 'user'
        ? 'bg-indigo-600 text-white p-3 rounded-tl-xl rounded-tr-xl rounded-bl-xl shadow-md ml-auto w-fit max-w-[80%]'
        : 'bg-white text-gray-700 p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm border border-gray-100 w-fit max-w-[80%]';
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

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

// --- HELPER FUNCTIONS ---

window.toggleBottomWidget = function () {
    const val = document.getElementById('bottom-widget-type').value;
    document.querySelectorAll('.widget-panel').forEach(el => el.classList.add('hidden'));

    if (val === 'exam') document.getElementById('widget-exam-panel').classList.remove('hidden');
    else if (val === 'student_of_week') document.getElementById('widget-student-panel').classList.remove('hidden');
    else if (val === 'most_improved') document.getElementById('widget-improved-panel').classList.remove('hidden');
    else if (val === 'menu') document.getElementById('widget-menu-panel').classList.remove('hidden');
}

// Exam Winners
window.addExamWinner = function (text = '') {
    const container = document.getElementById('exam-winners-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="winner-input flex-1 px-4 py-2 border border-gray-300 rounded-lg" value="${text}" placeholder="Öğrenci Adı - Puan">
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Improved Students
window.addImprovedStudent = function (text = '') {
    const container = document.getElementById('improved-list-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="improved-input flex-1 px-4 py-2 border border-blue-300 rounded-lg" value="${text}" placeholder="Öğrenci Adı - Artış Miktarı">
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Upload Helper (Updated for Preview)
window.uploadFile = async function (input, targetId, previewId = null) {
    const file = input.files[0];
    if (!file) return;

    // Loading State
    const wrapper = input.parentElement; // Usually container
    // We can't easily find a button if the structure varies.
    // Assuming button is next sibling if plain input, OR if hidden input context

    // For student preview, input is absolute over a div.
    // Let's just use simple visual feedback if possible.

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

            // Preview
            if (previewId) {
                const img = document.getElementById(previewId);
                img.src = data.url;
                img.classList.remove('hidden');
            } else {
                // Fallback for button inside plain file inputs
                const btn = input.nextElementSibling;
                if (btn && btn.tagName === 'BUTTON') {
                    btn.innerText = "✅";
                    setTimeout(() => btn.innerText = "Dosya Seç", 2000);
                }
            }
        };
    } catch (e) {
        console.error(e);
        alert('Yükleme hatası: ' + e.message);
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
