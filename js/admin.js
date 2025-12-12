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
loadData();

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
        { key: 'hadith', value: JSON.stringify({ text: document.getElementById('hadith_text').value, img: null }) },
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
