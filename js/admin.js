import { createClient } from '@supabase/supabase-js'

// --- KONFIGURASYON ---
const supabaseUrl = 'https://oayedbausnwdbyubwuhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9heWVkYmF1c253ZGJ5dWJ3dWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NDEwNTcsImV4cCI6MjA0OTUxNzA1N30.s-FjBwJ_yTQ2g0oIqGDWz1OQ8lK8sE2xT-s5QWkZ0';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- GLOBAL DEGISKENLER ---
let currentBucket = 'galeri';

// --- YUKLEME FONKSIYONU (Sayfa Acilinca) ---
async function loadData() {
    try {
        console.log("Veriler yükleniyor...");
        const res = await fetch('/api/get-config');
        if (!res.ok) throw new Error('API hatası');

        const config = await res.json();
        console.log("Gelen Config:", config);

        // 1. Video & Marquee
        if (document.getElementById('video_url')) document.getElementById('video_url').value = config.video_url || '';
        if (document.getElementById('marquee_text')) document.getElementById('marquee_text').value = config.marquee_text || '';

        // 2. Duyurular
        if (document.getElementById('announcements')) {
            let ann = config.announcements || '';
            try { ann = JSON.parse(config.announcements); } catch (e) { }
            if (Array.isArray(ann)) ann = ann[0]; // İlkini al
            document.getElementById('announcements').value = ann || '';
        }

        // 3. Yemek Menüsü
        if (config.menu) {
            let m = config.menu;
            try { m = JSON.parse(m); } catch (e) { }
            if (Array.isArray(m)) {
                if (document.getElementById('menu_1')) document.getElementById('menu_1').value = m[0] || '';
                if (document.getElementById('menu_2')) document.getElementById('menu_2').value = m[1] || '';
                if (document.getElementById('menu_3')) document.getElementById('menu_3').value = m[2] || '';
                if (document.getElementById('menu_4')) document.getElementById('menu_4').value = m[3] || '';
            }
        }

        // 4. Hadis
        if (config.hadith) {
            let h = config.hadith;
            try { h = JSON.parse(h); } catch (e) { }
            if (document.getElementById('hadith_text')) document.getElementById('hadith_text').value = h.text || '';
            if (document.getElementById('hadith_arabic')) document.getElementById('hadith_arabic').value = h.arabic || '';
            if (document.getElementById('hadith_week')) document.getElementById('hadith_week').value = h.week || '';
        }

        // 5. Exam Config (Sınıf Birincileri)
        if (config.exam_config) {
            let ec = config.exam_config;
            try { ec = JSON.parse(ec); } catch (e) { }

            if (document.getElementById('exam_name')) document.getElementById('exam_name').value = ec.name || '';

            // Winners parse: "5.Sınıf, Ali\n6.Sınıf, Veli"
            if (ec.winners) {
                const lines = ec.winners.split('\n');
                lines.forEach(line => {
                    const parts = line.split(',');
                    if (parts.length < 2) return;

                    const cls = parts[0].trim();
                    const val = parts.slice(1).join(',').trim(); // Geri kalanı isim

                    if (cls.includes('5') && document.getElementById('winner_5')) document.getElementById('winner_5').value = val;
                    if (cls.includes('6') && document.getElementById('winner_6')) document.getElementById('winner_6').value = val;
                    if (cls.includes('7') && document.getElementById('winner_7')) document.getElementById('winner_7').value = val;
                    if (cls.includes('8') && document.getElementById('winner_8')) document.getElementById('winner_8').value = val;
                });
            }
        }

        // 6. Winning Dorms (Yurtlar)
        if (config.winning_dorms) {
            let wd = config.winning_dorms;
            try { wd = JSON.parse(wd); } catch (e) { }

            // Yurt 1
            if (wd.dorm1) {
                if (document.getElementById('dorm1_name')) document.getElementById('dorm1_name').value = wd.dorm1.name || '';
                if (document.getElementById('dorm1_count')) document.getElementById('dorm1_count').value = wd.dorm1.count || '';

                if (document.getElementById('dorm1_s1')) document.getElementById('dorm1_s1').value = wd.dorm1.s1 || '';
                if (document.getElementById('dorm1_s2')) document.getElementById('dorm1_s2').value = wd.dorm1.s2 || '';
                if (document.getElementById('dorm1_s3')) document.getElementById('dorm1_s3').value = wd.dorm1.s3 || '';
                if (document.getElementById('dorm1_s4')) document.getElementById('dorm1_s4').value = wd.dorm1.s4 || '';
                if (document.getElementById('dorm1_s5')) document.getElementById('dorm1_s5').value = wd.dorm1.s5 || '';
                if (document.getElementById('dorm1_s6')) document.getElementById('dorm1_s6').value = wd.dorm1.s6 || '';
            }

            // Yurt 2
            if (wd.dorm2) {
                if (document.getElementById('dorm2_name')) document.getElementById('dorm2_name').value = wd.dorm2.name || '';
                if (document.getElementById('dorm2_count')) document.getElementById('dorm2_count').value = wd.dorm2.count || '';

                if (document.getElementById('dorm2_s1')) document.getElementById('dorm2_s1').value = wd.dorm2.s1 || '';
                if (document.getElementById('dorm2_s2')) document.getElementById('dorm2_s2').value = wd.dorm2.s2 || '';
                if (document.getElementById('dorm2_s3')) document.getElementById('dorm2_s3').value = wd.dorm2.s3 || '';
                if (document.getElementById('dorm2_s4')) document.getElementById('dorm2_s4').value = wd.dorm2.s4 || '';
                if (document.getElementById('dorm2_s5')) document.getElementById('dorm2_s5').value = wd.dorm2.s5 || '';
                if (document.getElementById('dorm2_s6')) document.getElementById('dorm2_s6').value = wd.dorm2.s6 || '';
            }
        }

    } catch (e) {
        console.error("Yükleme Hatası:", e);
        alert("Veriler yüklenirken hata oluştu!");
    }
}

