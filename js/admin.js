import { createClient } from '@supabase/supabase-js'

// Supabase Yapılandırması
const supabaseUrl = 'https://oayedbausnwdbyubwuhs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9heWVkYmF1c253ZGJ5dWJ3dWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NDEwNTcsImV4cCI6MjA0OTUxNzA1N30.s-FjBwJ_yTQ2g0oIqGDWz1OQ8lK8sE2xT-s5QWkZ0'
const supabase = createClient(supabaseUrl, supabaseKey)

// --- Load Data ---
async function loadData() {
    try {
        const res = await fetch('/api/get-config');
        const config = await res.json();

        // Video & Marquee
        document.getElementById('video_url').value = config.video_url || '';
        document.getElementById('marquee_text').value = config.marquee_text || '';

        // Exam Config (Sınıf Birincileri)
        if (config.exam_config) {
            const ec = (typeof config.exam_config === 'string') ? JSON.parse(config.exam_config) : config.exam_config;
            document.getElementById('exam_name').value = ec.name || '';

            // Winners Parsing (5.Sınıf, Ali...)
            const w = ec.winners || '';
            const lines = w.split('\n');
            lines.forEach(line => {
                if (line.includes('5.Sınıf')) document.getElementById('winner_5').value = line.split(',')[1].trim();
                if (line.includes('6.Sınıf')) document.getElementById('winner_6').value = line.split(',')[1].trim();
                if (line.includes('7.Sınıf')) document.getElementById('winner_7').value = line.split(',')[1].trim();
                if (line.includes('8.Sınıf')) document.getElementById('winner_8').value = line.split(',')[1].trim();
            });
        }

        // Winning Dorms (Kazanan Yurtlar)
        if (config.winning_dorms) {
            const wd = (typeof config.winning_dorms === 'string') ? JSON.parse(config.winning_dorms) : config.winning_dorms;

            // Dorm 1
            if (wd.dorm1) {
                document.getElementById('dorm1_name').value = wd.dorm1.name || '';
                document.getElementById('dorm1_count').value = wd.dorm1.count || '';
                document.getElementById('dorm1_s1').value = wd.dorm1.s1 || '';
                document.getElementById('dorm1_s2').value = wd.dorm1.s2 || '';
                document.getElementById('dorm1_s3').value = wd.dorm1.s3 || '';
                document.getElementById('dorm1_s4').value = wd.dorm1.s4 || '';
                document.getElementById('dorm1_s5').value = wd.dorm1.s5 || '';
                document.getElementById('dorm1_s6').value = wd.dorm1.s6 || '';
            }
            // Dorm 2
            if (wd.dorm2) {
                document.getElementById('dorm2_name').value = wd.dorm2.name || '';
                document.getElementById('dorm2_count').value = wd.dorm2.count || '';
                document.getElementById('dorm2_s1').value = wd.dorm2.s1 || '';
                document.getElementById('dorm2_s2').value = wd.dorm2.s2 || '';
                document.getElementById('dorm2_s3').value = wd.dorm2.s3 || '';
                document.getElementById('dorm2_s4').value = wd.dorm2.s4 || '';
                document.getElementById('dorm2_s5').value = wd.dorm2.s5 || '';
                document.getElementById('dorm2_s6').value = wd.dorm2.s6 || '';
            }
        }

        // Hadis
        if (config.hadith) {
            const h = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;
            document.getElementById('hadith_text').value = h.text || '';
            document.getElementById('hadith_arabic').value = h.arabic || '';
            document.getElementById('hadith_week').value = h.week || '';
        }

        // Yemek Menüsü
        if (config.menu) {
            const m = (typeof config.menu === 'string') ? JSON.parse(config.menu) : config.menu;
            if (Array.isArray(m)) {
                if (m[0]) document.getElementById('menu_1').value = m[0];
                if (m[1]) document.getElementById('menu_2').value = m[1];
                if (m[2]) document.getElementById('menu_3').value = m[2];
                if (m[3]) document.getElementById('menu_4').value = m[3];
            }
        }

        // Duyurular
        if (config.announcements) {
            const a = (typeof config.announcements === 'string') ? JSON.parse(config.announcements) : config.announcements;
            if (Array.isArray(a) && a.length > 0) document.getElementById('announcements').value = a[0];
            else document.getElementById('announcements').value = a || '';
        }

    } catch (e) {
        console.error("Veri yükleme hatası", e);
    }
}

// --- FILE UPLOAD (Galeri & Sol Galeri) ---
let currentBucket = 'galeri';

window.switchTab = async function (bucket) {
    currentBucket = bucket;
    // UI Güncelle
    document.getElementById('tab-galeri').className = bucket === 'galeri'
        ? "flex-1 py-1 bg-blue-600 text-white rounded shadow text-sm font-bold"
        : "flex-1 py-1 bg-gray-200 text-gray-700 rounded text-sm font-bold";

    document.getElementById('tab-sol_galeri').className = bucket === 'sol_galeri'
        ? "flex-1 py-1 bg-blue-600 text-white rounded shadow text-sm font-bold"
        : "flex-1 py-1 bg-gray-200 text-gray-700 rounded text-sm font-bold";

    await listFiles();
}

