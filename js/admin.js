// Admin Panel JavaScript
console.log("Admin panel yüklendi");

// Authentication Control
const CURRENT_SLUG = localStorage.getItem('admin_slug');
const CURRENT_PASSWORD = localStorage.getItem('admin_password');

if (!CURRENT_SLUG) {
    window.location.href = '/login.html';
}

// GENEL YARDIMCI FONKSİYONLAR
function removeParent(btn) {
    btn.parentElement.remove();
}

// DUYURULAR
function addAnnouncement() {
    const container = document.getElementById('announcements-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="announcement-input flex-1 px-4 py-2 border border-gray-300 rounded-lg" placeholder="Duyuru metni...">
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// GALERİ
function addGalleryItem(url = '') {
    const container = document.getElementById('gallery-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <div class="relative flex-1 group">
            <input type="text" class="gallery-input w-full px-4 py-2 border border-gray-300 rounded-lg" value="${url}" placeholder="Resim URL (https://...)">
            ${url ? `<img src="${url}" class="absolute right-2 top-1 h-8 w-8 object-cover rounded border bg-white group-hover:scale-150 transition z-10">` : ''}
        </div>
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// GALERİ RESİM YÜKLEME
async function uploadGalleryImage(input) {
    const file = input.files[0];
    if (!file) return;

    const btn = document.getElementById('gallery-upload-btn');
    const originalText = btn.innerText;
    btn.innerText = "⏳ Yükleniyor...";
    btn.disabled = true;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
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

            // Başarılı olursa listeye ekle
            addGalleryItem(data.url);
            showMessage("Resim yüklendi ve eklendi!", "success");

        } catch (err) {
            alert("Yükleme Hatası: " + err.message + "\nSupabase 'images' bucket'ının açık olduğundan emin olun.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };
}
function startUpload() { document.getElementById('gallery-file-input').click(); }

// GÜNÜN SÖZLERİ
function addQuoteItem() {
    const container = document.getElementById('quotes-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="quote-input flex-1 px-4 py-2 border border-gray-300 rounded-lg" placeholder="Motivasyon sözü...">
        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Sınav kazananı ekleme (Aynı kaldı)
function addExamWinner() {
    const container = document.getElementById('exam-winners-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" class="exam-class flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Sınıf">
        <input type="text" class="exam-student flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="İsim">
        <input type="number" class="exam-score w-32 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Puan">
        <button type="button" onclick="removeParent(this)" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Mesaj gösterme
function showMessage(message, type = 'success') {
    const container = document.getElementById('message-container');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    container.innerHTML = `
        <div class="${bgColor} text-white px-6 py-4 rounded-lg shadow-lg">
            <p class="font-semibold">${message}</p>
        </div>
    `;
    setTimeout(() => { container.innerHTML = ''; }, 3000);
}

// VERİLERİ YÜKLE
async function loadData() {
    try {
        const res = await fetch(`/api/get-config?slug=${CURRENT_SLUG}`);
        const config = await res.json();

        // Header
        const fields = ['institution_title', 'institution_subtitle', 'institution_slogan1', 'institution_slogan2', 'institution_logo'];
        fields.forEach(f => {
            if (config[f]) document.getElementById(f.replace('_', '-')).value = config[f];
        });

        // Başlıklar
        if (config.dorm_title) document.getElementById('dorm-title').value = config.dorm_title;

        // Yemek Menüsü
        if (config.lunch_menu) document.getElementById('lunch-menu').value = config.lunch_menu;
        if (config.dinner_menu) document.getElementById('dinner-menu').value = config.dinner_menu;

        // Hadis HTML'de sabit ama configde veri varsa (eski uyumluluk veya ileride değişirse) yine de value olarak basılabilir
        // Ama kullanıcı readonly istediği için şimdilik ellemiyorum, HTML'deki default değer kalacak: 15-21 ARALIK
        if (config.hadith) {
            const hadith = typeof config.hadith === 'string' ? JSON.parse(config.hadith) : config.hadith;
            document.getElementById('hadith-arabic').value = hadith.arabic || '';
            document.getElementById('hadith-turkish').value = hadith.text || '';
        }

        // Yatakhane 1 & 2 (Aynı kaldı)
        ['dorm1', 'dorm2'].forEach(d => {
            if (config[d]) {
                const data = typeof config[d] === 'string' ? JSON.parse(config[d]) : config[d];
                document.getElementById(`${d}-name`).value = data.name || '';
                document.getElementById(`${d}-count`).value = data.count || '';
                for (let i = 1; i <= 6; i++) document.getElementById(`${d}-s${i}`).value = data[`s${i}`] || '';
            }
        });

        // Listeler: Duyurular, Galeri, Günün Sözleri
        const loadList = (listKey, containerId, inputClass, btnFunction) => {
            if (config[listKey]) {
                const list = typeof config[listKey] === 'string' ? JSON.parse(config[listKey]) : config[listKey];
                const container = document.getElementById(containerId);
                container.innerHTML = '';
                list.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'flex gap-2';
                    div.innerHTML = `
                        <input type="text" class="${inputClass} flex-1 px-4 py-2 border border-gray-300 rounded-lg" value="${item}">
                        <button type="button" onclick="removeParent(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
                    `;
                    container.appendChild(div);
                });
            }
        };

        loadList('announcements', 'announcements-container', 'announcement-input');
        loadList('gallery_links', 'gallery-container', 'gallery-input');
        loadList('quotes', 'quotes-container', 'quote-input');


        // Sınav (Aynı kaldı)
        if (config.exam_config) {
            const exam = typeof config.exam_config === 'string' ? JSON.parse(config.exam_config) : config.exam_config;
            document.getElementById('exam-name').value = exam.name || '';
            if (exam.winners) {
                const container = document.getElementById('exam-winners-container');
                container.innerHTML = '';
                const lines = exam.winners.split('\n').filter(l => l.trim() !== '');
                lines.forEach(line => {
                    const parts = line.split(',');
                    if (parts.length >= 3) {
                        const div = document.createElement('div');
                        div.className = 'flex gap-2 items-center';
                        div.innerHTML = `
                            <input type="text" class="exam-class flex-1 px-3 py-2 border border-gray-300 rounded-lg" value="${parts[0].trim()}">
                            <input type="text" class="exam-student flex-1 px-3 py-2 border border-gray-300 rounded-lg" value="${parts[1].trim()}">
                            <input type="number" class="exam-score w-32 px-3 py-2 border border-gray-300 rounded-lg" value="${parts[2].trim()}">
                            <button type="button" onclick="removeParent(this)" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
                        `;
                        container.appendChild(div);
                    }
                });
            }
        }

        // Video URL
        if (config.video_url) document.getElementById('video-url').value = config.video_url;

        console.log('Veriler yüklendi');
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        showMessage('Veriler yüklenirken hata oluştu! Girdiğiniz link yanlış olabilir mi?', 'error');
    }
}

// KAYDET
document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Kaydediliyor...';

    try {
        // Form verilerini topla
        const getListValues = (inputClass) =>
            Array.from(document.querySelectorAll(`.${inputClass}`))
                .map(input => input.value.trim())
                .filter(val => val !== '');

        const hadith = {
            week: document.getElementById('hadith-week').value,
            arabic: document.getElementById('hadith-arabic').value,
            text: document.getElementById('hadith-turkish').value
        };

        const getDorm = (id) => ({
            name: document.getElementById(`${id}-name`).value,
            count: document.getElementById(`${id}-count`).value,
            s1: document.getElementById(`${id}-s1`).value,
            s2: document.getElementById(`${id}-s2`).value,
            s3: document.getElementById(`${id}-s3`).value,
            s4: document.getElementById(`${id}-s4`).value,
            s5: document.getElementById(`${id}-s5`).value,
            s6: document.getElementById(`${id}-s6`).value
        });

        // Sınav
        const examWinnerRows = document.querySelectorAll('#exam-winners-container > div');
        const examWinners = [];
        examWinnerRows.forEach(row => {
            const classInput = row.querySelector('.exam-class');
            const studentInput = row.querySelector('.exam-student');
            const scoreInput = row.querySelector('.exam-score');
            if (classInput && studentInput && scoreInput && classInput.value && studentInput.value && scoreInput.value) {
                examWinners.push(`${classInput.value.trim()},${studentInput.value.trim()},${scoreInput.value.trim()}`);
            }
        });

        // Yeni Yapı
        const newConfig = {
            // Header
            institution_title: document.getElementById('institution-title').value,
            institution_subtitle: document.getElementById('institution-subtitle').value,
            institution_slogan1: document.getElementById('institution-slogan1').value,
            institution_slogan2: document.getElementById('institution-slogan2').value,
            institution_logo: document.getElementById('institution-logo').value,

            // Ayarlar
            dorm_title: document.getElementById('dorm-title').value,
            lunch_menu: document.getElementById('lunch-menu').value,
            dinner_menu: document.getElementById('dinner-menu').value,
            video_url: document.getElementById('video-url').value,

            // Listeler & Objeler
            hadith: JSON.stringify(hadith),
            dorm1: JSON.stringify(getDorm('dorm1')),
            dorm2: JSON.stringify(getDorm('dorm2')),
            announcements: JSON.stringify(getListValues('announcement-input')),
            gallery_links: JSON.stringify(getListValues('gallery-input')),
            quotes: JSON.stringify(getListValues('quote-input')),
            exam_config: JSON.stringify({
                name: document.getElementById('exam-name').value,
                winners: examWinners.join('\n')
            })
        };

        // API'ye Gönder
        await fetch('/api/save-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: CURRENT_SLUG,
                password: CURRENT_PASSWORD,
                config: newConfig
            })
        });

        showMessage('✅ Tüm veriler başarıyla kaydedildi!', 'success');

    } catch (error) {
        console.error('Kaydetme hatası:', error);
        showMessage('❌ Kaydetme sırasında hata oluştu!', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Kaydet';
    }
});

// Sayfa yüklendiğinde verileri yükle
window.addEventListener('DOMContentLoaded', loadData);
