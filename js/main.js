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
let infoRotationInterval = null; // Bilgi kartı rotasyon interval'i

// Yatakhane isim rotasyonu için değişkenler
let dorm1Names = [];
let dorm2Names = [];
let dorm1NameIndex = 0;
let dorm2NameIndex = 0;
let dormNameRotationInterval = null;

// --- SOL GALERİ DEĞİŞKENLERİ ---
let leftGalleryImages = [];
let leftGalleryIndex = 0;
let leftGalleryTimeout = null;

// Verileri API'den Çek
async function fetchConfig() {
    try {
        // URL'den slug'ı al (örn: kartaltepe.com/omeravniyel -> slug: omeravniyel)
        const path = window.location.pathname;
        const slug = path.split('/')[1] || ''; // Boşsa varsayılanı API halleder

        if (!slug) {
            // --- ANA SAYFA (Landing Page) ---
            // --- ANA SAYFA (Landing Page - Electric Theme) ---
            document.body.innerHTML = `
                <style>
                    @keyframes move-background {
                        0% { background-position: 0 0; }
                        100% { background-position: 100% 100%; }
                    }
                    @keyframes pulse-glow {
                        0%, 100% { opacity: 0.3; }
                        50% { opacity: 0.6; }
                    }
                    .electric-bg {
                        background-color: #0B0E14;
                        background-image: 
                            linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px),
                            linear-gradient(rgba(0, 255, 255, 0.03) 2px, transparent 2px),
                            linear-gradient(90deg, rgba(0, 255, 255, 0.03) 2px, transparent 2px);
                        background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
                        animation: move-background 60s linear infinite;
                    }
                    .circuit-line {
                        position: absolute;
                        background: linear-gradient(90deg, transparent, #00d2ff, transparent);
                        height: 2px;
                        width: 100%;
                        opacity: 0;
                        animation: circuit-flow 4s ease-in-out infinite;
                    }
                    @keyframes circuit-flow {
                        0% { transform: translateX(-100%); opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { transform: translateX(100%); opacity: 0; }
                    }
                </style>

                <div class="h-screen w-full electric-bg flex flex-col items-center justify-center relative overflow-hidden text-white font-sans selection:bg-cyan-500 selection:text-white">
                    
                    <!-- Elektrik Hatları (Dekoratif) -->
                    <div class="absolute top-1/4 left-0 w-full opacity-20"><div class="circuit-line" style="animation-delay: 0s;"></div></div>
                    <div class="absolute top-3/4 left-0 w-full opacity-20"><div class="circuit-line" style="animation-duration: 7s; animation-delay: 2s;"></div></div>
                    <div class="absolute bottom-10 left-0 w-full opacity-10"><div class="circuit-line" style="animation-duration: 5s;"></div></div>
                    
                    <!-- Merkez Işık -->
                    <div class="absolute inset-0 bg-radial-gradient from-blue-900/40 to-transparent pointer-events-none"></div>

                    <!-- İçerik -->
                    <div class="z-10 flex flex-col items-center gap-6 animate-fade-in text-center p-4 relative">
                        
                        <!-- Logo -->
                        <div class="w-48 h-48 lg:w-64 lg:h-64 mb-6 relative group">
                            <div class="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse-glow"></div>
                            <img src="logo.png" class="relative w-full h-full object-contain brightness-0 invert drop-shadow-[0_0_20px_rgba(0,210,255,0.5)] transition duration-500 group-hover:scale-105 group-hover:drop-shadow-[0_0_30px_rgba(0,210,255,0.8)]">
                        </div>
                        
                        <!-- Başlık -->
                        <div class="space-y-4">
                            <h1 class="text-5xl lg:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-cyan-400 drop-shadow-sm font-serif-tr">
                                DİJİTAL PANO
                            </h1>
                            <p class="text-cyan-200/60 text-lg lg:text-xl tracking-[0.4em] font-light uppercase border-t border-cyan-900/50 pt-4">
                                Profesyonel Ekran Yönetimi
                            </p>
                        </div>

                        <!-- Buton Kaldırıldı -->
                        
                    </div>

                    <!-- Footer -->
                    <div class="absolute bottom-6 flex flex-col items-center gap-2 text-cyan-900/50 text-[10px] tracking-[0.2em] uppercase font-bold mix-blend-plus-lighter z-20">
                        <span>Created by Buğra Çopur</span>
                        <a href="mailto:bugracopur@gmail.com" class="hover:text-cyan-400 transition hover:underline decoration-cyan-500/30 underline-offset-4">
                            bugracopur@gmail.com
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        const res = await fetch(`/api/get-config?slug=${slug}`);

        if (res.status === 404) {
            let errInfo = {};
            try { errInfo = await res.json(); } catch (e) { }

            document.body.innerHTML = `
                <div class="flex flex-col items-center justify-center h-screen bg-slate-900 text-white font-sans">
                    <div class="text-6xl mb-4 animate-bounce">⚠️</div>
                    <h1 class="text-3xl font-bold mb-2">Kurum Bulunamadı</h1>
                    <p class="text-slate-400">Aradığınız <b>/${slug}</b> adresine ait bir kayıt bulunamadı.</p>
                    <a href="/" class="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition">Ana Sayfaya Dön</a>
                </div>`;
            return;
        }

        const config = await res.json();

        // Hava durumu için konumu global'e at
        window.configLocation = {
            city: config.city || 'Istanbul',
            district: config.district || 'Uskudar'
        };
        // Hemen hava durumunu güncelle
        fetchWeather();

        // --- 0. Header Bilgileri ---
        if (config.institution_title) document.getElementById('header-title').innerText = config.institution_title;
        else document.getElementById('header-title').innerText = 'ÖMER AVNİ YEL';

        if (config.institution_subtitle) document.getElementById('header-subtitle').innerText = config.institution_subtitle;
        else document.getElementById('header-subtitle').innerText = 'ÖĞRENCİ YURDU - DİJİTAL PANO';

        if (config.institution_slogan1) document.getElementById('header-slogan1').innerText = config.institution_slogan1;
        else document.getElementById('header-slogan1').innerText = 'ilgiyle bilginin';

        if (config.institution_slogan2) document.getElementById('header-slogan2').innerText = config.institution_slogan2;
        else document.getElementById('header-slogan2').innerText = 'buluştuğu yer';

        if (config.institution_logo) document.getElementById('header-logo').src = config.institution_logo;

        // --- 1. Başlıklar ---
        if (config.dorm_title) {
            const el = document.getElementById('dorm-section-title');
            if (el) el.innerText = config.dorm_title;
        }

        // --- 2. Galeri & Video ---
        // Yeni Galeri Linkleri (Admin panelinden gelenler)
        let adminGallery = [];
        if (config.gallery_links) {
            try {
                const parsed = (typeof config.gallery_links === 'string') ? JSON.parse(config.gallery_links) : config.gallery_links;
                if (Array.isArray(parsed) && parsed.length > 0) adminGallery = parsed;
            } catch (e) { console.error('Galeri parse hatası', e); }
        }

        // Eğer admin galerisi varsa onu kullan, yoksa klasörden çek
        if (adminGallery.length > 0) {
            galleryImages = adminGallery;
            console.log("Admin galerisi yüklendi:", galleryImages);

            // Swiper Wrapper Güncelle (DOM'a bas)
            const wrapper = document.getElementById('slide-wrapper');
            if (wrapper) {
                wrapper.innerHTML = '';
                galleryImages.forEach(url => {
                    const slide = document.createElement('div');
                    slide.className = 'swiper-slide flex items-center justify-center bg-gradient-to-br from-orange-400 via-red-400 to-pink-400';
                    slide.innerHTML = `<img src="${url}" class="w-full h-full object-contain" />`;
                    wrapper.appendChild(slide);
                });
            }
        }
        // User Request: Stop pulling from local folder
        // else if (galleryImages.length === 0) {
        //    await fetchGalleryImages();
        // }

        // --- 2.1 Sol Galeri (Admin Panelinden) ---
        let adminLeftGallery = [];
        if (config.left_gallery_links) {
            try {
                const parsed = (typeof config.left_gallery_links === 'string') ? JSON.parse(config.left_gallery_links) : config.left_gallery_links;
                if (Array.isArray(parsed) && parsed.length > 0) adminLeftGallery = parsed;
            } catch (e) { console.error('Sol Galeri parse hatası', e); }
        }

        if (adminLeftGallery.length > 0) {
            leftGalleryImages = adminLeftGallery;
            console.log("Admin sol galerisi yüklendi:", leftGalleryImages);
            // Rotasyonu başlat (mevcut varsa durdurup yeniden başlat)
            startLeftGalleryRotation();
        }
        // User Request: Stop pulling from local folder
        // else {
        //    // Admin boşsa yerelden çek (Fallback)
        //     await fetchLeftGalleryImages();
        // }

        let newVideoId = config.video_url || null;
        if (newVideoId && newVideoId.trim() !== '') {
            if (newVideoId.includes('v=')) newVideoId = newVideoId.split('v=')[1].split('&')[0];
            else if (newVideoId.includes('youtu.be/')) newVideoId = newVideoId.split('youtu.be/')[1];
            else if (newVideoId.includes('embed/')) newVideoId = newVideoId.split('embed/')[1];
        } else {
            newVideoId = null;
        }

        // Video ID değiştiyse veya ilk açılışsa state güncelle
        if (newVideoId !== videoId) {
            videoId = newVideoId;
            if (videoId) switchMedia('video');
            else switchMedia('slide'); // Video yoksa slayta dön
        } else if (currentMediaState === 'none') {
            if (videoId) switchMedia('video');
            else switchMedia('slide');
        }

        // --- 3. Yemek Menüsü (Global) ---
        window.lunchMenu = config.lunch_menu || "";
        window.dinnerMenu = config.dinner_menu || "";

        // --- 4. Günün Sözleri (Marquee) ---
        // --- 4. Günün Sözleri (Marquee) ---
        let quotesText = "";

        // A) Array Formatı (Yeni)
        if (config.quotes) {
            try {
                const q = (typeof config.quotes === 'string') ? JSON.parse(config.quotes) : config.quotes;
                if (Array.isArray(q) && q.length > 0) {
                    quotesText = q.join(' &nbsp; <span class="text-yellow-400 text-2xl">★</span> &nbsp; ');
                }
            } catch (e) { }
        }

        // B) String Formatı (Eski / Fallback)
        if (!quotesText && config.quote_of_day) {
            quotesText = `★ ${config.quote_of_day} ★`;
        }

        // C) Ekrana Bas
        const marquee = document.getElementById('marquee-text');
        if (marquee && quotesText) {
            marquee.innerHTML = quotesText;
        }

        // --- 5. Kazanan Yatakhaneler ---
        // Yatakhane 1
        if (config.dorm1) {
            const d1 = (typeof config.dorm1 === 'string') ? JSON.parse(config.dorm1) : config.dorm1;
            document.getElementById('dorm1-name').innerText = d1.name || '---';
            document.getElementById('dorm1-count').innerText = d1.count ? (d1.count + '.KEZ') : '0.KEZ';
            dorm1Names = [d1.s1, d1.s2, d1.s3, d1.s4, d1.s5, d1.s6].filter(n => n && n !== '---');
        }

        // Yatakhane 2
        if (config.dorm2) {
            const d2 = (typeof config.dorm2 === 'string') ? JSON.parse(config.dorm2) : config.dorm2;
            document.getElementById('dorm2-name').innerText = d2.name || '---';
            document.getElementById('dorm2-count').innerText = d2.count ? (d2.count + '.KEZ') : '0.KEZ';
            dorm2Names = [d2.s1, d2.s2, d2.s3, d2.s4, d2.s5, d2.s6].filter(n => n && n !== '---');
        }

        // İsim rotasyonunu başlat
        startDormNameRotation();

        // --- 6. Hadis ---
        if (config.hadith) {
            const h = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;

            // Hafta Bilgisi
            if (h.week) {
                const weekEl = document.getElementById('hadith-week');
                if (weekEl) weekEl.innerText = h.week;
            }

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

        // C) Yemek Menüsü (Öğle ve Akşam)
        if (config.menu_enabled) {
            if (config.lunch_menu) {
                infoData.push({
                    type: 'menu',
                    title: 'ÖĞLE YEMEĞİ',
                    badge: 'AFİYET OLSUN',
                    circle: '☀️',
                    topLabel: 'GÜNÜN MENÜSÜ',
                    content: config.lunch_menu
                });
            }

            if (config.dinner_menu) {
                infoData.push({
                    type: 'menu',
                    title: 'AKŞAM YEMEĞİ',
                    badge: 'AFİYET OLSUN',
                    circle: '🌙',
                    topLabel: 'GÜNÜN MENÜSÜ',
                    content: config.dinner_menu
                });
            }
        }

        // 7. Video Listesi (Playlist)
        if (config.video_urls && Array.isArray(config.video_urls) && config.video_urls.length > 0) {
            videoPlaylist = config.video_urls;
        } else if (config.video_url) {
            // Geriye dönük uyumluluk (Tek video)
            videoPlaylist = [config.video_url];
        }

        // --- 8. BAŞLAT ---
        // Eğer hiç galeri yoksa ve video varsa -> Sadece video döndür
        // Eğer hem galeri hem video varsa -> Loop
        // Eğer sadece galeri varsa -> Slider

        // Başlangıç modunu belirle
        if (videoPlaylist.length > 0) {
            currentVideoIndex = 0;
            switchMedia('video');
        } else {
            switchMedia('slide');
        }

        startDormNameRotation(); // İsimleri listele

        // Periyodik yenileme (Opsiyonel: 5 dk'da bir config yenile)
        // setInterval(fetchConfig, 5 * 60 * 1000);

    } catch (error) {

        // DOM Elements
        document.getElementById('info-title').innerText = item.title;
        document.getElementById('info-badge').innerText = item.badge;
        document.getElementById('info-circle-badge').innerText = item.circle;

        // Kart arkaplan rengini değiştir (yemek için özel)
        const cardContainer = container.parentElement;
        if (item.type === 'menu') {
            // Yemek menüsü için özel gradient
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-orange-700';
        } else {
            // Diğerleri için mor gradient
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-[#4c1d95] to-[#7c3aed] rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-purple-800';
        }

        // Circle Style & Text Adjustments based on Type
        const circle = document.getElementById('info-circle-badge');
        if (item.type === 'exam') {
            circle.style.fontSize = '0.9rem'; // Smaller for text like "7.Sınıf"
            circle.classList.remove('bg-blue-500', 'bg-green-500', 'bg-orange-500');
            circle.classList.add('bg-yellow-500');
        } else if (item.type === 'menu') {
            circle.style.fontSize = '1.8rem'; // Bigger emoji for menu
            circle.classList.remove('bg-yellow-500', 'bg-blue-500');
            circle.classList.add('bg-orange-500');
        } else {
            circle.style.fontSize = '1.5rem'; // Emoji size
            circle.classList.remove('bg-yellow-500', 'bg-orange-500');
            circle.classList.add('bg-blue-500');
        }

        document.getElementById('info-top-label').innerText = item.topLabel; // "BİRİNCİSİ"

        const mainText = document.getElementById('info-main-text');
        mainText.innerText = item.content;

        // Menü ise fontu küçült ve 2 sütuna böl
        if (item.type === 'menu') {
            mainText.classList.remove('text-2xl', 'text-center');
            mainText.classList.add('text-sm', 'leading-snug', 'whitespace-pre-wrap', 'columns-2', 'gap-4', 'text-left');
        } else {
            mainText.classList.add('text-2xl', 'text-center');
            mainText.classList.remove('text-sm', 'leading-snug', 'whitespace-pre-wrap', 'columns-2', 'gap-4', 'text-left');
        }

        // Fade in
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';

        infoIndex = (infoIndex + 1) % infoData.length;

    }, 500);
}

// Yatakhane isim rotasyonu (ARTIK ROTASYON YOK - HEPSİ GÖZÜKÜYOR)
function startDormNameRotation() {
    // Mevcut interval varsa temizle
    if (dormNameRotationInterval) {
        clearInterval(dormNameRotationInterval);
    }
    // Tek sefer çalıştır
    updateDormNames();
}

function updateDormNames() {
    // Yatakhane 1
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`dorm1-s${i}`);
        if (dorm1Names[i - 1]) {
            el.innerText = dorm1Names[i - 1];
            el.classList.remove('opacity-50'); // Varsa tam görünür
        } else {
            el.innerText = '---';
            el.classList.add('opacity-50'); // Yoksa silik
        }
    }

    // Yatakhane 2
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`dorm2-s${i}`);
        if (dorm2Names[i - 1]) {
            el.innerText = dorm2Names[i - 1];
            el.classList.remove('opacity-50');
        } else {
            el.innerText = '---';
            el.classList.add('opacity-50');
        }
    }
}

// Başlangıçta verileri çek
fetchConfig();


// --- YOUTUBE API ---
// --- YOUTUBE & HYBRID LOOP ---
var player;
var galleryImages = [];
var currentMediaState = 'none'; // 'video', 'slide'
var videoPlaylist = []; // Artık array (Playlist)
var currentVideoIndex = 0; // Hangi videodayız
var slideIntervalHandle = null;

// Galeriyi Çek (Yerel klasörden)
async function fetchGalleryImages() {
    // ... (Mevcut kod aynı, sunucudan çekmediği için bu fonksiyon pek kullanılmıyor olabilir, main.js'deki config'e bakacağız)
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'rel': 0,            // İlgili videoları gizle
            'showinfo': 0,       // Başlığı gizle
            'mute': 1            // Tarayıcıların otomatik oynatması için Mute şarttır
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    // Player hazır, ancak oynatma emri switchMedia'dan gelecek
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        // Video bitti
        currentVideoIndex++; // Sonraki videoya geç

        if (currentVideoIndex < videoPlaylist.length) {
            // Sırada başka video var, onu oynat
            if (player && typeof player.loadVideoById === 'function') {
                const vid = extractVideoID(videoPlaylist[currentVideoIndex]);
                if (vid) {
                    player.loadVideoById(vid);
                    player.playVideo();
                } else {
                    // Link hatalıysa sonrakine geç veya bitir
                    onPlayerStateChange({ data: YT.PlayerState.ENDED });
                }
            }
        } else {
            // Playlist bitti, Slider'a geç
            currentVideoIndex = 0; // Bir dahaki sefere başa dönmek için sıfırla
            switchMedia('slide');
        }
    }
}

// Eski switchMedia silindi, yukarıda güncellendi.        // --- DÖNGÜ MANTIĞI ---
// Eğer video tanımlıysa, slaytların hepsi bitince videoya dön.
if (videoId) {
    const slideDuration = 10000; // 10sn
    const totalTime = galleryImages.length * slideDuration;

    console.log(`Slayt başladı. ${galleryImages.length} resim var. ${totalTime / 1000} saniye sonra videoya geçilecek.`);

    slideIntervalHandle = setTimeout(() => {
        switchMedia('video');
    }, totalTime);
}

    } else {
    // Fallback (Video yok, Resim yok -> ya da biri var)
    if (videoId) switchMedia('video');
    else if (galleryImages.length > 0) switchMedia('slide');
}
}


// --- WEATHER API (Open-Meteo) ---
async function fetchWeather() {
    try {
        // Zeytinburnu Coordinats: 40.99, 28.90
        // Config'den şehir/ilçe al varsa
        // fetchConfig fonksiyonu globalCity ve globalDistrict'i güncelleyecek şekilde revize edilecek
        // Ancak burada DOM'dan okuyamayız çünkü config infoData'da tutuluyor, global değişkene atmamız lazım.
        // Hızlı çözüm: fetchConfig içinde window.configLocation atayalım, burada kullanalım.
        const city = window.configLocation?.city || 'Istanbul';
        const district = window.configLocation?.district || 'Uskudar';

        const res = await fetch(`https://wttr.in/${district},${city}?format=j1`);
        const data = await res.json();
        const current = data.current_condition[0];

        const temp = current.temp_C;
        const desc = current.lang_tr ? current.lang_tr[0].value : current.weatherDesc[0].value;

        // Basit ikon eşleşmesi
        let icon = '☀️';
        const d = desc.toLowerCase();
        if (d.includes('bulut')) icon = '☁️';
        if (d.includes('yağmur') || d.includes('rain')) icon = '🌧️';
        if (d.includes('kar') || d.includes('snow')) icon = '❄️';
        if (d.includes('gök') || d.includes('thunder')) icon = '⛈️';
        if (d.includes('sis') || d.includes('fog')) icon = '🌫️';

        if (document.getElementById('weather-temp')) {
            document.getElementById('weather-temp').innerHTML = `${icon} ${Math.round(temp)}°C`;
            document.getElementById('weather-desc').innerText = district.toUpperCase(); // İlçe adını göster
        }
        if (document.getElementById('weather-icon')) document.getElementById('weather-icon').innerText = icon;

    } catch (e) {
        console.error("Hava durumu hatası:", e);
    }
}

// Initial Fetch and Interval
fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000); // 30 Mins

// --- SOL GALERİ ROTASYONU ---
// (Değişkenler yukarı taşındı)

// Sol galeri görsellerini yükle
async function fetchLeftGalleryImages() {
    // Eğer admin'den dolu geldiyse tekrar çekme
    if (leftGalleryImages.length > 0) return;

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
// Sayfa yüklendiğinde sol galeriyi başlat (fetchConfig içinde çağrılıyor artık)
// fetchLeftGalleryImages();
