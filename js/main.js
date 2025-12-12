// js/main.js
console.log("Pano uygulaması başlatılıyor...");

// --- SAAT GÜNCELLEME ---
function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('date').innerText = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

// --- TIKIR TIKIR DÖNEN BİLGİ KARTI ---
let infoData = [];
let infoIndex = 0;
const infoTitleEl = document.getElementById('info-title');
const infoContentEl = document.getElementById('info-content');
const progressBar = document.getElementById('info-progress');

// Verileri API'den Çek
async function fetchConfig() {
    try {
        const res = await fetch('/api/get-config');
        const config = await res.json();

        // --- 1. Header & Marquee ---
        if (config.marquee_text) {
            document.getElementById('marquee-text').innerText = config.marquee_text;
        }

        // --- 2. Hadis ---
        if (config.hadith) {
            const h = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;

            document.getElementById('hadith-content').innerHTML = `
                <span class="absolute -top-2 -left-2 text-4xl text-emerald-200 font-serif opacity-50">“</span>
                ${h.text || ''}
                <span class="absolute -bottom-4 -right-2 text-4xl text-emerald-200 font-serif opacity-50">”</span>
            `;

            document.getElementById('hadith-arabic').innerText = h.arabic || '';
            document.getElementById('hadith-week').innerText = h.week || '';

            if (h.img) {
                document.getElementById('hadith-image').src = h.img;
                document.getElementById('hadith-image').classList.remove('hidden');
                document.getElementById('hadith-content').classList.add('hidden');
                document.getElementById('hadith-arabic').classList.add('hidden');
            }
        }

        // --- 3. Temiz Oda ---
        if (config.clean_room) {
            const cleanRoom = (typeof config.clean_room === 'string') ? JSON.parse(config.clean_room) : config.clean_room;
            document.getElementById('winner1').innerText = cleanRoom.room1 || '---';
            document.getElementById('winner2').innerText = cleanRoom.room2 || '---';
        }

        // --- 4. Video ID ---
        if (config.video_url && player && player.loadVideoById) {
            // Basit ID ayıklama (Youtube linkinden ID alma mantığı gerekebilir, şimdilik direkt ID varsayalım veya parse edelim)
            let videoId = config.video_url;
            if (videoId.includes('v=')) videoId = videoId.split('v=')[1].split('&')[0];
            else if (videoId.includes('youtu.be/')) videoId = videoId.split('youtu.be/')[1];
            else if (videoId.includes('embed/')) videoId = videoId.split('embed/')[1];

            player.loadVideoById(videoId);
        }

        // --- 5. Bilgi Kartı Rotasyonu İçin Veri Hazırla ---
        infoData = [];

        // A) Duyurular (Basit Metin)
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

        // B) Sınav Sonuçları / Birinciler
        // Beklenen Format: "7.Sınıf - Ahmet Yılmaz - 463 Puan" veya JSON
        // Şimdilik string gelirse parse etmeye çalışalım
        if (config.exam_results) {
            // Örnek: "7.Sınıf,Ahmet Yılmaz,463"
            // Basitlik için tüm metni gösterelim, admin güncellenince burayı geliştiririz.
            let examData = config.exam_results;

            // Eğer virgülle ayrılmış veri gelirse ayrıştırıp özel formatta göster
            if (examData.includes(',')) {
                const parts = examData.split(',');
                if (parts.length >= 3) {
                    infoData.push({
                        type: 'exam',
                        title: 'KDU SONUÇLARI',
                        badge: 'GURURLARIMIZ',
                        circle: parts[0].trim(), // "7.Sınıf"
                        topLabel: 'BİRİNCİSİ', // "BİRİNCİSİ"
                        content: `${parts[2].trim()} Puan` // "463 Puan" & (İsim badge altında veya yanında kalabilir, tasarımda isim nerede? Screenshotta "---" var. Biz contente ismi, badge'e puanı veya tam tersini koyabiliriz.
                        // Tasarıma göre: Sarı Daire (Sınıf), Yanında "BİRİNCİSİ" label, Altında PUAN badge. İsim nerede?
                        // Screenshotta: Circle: "7.Sınıf", Label: "BİRİNCİSİ", Badge: "463 Puan", Büyük Text: "---" (Muhtemelen İsim)
                    });
                    // Düzeltme:
                    infoData.push({
                        type: 'exam',
                        title: 'KDU SONUÇLARI',
                        badge: 'GURURLARIMIZ',
                        circle: parts[0].trim(), // 7.Sınıf
                        topLabel: 'BİRİNCİSİ - ' + parts[2].trim() + ' Puan',
                        content: parts[1].trim() // İsim
                    });
                } else {
                    infoData.push({ type: 'duyuru', title: 'SINAV SONUCU', badge: 'TEBRİKLER', circle: '🏆', topLabel: 'SONUÇ', content: examData });
                }
            } else {
                infoData.push({ type: 'duyuru', title: 'SINAV SONUCU', badge: 'TEBRİKLER', circle: '🏆', topLabel: 'SONUÇ', content: examData });
            }
        }

        // C) Yemek Menüsü
        let menu = config.menu || [];
        if (typeof menu === 'string') menu = JSON.parse(menu);
        if (Array.isArray(menu) && menu.length > 0) {
            const menuText = menu.join(" • ");
            infoData.push({
                type: 'menu',
                title: 'YEMEK MENÜSÜ',
                badge: 'AFİYET OLSUN',
                circle: '🍽️',
                topLabel: 'GÜNÜN MENÜSÜ',
                content: menuText
            });
        }

        // Eğer veri yoksa varsayılan ekle
        if (infoData.length === 0) {
            infoData.push({ type: 'duyuru', title: 'Hoşgeldiniz', badge: 'Sistem', circle: '👋', topLabel: 'DURUM', content: "Veri bekleniyor..." });
        }

    } catch (error) {
        console.error("Veri çekme hatası:", error);
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
// Her 30 saniyede bir verileri güncelle (Admin'de yapılan değişiklikler yansısın)
setInterval(fetchConfig, 30000);

// Start Rotation
rotateInfo();
setInterval(rotateInfo, 5500);

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