async function listFiles() {
    const listContainer = document.getElementById('file-list');
    listContainer.innerHTML = '<div class="text-center text-gray-400 col-span-3 py-4 text-xs">Yükleniyor...</div>';

    try {
        const { data, error } = await supabase.storage.from(currentBucket).list();

        if (error) {
            console.error(error);
            listContainer.innerHTML = '<div class="text-center text-red-400 col-span-3 py-4 text-xs">Hata oluştu.</div>';
            return;
        }

        listContainer.innerHTML = '';
        if (data.length === 0) {
            listContainer.innerHTML = '<div class="text-center text-gray-400 col-span-3 py-4 text-xs">Dosya yok.</div>';
            return;
        }

        data.forEach(file => {
            // URL oluştur
            const { data: { publicUrl } } = supabase.storage.from(currentBucket).getPublicUrl(file.name);

            const div = document.createElement('div');
            div.className = "relative group aspect-square bg-gray-100 rounded overflow-hidden border";
            div.innerHTML = `
                <img src="${publicUrl}" class="w-full h-full object-cover">
                <button onclick="deleteFile('${file.name}')" class="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition">
                    🗑️
                </button>
            `;
            listContainer.appendChild(div);
        });

    } catch (e) {
        console.error(e);
    }
}

window.deleteFile = async function (fileName) {
    if (!confirm("Bu dosyayı silmek istediğinize emin misiniz?")) return;

    try {
        const { error } = await supabase.storage.from(currentBucket).remove([fileName]);
        if (error) throw error;
        await listFiles();
    } catch (e) {
        alert("Silme hatası: " + e.message);
    }
}

document.getElementById('upload-btn').addEventListener('click', async () => {
    const files = document.getElementById('file_input').files;
    const status = document.getElementById('upload-status');
    if (files.length === 0) return;

    status.innerText = "Yükleniyor...";

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

        try {
            const { error } = await supabase.storage.from(currentBucket).upload(fileName, file);
            if (error) throw error;
        } catch (e) {
            console.error(e);
            alert(`"${file.name}" yüklenemedi: ` + e.message);
        }
    }

    status.innerText = "Yükleme tamamlandı.";
    document.getElementById('file_input').value = ""; // Reset
    await listFiles();
});

// --- SAVE BUTTON ---
document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn');
    const originalText = btn.innerText;
    btn.innerText = "Kaydediliyor...";
    btn.disabled = true;

    try {
        // Menu Array
        const menuArr = [
            document.getElementById('menu_1').value,
            document.getElementById('menu_2').value,
            document.getElementById('menu_3').value,
            document.getElementById('menu_4').value
        ].filter(i => i.trim() !== "");

        // Exam Winners String Construction
        const winnersList = [
            document.getElementById('winner_5').value ? `5.Sınıf, ${document.getElementById('winner_5').value}` : null,
            document.getElementById('winner_6').value ? `6.Sınıf, ${document.getElementById('winner_6').value}` : null,
            document.getElementById('winner_7').value ? `7.Sınıf, ${document.getElementById('winner_7').value}` : null,
            document.getElementById('winner_8').value ? `8.Sınıf, ${document.getElementById('winner_8').value}` : null
        ].filter(Boolean).join('\n');

        const updates = [
            { key: 'video_url', value: document.getElementById('video_url').value },
            { key: 'marquee_text', value: document.getElementById('marquee_text').value },
            { key: 'announcements', value: JSON.stringify([document.getElementById('announcements').value]) },
            { key: 'menu', value: JSON.stringify(menuArr) },
            {
                key: 'hadith', value: JSON.stringify({
                    text: document.getElementById('hadith_text').value,
                    arabic: document.getElementById('hadith_arabic').value,
                    week: document.getElementById('hadith_week').value,
                    img: null
                })
            },
            {
                key: 'exam_config', value: JSON.stringify({
                    name: document.getElementById('exam_name').value,
                    winners: winnersList
                })
            },
            {
                key: 'winning_dorms', value: JSON.stringify({
                    dorm1: {
                        name: document.getElementById('dorm1_name').value,
                        count: document.getElementById('dorm1_count').value,
                        s1: document.getElementById('dorm1_s1').value,
                        s2: document.getElementById('dorm1_s2').value,
                        s3: document.getElementById('dorm1_s3').value,
                        s4: document.getElementById('dorm1_s4').value,
                        s5: document.getElementById('dorm1_s5').value,
                        s6: document.getElementById('dorm1_s6').value
                    },
                    dorm2: {
                        name: document.getElementById('dorm2_name').value,
                        count: document.getElementById('dorm2_count').value,
                        s1: document.getElementById('dorm2_s1').value,
                        s2: document.getElementById('dorm2_s2').value,
                        s3: document.getElementById('dorm2_s3').value,
                        s4: document.getElementById('dorm2_s4').value,
                        s5: document.getElementById('dorm2_s5').value,
                        s6: document.getElementById('dorm2_s6').value
                    }
                })
            }
        ];

        // API Call
        await Promise.all(updates.map(item =>
            fetch('/api/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            })
        ));

        alert("Başarıyla kaydedildi!");
    } catch (e) {
        console.error(e);
        alert("Kaydetme hatası: " + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// Init
loadData();
listFiles();