// --- KAYDETME FONKSIYONU ---
async function saveData() {
    const btn = document.getElementById('save-btn');
    const originalText = btn.innerText;

    try {
        btn.innerText = "Kaydediliyor...";
        btn.disabled = true;

        // 1. Menu
        const menuArr = [
            document.getElementById('menu_1')?.value || '',
            document.getElementById('menu_2')?.value || '',
            document.getElementById('menu_3')?.value || '',
            document.getElementById('menu_4')?.value || ''
        ].filter(x => x.trim() !== '');

        // 2. Exam Winners (Birlestirme)
        let winnersArr = [];
        if (document.getElementById('winner_5')?.value) winnersArr.push(`5.Sınıf, ${document.getElementById('winner_5').value}`);
        if (document.getElementById('winner_6')?.value) winnersArr.push(`6.Sınıf, ${document.getElementById('winner_6').value}`);
        if (document.getElementById('winner_7')?.value) winnersArr.push(`7.Sınıf, ${document.getElementById('winner_7').value}`);
        if (document.getElementById('winner_8')?.value) winnersArr.push(`8.Sınıf, ${document.getElementById('winner_8').value}`);

        const winnersStr = winnersArr.join('\n');

        // 3. Toplu Veri Paketi
        const updates = [
            { key: 'video_url', value: document.getElementById('video_url')?.value || '' },
            { key: 'marquee_text', value: document.getElementById('marquee_text')?.value || '' },
            { key: 'announcements', value: JSON.stringify([document.getElementById('announcements')?.value || '']) },
            { key: 'menu', value: JSON.stringify(menuArr) },
            {
                key: 'hadith', value: JSON.stringify({
                    text: document.getElementById('hadith_text')?.value || '',
                    arabic: document.getElementById('hadith_arabic')?.value || '',
                    week: document.getElementById('hadith_week')?.value || '',
                    img: null
                })
            },
            {
                key: 'exam_config', value: JSON.stringify({
                    name: document.getElementById('exam_name')?.value || '',
                    winners: winnersStr
                })
            },
            {
                key: 'winning_dorms', value: JSON.stringify({
                    dorm1: {
                        name: document.getElementById('dorm1_name')?.value || '',
                        count: document.getElementById('dorm1_count')?.value || '',
                        s1: document.getElementById('dorm1_s1')?.value || '',
                        s2: document.getElementById('dorm1_s2')?.value || '',
                        s3: document.getElementById('dorm1_s3')?.value || '',
                        s4: document.getElementById('dorm1_s4')?.value || '',
                        s5: document.getElementById('dorm1_s5')?.value || '',
                        s6: document.getElementById('dorm1_s6')?.value || ''
                    },
                    dorm2: {
                        name: document.getElementById('dorm2_name')?.value || '',
                        count: document.getElementById('dorm2_count')?.value || '',
                        s1: document.getElementById('dorm2_s1')?.value || '',
                        s2: document.getElementById('dorm2_s2')?.value || '',
                        s3: document.getElementById('dorm2_s3')?.value || '',
                        s4: document.getElementById('dorm2_s4')?.value || '',
                        s5: document.getElementById('dorm2_s5')?.value || '',
                        s6: document.getElementById('dorm2_s6')?.value || ''
                    }
                })
            }
        ];

        // 4. API Gonderimi
        await Promise.all(updates.map(item =>
            fetch('/api/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            })
        ));

        alert("Tüm veriler başarıyla kaydedildi! ✅");

    } catch (e) {
        console.error(e);
        alert("Kaydetme sırasında hata oluştu: " + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- DOSYA YONETIMI (Galeri) ---
window.switchTab = async function (bucket) {
    currentBucket = bucket;
    document.getElementById('tab-galeri').className = bucket === 'galeri' ?
        "flex-1 py-1 bg-blue-600 text-white rounded shadow text-sm font-bold" : "flex-1 py-1 bg-gray-200 text-gray-700 rounded text-sm font-bold";
    document.getElementById('tab-sol_galeri').className = bucket === 'sol_galeri' ?
        "flex-1 py-1 bg-blue-600 text-white rounded shadow text-sm font-bold" : "flex-1 py-1 bg-gray-200 text-gray-700 rounded text-sm font-bold";
    await listFiles();
}

async function listFiles() {
    const el = document.getElementById('file-list');
    el.innerHTML = '<div class="text-center text-xs text-gray-400 col-span-3">Yükleniyor...</div>';

    const { data, error } = await supabase.storage.from(currentBucket).list();
    if (error || !data) {
        el.innerHTML = '<div class="text-center text-xs text-red-500 col-span-3">Hata.</div>';
        return;
    }

    if (data.length === 0) {
        el.innerHTML = '<div class="text-center text-xs text-gray-400 col-span-3">Dosya yok.</div>';
        return;
    }

    el.innerHTML = '';
    data.forEach(f => {
        const url = supabase.storage.from(currentBucket).getPublicUrl(f.name).data.publicUrl;
        const div = document.createElement('div');
        div.className = "relative group aspect-square bg-gray-100 rounded overflow-hidden border";
        div.innerHTML = `
            <img src="${url}" class="w-full h-full object-cover">
            <button onclick="deleteFile('${f.name}')" class="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition">🗑️</button>
        `;
        el.appendChild(div);
    });
}

window.deleteFile = async function (name) {
    if (!confirm('Silinsin mi?')) return;
    await supabase.storage.from(currentBucket).remove([name]);
    await listFiles();
}

// Dosya Yukleme Event Listener
document.getElementById('upload-btn')?.addEventListener('click', async () => {
    const files = document.getElementById('file_input').files;
    if (!files.length) return;

    document.getElementById('upload-status').innerText = "Yükleniyor...";
    for (let f of files) {
        const name = `${Date.now()}_${f.name.replace(/[^a-z0-9.]/gi, '')}`;
        await supabase.storage.from(currentBucket).upload(name, f);
    }
    document.getElementById('upload-status').innerText = "Tamamlandı.";
    document.getElementById('file_input').value = "";
    await listFiles();
});

// Kaydet Butonu Event Listener
document.getElementById('save-btn')?.addEventListener('click', saveData);

// INIT
loadData();
listFiles();
