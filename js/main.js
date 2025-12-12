// js/main.js
console.log("Pano uygulaması başlatılıyor...");

// --- Saat & Tarih & Hicri Güncelleme (Her Saniye) ---
function updateClock() {
    const now = new Date();

    // Saat
    document.getElementById('clock').innerText = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // Miladi Tarih
    document.getElementById('date').innerText = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });

    // Hicri Tarih (JS Intl API)
    try {
        const hijriDate = new Intl.DateTimeFormat('tr-TR-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric' // "1446"
        }).format(now);
        // "12 Recep 1446" gibi formatlar verir. Bazı tarayıcılarda "12 Recep 1446 AH" yazar. "AH" kısmını silebiliriz.
        document.getElementById('hijri-date').innerText = hijriDate.replace(' AH', '').replace('Hicri', '').trim();
    } catch (e) {
        document.getElementById('hijri-date').innerText = "Hicri Takvim";
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- Konfigürasyon Çekme ve UI Güncelleme ---
let infoData = [];
let infoIndex = 0;

// Verileri API'den Çek
async function fetchConfig() {
    try {
        const res = await fetch('/api/get-config');
        const config = await res.json();

        // --- 1. Video Ayarla ---
        if (config.video_url && player && typeof player.loadVideoById === 'function') {
            player.loadVideoById(config.video_url);
        }

        // --- 2. Marquee ---
        if (config.marquee_text) {
            document.getElementById('marquee-text').innerHTML = config.marquee_text;
        }

        // --- 3. Temiz Oda ---
        if (config.clean_room) {
            const cr = (typeof config.clean_room === 'string') ? JSON.parse(config.clean_room) : config.clean_room;
            document.getElementById('winner1').innerText = cr.room1 || '---';
            document.getElementById('winner2').innerText = cr.room2 || '---';
        }

        // --- 4. Hadis ---
        if (config.hadith) {
            const h = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;

            // Türkçe Metin
            document.getElementById('hadith-content').innerHTML = `
                <span class="absolute -top-4 -left-1 text-5xl text-emerald-200 font-serif-tr opacity-50">“</span>
                ${h.text || ''}
                <span class="absolute -bottom-6 -right-1 text-5xl text-emerald-200 font-serif-tr opacity-50">”</span>
            `;

            // Arapça Metin
            const arabDiv = document.getElementById('hadith-arabic');
            arabDiv.innerText = h.arabic || '';
            if (!h.arabic) arabDiv.style.display = 'none';
            else arabDiv.style.display = 'block';

            // Hafta Bilgisi
            document.getElementById('hadith-week').innerText = h.week || '';

            // Görsel Kontrolü
            if (h.img) {
                document.getElementById('hadith-image').src = h.img;
                document.getElementById('hadith-image').classList.remove('hidden');
                document.getElementById('hadith-content').classList.add('hidden');
                document.getElementById('hadith-arabic').classList.add('hidden');
            } else {
                document.getElementById('hadith-image').classList.add('hidden');
                document.getElementById('hadith-content').classList.remove('hidden');
                if (h.arabic) document.getElementById('hadith-arabic').classList.remove('hidden');
            }
        }

        // --- 5. Bilgi Kartı Rotasyonu İçin Veri Hazırla ---
        infoData = [];

        // A) Duyurular
        let announcements = config.announcements || [];
        if (typeof announcements === 'string') announcements = JSON.parse(announcements);
        if (Array.isArray(announcements)) {
            announcements.forEach(a => infoData.push({
                type: 'duyuru',
                title: 'DUYURULAR',
                badge: 'GÜNCEL',
                circle: '📢',
                topLabel: 'GENEL BİLGİLENDİRME',
                content: a
            }));
        }

        // B) Sınav Sonuçları
        if (config.exam_config) {
            let ec = config.exam_config;
            if (typeof ec === 'string') ec = JSON.parse(ec);

            const examName = ec.name || 'DENEME SINAVI';
            const winnersRaw = ec.winners || '';

            // Satır satır ayır
            const lines = winnersRaw.split('\n').filter(l => l.trim() !== '');

            lines.forEach(line => {
                // Beklenen: "7.Sınıf, Ahmet Yılmaz, 463"
                const parts = line.split(',');
                if (parts.length >= 3) {
                    infoData.push({
                        type: 'exam',
                        title: examName,
                        badge: `${parts[2].trim()} PUAN`, // Puan Badge'de
                        circle: parts[0].trim(), // Sınıf Dairede
                        topLabel: 'SINIF BİRİNCİSİ',
                        content: parts[1].trim() // İsim Ana Metinde
                    });
                }
            });
        }
        // Geriye dönük uyumluluk (Eski tek satır veri)
        else if (config.exam_results) {
            let examData = config.exam_results;
            if (examData.includes(',')) {
                const parts = examData.split(',');
                if (parts.length >= 3) {
                    infoData.push({
                        type: 'exam',
                        title: 'KDU SONUÇLARI',
                        badge: parts[2].trim() + ' Puan',
                        circle: parts[0].trim(),
                        topLabel: 'BİRİNCİSİ',
                        content: parts[1].trim()
                    });
                }
            }
        }

        // C) Yemek Menüsü
        let menu = config.menu || [];
        if (typeof menu === 'string') menu = JSON.parse(menu);
        if (Array.isArray(menu) && menu.length > 0) {
            const menuText = menu.join(" • ");
            infoData.push({ type: 'menu', title: 'YEMEK MENÜSÜ', badge: 'AFİYET OLSUN', circle: '🍽️', topLabel: 'GÜNÜN MENÜSÜ', content: menuText });
        }

        // Veri yoksa
        if (infoData.length === 0) {
            infoData.push({ type: 'duyuru', title: 'Hoşgeldiniz', badge: 'Sistem', circle: '👋', topLabel: 'DURUM', content: "Veri bekleniyor..." });
        }

    } catch (error) {
        console.error("Veri çekme hatası:", error);
        // Başlangıçta verileri çek
        fetchConfig();
        // Her 10 saniyede bir verileri güncelle (Admin'de yapılan değişiklikler hızlı yansısın)
        setInterval(fetchConfig, 10000);

        // Start Rotation
        rotateInfo();
        setInterval(rotateInfo, 5500);
    }
}

function rotateInfo() {
    if (infoData.length === 0) return;

    // Fade out
    const container = document.getElementById('info-carousel');
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';

    setTimeout(() => {
        const item = infoData[infoIndex];

        // DOM Elements
        document.getElementById('info-title').innerText = item.title;
        document.getElementById('info-badge').innerText = item.badge;
        document.getElementById('info-circle-badge').innerText = item.circle;

        // Circle Style & Text Adjustments based on Type
        const circle = document.getElementById('info-circle-badge');
        if (item.type === 'exam') {
            circle.style.fontSize = '0.9rem'; // Smaller for text like "7.Sınıf"
            circle.classList.remove('bg-blue-500', 'bg-green-500');
            circle.classList.add('bg-yellow-500');
        } else {
            circle.style.fontSize = '1.5rem'; // Emoji size
            circle.classList.remove('bg-yellow-500');
            circle.classList.add(item.type === 'menu' ? 'bg-green-500' : 'bg-blue-500');
        }

        document.getElementById('info-top-label').innerText = item.topLabel; // "BİRİNCİSİ"
        document.getElementById('info-main-text').innerText = item.content; // Name or Message

        // Fade in
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';

        infoIndex = (infoIndex + 1) % infoData.length;

    }, 500);
}

// Başlangıçta verileri çek
fetchConfig();


// --- YOUTUBE API ---
var player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        videoId: 'dQw4w9WgXcQ', // Placeholder, API'den güncellenecek
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'mute': 1, // Otomatik oynatma için sessiz başlamalı
            'loop': 1,
            'playlist': 'dQw4w9WgXcQ'
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        // Video bittiğinde slayta geç
        // TODO: Slayt mantığını entegre et
        // Şimdilik tekrar başa alalım (Hybrid döngü henüz kurgulanmadı)
        player.playVideo();
    }
}
