console.log("Admin paneli yüklendi.");

// Sayfa yüklendiğinde mevcut verileri getir
window.addEventListener('input', () => {
    // Değişiklik oldu mu?
});

async function loadData() {
    try {
        const res = await fetch('/api/get-config');
        const config = await res.json();

        if (config.video_url) document.getElementById('video_url').value = config.video_url;
        if (config.marquee_text) document.getElementById('marquee_text').value = config.marquee_text;
        if (config.exam_results) document.getElementById('exam_results').value = config.exam_results;

        if (config.clean_room) {
            const cr = (typeof config.clean_room === 'string') ? JSON.parse(config.clean_room) : config.clean_room;
            document.getElementById('clean_room_1').value = cr.room1 || '';
            document.getElementById('clean_room_2').value = cr.room2 || '';
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
        { key: 'exam_results', value: document.getElementById('exam_results').value },
        {
            key: 'hadith', value: JSON.stringify({
                text: document.getElementById('hadith_text').value,
                arabic: document.getElementById('hadith_arabic').value,
                week: document.getElementById('hadith_week').value,
                img: null
            })
        },
        {
            key: 'clean_room', value: JSON.stringify({
                room1: document.getElementById('clean_room_1').value,
                room2: document.getElementById('clean_room_2').value
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
