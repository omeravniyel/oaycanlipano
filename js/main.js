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
            const hadith = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;
            if (hadith.text) {
                document.getElementById('hadith-content').innerText = hadith.text;
                document.getElementById('hadith-content').classList.remove('hidden');
                document.getElementById('hadith-image').classList.add('hidden');
            }
            // TODO: Resim varsa göster mantığı eklenecek
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

        // Duyurular
        let announcements = config.announcements || [];
        if (typeof announcements === 'string') announcements = JSON.parse(announcements);
        if (Array.isArray(announcements) && announcements.length > 0) {
            announcements.forEach(a => infoData.push({ title: "DUYURU", content: a }));
        } else if (announcements && !Array.isArray(announcements)) {
            infoData.push({ title: "DUYURU", content: announcements });
        }

        // Sınav Sonuçları
        if (config.exam_results) {
            infoData.push({ title: "KDU SONUCU", content: config.exam_results });
        }

        // Yemek Menüsü
        let menu = config.menu || [];
        if (typeof menu === 'string') menu = JSON.parse(menu);
        if (Array.isArray(menu) && menu.length > 0) {
            const menuText = menu.join(" - ");
            infoData.push({ title: "GÜNÜN MENÜSÜ", content: menuText });
        }

        // Eğer veri yoksa varsayılan ekle
        if (infoData.length === 0) {
            infoData.push({ title: "BİLGİ", content: "Sistem hazır. Veri bekleniyor..." });
            // Veri olmasa da döngü başlasın diye
            rotateInfo();
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

    // Progress bar reset
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';

    setTimeout(() => {
        // Data update
        const item = infoData[infoIndex];
        infoTitleEl.innerText = item.title;
        infoContentEl.innerText = item.content;

        // Fade in
        container.style.opacity = '1';

        // Progress bar animate
        setTimeout(() => {
            progressBar.style.transition = 'width 5s linear';
            progressBar.style.width = '100%';
        }, 50);

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
