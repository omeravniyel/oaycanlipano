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

        // --- 1. Galeri & Video Ayarla ---
        // Önce resimleri çekelim (Eğer boşsa)
        if (galleryImages.length === 0) await fetchGalleryImages();

        let newVideoId = config.video_url || null;
        // ID parse
        if (newVideoId) {
            if (newVideoId.includes('v=')) newVideoId = newVideoId.split('v=')[1].split('&')[0];
            else if (newVideoId.includes('youtu.be/')) newVideoId = newVideoId.split('youtu.be/')[1];
            else if (newVideoId.includes('embed/')) newVideoId = newVideoId.split('embed/')[1];
        }

        // Değişim var mı?
        if (newVideoId !== videoId) {
            videoId = newVideoId;
            // State Yenile
            if (videoId) switchMedia('video');
            else switchMedia('slide');
        } else if (currentMediaState === 'none') {
            // İlk açılış
            if (videoId) switchMedia('video');
            else switchMedia('slide');
        }

        // --- 3. Kazanan Yatakhane ---
        if (config.winning_dorm) {
            const wd = (typeof config.winning_dorm === 'string') ? JSON.parse(config.winning_dorm) : config.winning_dorm;
            document.getElementById('dorm-name').innerText = wd.name ? (wd.name + " NOLU ODA") : '---';
            document.getElementById('dorm-count').innerText = wd.count ? (wd.count + ". KEZ") : '';

            document.getElementById('dorm-s1').innerText = wd.s1 || '';
            document.getElementById('dorm-s2').innerText = wd.s2 || '';
            document.getElementById('dorm-s3').innerText = wd.s3 || '';
            document.getElementById('dorm-s4').innerText = wd.s4 || '';
            document.getElementById('dorm-s5').innerText = wd.s5 || '';
            document.getElementById('dorm-s6').innerText = wd.s6 || '';
        } else if (config.clean_room) {
            // Eski Veri Desteği (Opsiyonel, geçici olarak boş bırakılabilir ya da eski veriyi uydurabiliriz)
            // Yeni tasarım çok farklı olduğu için eski veriyi göstermeyelim.
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
// --- YOUTUBE & HYBRID LOOP ---
var player;
var galleryImages = [];
var currentMediaState = 'none'; // 'video', 'slide'
var videoId = null;
var slideIntervalHandle = null;

// Galeriyi Çek (Yerel klasörden)
async function fetchGalleryImages() {
    try {
        const res = await fetch('/api/get-gallery');
        const data = await res.json();
        galleryImages = data.images || [];

        // Swiper Wrapper Güncelle
        const wrapper = document.getElementById('slide-wrapper');
        wrapper.innerHTML = '';
        galleryImages.forEach(url => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide flex items-center justify-center bg-gradient-to-br from-orange-400 via-red-400 to-pink-400';
            slide.innerHTML = `<img src="${url}" class="w-full h-full object-contain" />`;
            wrapper.appendChild(slide);
        });

        console.log('Galeri görselleri yüklendi:', galleryImages.length);

    } catch (e) {
        console.error("Galeri hatası", e);
    }
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: { 'autoplay': 0, 'controls': 0, 'mute': 0 },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        // Video bitti, Slider'a geç
        switchMedia('slide');
    }
}

// Medya Döngü Kontrolü
function switchMedia(mode) {
    const playerEl = document.getElementById('player');
    const swiperEl = document.querySelector('.mySwiper');

    // Temizle
    if (slideIntervalHandle) clearInterval(slideIntervalHandle);

    if (mode === 'video' && videoId) {
        // Video Modu
        currentMediaState = 'video';
        swiperEl.classList.add('hidden');
        // playerEl görünürlüğü YouTube iframe tarafından yönetilir ama wrapper row/col
        // Youtube API'sini resetle play
        if (player && typeof player.playVideo === 'function') {
            player.loadVideoById(videoId);
            player.playVideo();
        }

    } else if (mode === 'slide' && galleryImages.length > 0) {
        // Slayt Modu
        currentMediaState = 'slide';
        swiperEl.classList.remove('hidden');
        if (player && typeof player.stopVideo === 'function') player.stopVideo();

        // Swiper Init (Eğer yoksa)
        if (!window.mySwiperInstance) {
            window.mySwiperInstance = new Swiper(".mySwiper", {
                spaceBetween: 30,
                effect: "fade",
                centeredSlides: true,
                autoplay: {
                    delay: 12000, // 12 Saniye
                    disableOnInteraction: false,
                },
                loop: true, // Sonsuz döngü
            });

            // Swiper sonuna gelince videoya dön (Eğer video varsa)
            window.mySwiperInstance.on('reachBeginning', () => {
                // Loop modunda reachEnd tetiklenmeyebilir, realIndex takibi gerekebilir
                // Basitlik için: Autoplay döngüsü yerine, bir tur bitince videoya dönmeye çalışalım
            });

            // Manuel süre kontrolü daha güvenli
        }

        // Video bitince galeri sürekli döner, videoya geri dönmez
        // Sadece video varsa ve kullanıcı manuel olarak değiştirmek isterse video tekrar oynar


    } else {
        // Fallback
        if (videoId) switchMedia('video');
        else if (galleryImages.length > 0) switchMedia('slide');
    }
}


