console.log("Admin paneli yüklendi.");

// Sayfa yüklendiğinde mevcut verileri getir
window.addEventListener('input', () => {
    // Değişiklik oldu mu?
});

async function loadData() {
    try {
        const res = await fetch('/api/get-config');
        const config = await res.json();

        // --- Load Data Fixes ---
        document.getElementById('video_url').value = config.video_url || ''; // Fix: Allow blank
        if (config.marquee_text) document.getElementById('marquee_text').value = config.marquee_text;

        if (config.exam_config) {
            const ec = (typeof config.exam_config === 'string') ? JSON.parse(config.exam_config) : config.exam_config;
            document.getElementById('exam_name').value = ec.name || '';

            // Winners Parsing (Simple Check)
            const w = ec.winners || '';
            // Beklenen: "5.Sınıf, Ali, 100\n6.Sınıf, Veli, 200..."
            const lines = w.split('\n');
            lines.forEach(line => {
                if (line.includes('5.Sınıf')) document.getElementById('winner_5').value = line.split(',').slice(1).join(',').trim();
                if (line.includes('6.Sınıf')) document.getElementById('winner_6').value = line.split(',').slice(1).join(',').trim();
                if (line.includes('7.Sınıf')) document.getElementById('winner_7').value = line.split(',').slice(1).join(',').trim();
                if (line.includes('8.Sınıf')) document.getElementById('winner_8').value = line.split(',').slice(1).join(',').trim();
            });
        } else if (config.exam_results) {
            // Eski veri desteği (Migration) - Bu kısım artık winner_X inputları için geçerli değil, kaldırılabilir veya güncellenebilir.
            // Şimdilik sadece exam_config'i kontrol ediyoruz.
        }

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

        if (config.hadith) {
            const h = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;
            document.getElementById('hadith_text').value = h.text || '';
            document.getElementById('hadith_arabic').value = h.arabic || '';
            document.getElementById('hadith_week').value = h.week || '';
        }

        if (config.menu) {
            const m = (typeof config.menu === 'string') ? JSON.parse(config.menu) : config.menu;
            if (Array.isArray(m)) {
                if (m[0]) document.getElementById('menu_1').value = m[0];
                if (m[1]) document.getElementById('menu_2').value = m[1];
                if (m[2]) document.getElementById('menu_3').value = m[2];
                if (m[3]) document.getElementById('menu_4').value = m[3];
            }
        }

        if (config.announcements) {
            const a = (typeof config.announcements === 'string') ? JSON.parse(config.announcements) : config.announcements;
            // Şimdilik sadece tek duyuru varsayımı veya array ise ilkini textareaya bas
            if (Array.isArray(a) && a.length > 0) document.getElementById('announcements').value = a[0];
            else document.getElementById('announcements').value = a || '';
        }

    } catch (e) {
        console.error("Veri yükleme hatası", e);
    }
}
// --- DOSYA YÖNETİMİ ---
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

// İlk yükleme
loadData();
listFiles();

document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn');
    btn.innerText = "Kaydediliyor...";

    // Verileri Topla
    const menuArr = [
        document.getElementById('menu_1').value,
        document.getElementById('menu_2').value,
        document.getElementById('menu_3').value,
        document.getElementById('menu_4').value
    ].filter(i => i.trim() !== "");

    const updates = [
        { key: 'video_url', value: document.getElementById('video_url').value },
        { key: 'marquee_text', value: document.getElementById('marquee_text').value },
        { key: 'announcements', value: JSON.stringify([document.getElementById('announcements').value]) }, // Array olarak saklayalım
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
        {
            key: 'exam_config', value: JSON.stringify({
                name: document.getElementById('exam_name').value,
                winners: [
                    document.getElementById('winner_5') ? `5.Sınıf, ${document.getElementById('winner_5').value}` : '',
                    document.getElementById('winner_6') ? `6.Sınıf, ${document.getElementById('winner_6').value}` : '',
                    document.getElementById('winner_7') ? `7.Sınıf, ${document.getElementById('winner_7').value}` : '',
                    document.getElementById('winner_8') ? `8.Sınıf, ${document.getElementById('winner_8').value}` : ''
                ].filter(s => s.split(',')[1].trim() !== '').join('\n')
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

    try {
        // Her bir anahtar için API çağrısı (Upsert)
        // Promise.all ile paralel gönder
        await Promise.all(updates.map(item =>
            fetch('/api/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            })
        ));

        alert("Başarıyla Kaydedildi! ✅");
        btn.innerHTML = "<span>💾 Kaydet</span>";
    } catch (error) {
        console.error(error);
        alert("Hata oluştu!");
        btn.innerText = "Hata!";
    }
});