// --- WEATHER API (Open-Meteo) ---
async function fetchWeather() {
    try {
        // Zeytinburnu Coordinats: 40.99, 28.90
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.99&longitude=28.90&current_weather=true');
        const data = await res.json();

        if (data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;

            // WMO Weather Codes to Text/Icon
            let desc = "AÇIK";
            let icon = "☀️";

            // Simple mapping
            if (code >= 1 && code <= 3) { desc = "PARÇALI BULUTLU"; icon = "⛅"; }
            else if (code >= 45 && code <= 48) { desc = "SİSLİ"; icon = "🌫️"; }
            else if (code >= 51 && code <= 67) { desc = "YAĞMURLU"; icon = "🌧️"; }
            else if (code >= 71 && code <= 77) { desc = "KARLI"; icon = "❄️"; }
            else if (code >= 80 && code <= 82) { desc = "SAĞANAK"; icon = "🌦️"; }
            else if (code >= 95) { desc = "FIRTINA"; icon = "⛈️"; }

            // DOM'da elementler varsa güncelle
            if (document.getElementById('weather-temp')) document.getElementById('weather-temp').innerText = `${temp}°`;
            if (document.getElementById('weather-desc')) document.getElementById('weather-desc').innerText = desc;
            if (document.getElementById('weather-icon')) document.getElementById('weather-icon').innerText = icon;
        }
    } catch (e) {
        console.error("Hava durumu hatası:", e);
    }
}

// Initial Fetch and Interval
fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000); // 30 Mins

// --- SOL GALERİ ROTASYONU ---
let leftGalleryImages = [];
let leftGalleryIndex = 0;
let leftGalleryTimeout = null;

// Sol galeri görsellerini yükle
async function fetchLeftGalleryImages() {
    try {
        const res = await fetch('/api/get-left-gallery');
        const data = await res.json();
        leftGalleryImages = data.images || [];

        // Eğer görseller varsa rotasyonu başlat
        if (leftGalleryImages.length > 0) {
            startLeftGalleryRotation();
        }
    } catch (error) {
        console.error('Sol galeri yükleme hatası:', error);
    }
}

// Sol galeri rotasyonunu başlat
function startLeftGalleryRotation() {
    if (leftGalleryImages.length === 0) return;

    // Mevcut timeout'u temizle
    if (leftGalleryTimeout) clearTimeout(leftGalleryTimeout);

    // Görseli göster
    showLeftGalleryImage();
}

// Görseli göster (Tek kutu)
function showLeftGalleryImage() {
    const galleryContainer = document.getElementById('left-gallery-container');
    const galleryImage = document.getElementById('left-gallery-image');
    const normalContent = document.getElementById('left-normal-content');

    // Mevcut görseli al
    const currentImage = leftGalleryImages[leftGalleryIndex];

    // Görseli ayarla
    galleryImage.src = currentImage;

    // Galeri container'ını göster, normal içeriği gizle
    galleryContainer.classList.remove('hidden');
    normalContent.classList.add('hidden');

    // Sonraki görsele geç
    leftGalleryIndex++;

    // Eğer tüm görseller gösterildiyse
    if (leftGalleryIndex >= leftGalleryImages.length) {
        // 10 saniye sonra galeriyi gizle
        leftGalleryTimeout = setTimeout(() => {
            galleryContainer.classList.add('hidden');
            normalContent.classList.remove('hidden');

            // 20 saniye bekle, sonra tekrar başla
            leftGalleryTimeout = setTimeout(() => {
                leftGalleryIndex = 0;
                showLeftGalleryImage();
            }, 20000); // 20 saniye bekleme
        }, 10000); // Son görseli 10 saniye göster
    } else {
        // 10 saniye sonra bir sonraki görseli göster
        leftGalleryTimeout = setTimeout(showLeftGalleryImage, 10000);
    }
}

// Sayfa yüklendiğinde sol galeriyi başlat
fetchLeftGalleryImages();
