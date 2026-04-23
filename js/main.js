// js/main.js
// console.log("Pano uygulaması başlatılıyor...");

// --- Saat & Tarih & Hicri Güncelleme (Her Saniye) ---
function updateClock() {
    const now = new Date();

    // Saat
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.innerText = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // Miladi Tarih
    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.innerText = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });

    // Hicri Tarih (JS Intl API)
    try {
        const hijriEl = document.getElementById('hijri-date');
        if (hijriEl) {
            const hijriDate = new Intl.DateTimeFormat('tr-TR-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long',
                year: 'numeric' // "1446"
            }).format(now);
            // "12 Recep 1446" gibi formatlar verir. Bazı tarayıcılarda "12 Recep 1446 AH" yazar. "AH" kısmını silebiliriz.
            hijriEl.innerText = hijriDate.replace(' AH', '').replace('Hicri', '').trim();
        }
    } catch (e) {
        const hijriEl = document.getElementById('hijri-date');
        if (hijriEl) hijriEl.innerText = "Hicri Takvim";
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- Konfigürasyon Çekme ve UI Güncelleme ---
let infoData = [];
let infoIndex = 0;
let infoRotationInterval = null; // Bilgi kartı rotasyon interval'i
let countdownInterval = null; // Geri sayım interval'i

// Yatakhane isim rotasyonu için değişkenler
let dorm1Names = [];
let dorm2Names = [];
let dorm1NameIndex = 0;
let dorm2NameIndex = 0;
let dormNameRotationInterval = null;

// --- GALERİ & MEDYA DEĞİŞKENLERİ (GLOBAL) ---
let localVideos = [];
let centralVideos = [];
let localSlides = [];
let centralSlides = [];
let videoPlaylist = []; // Mevcut çalınan videolar
let galleryImages = []; // Mevcut çalınan slaytlar (backward compatibility için tutuldu)
let currentMediaStep = 0; // 0: LV, 1: LS, 2: CV, 3: CS
let currentVideoIndex = 0;
let currentMediaState = 'none'; // 'video', 'slide'
let leftGalleryImages = [];
let leftGalleryIndex = 0;
let leftGalleryTimeout = null;
let slideIntervalHandle = null; 
let player;
let isYoutubeReady = false;
let pendingVideoPlay = false;

// --- DİNAMİK LOGO & MARKALAMA SİSTEMİ ---
/**
 * Logoyu Canvas üzerinde işleyerek beyaz arka planını temizler 
 * ve baskın renge göre Header için dinamik gradient oluşturur.
 */
async function processLogo(logoUrl) {
    if (!logoUrl) return;
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = logoUrl;

    logoImg.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = logoImg.width;
        canvas.height = logoImg.height;
        ctx.drawImage(logoImg, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 1. Akıllı Arka Plan Tespiti (Sol Üst Köşeden)
        const bgR = data[0], bgG = data[1], bgB = data[2];
        const isWhiteBg = bgR > 240 && bgG > 240 && bgB > 240;

        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            
            // Eğer pixel arka plan rengine çok yakınsa (fark < 30), şeffaf yap
            const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
            
            if (isWhiteBg && diff < 40) {
                data[i + 3] = 0;
            } else {
                rSum += r; gSum += g; bSum += b; count++;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        const processedUrl = canvas.toDataURL();
        const headerLogo = document.getElementById('header-logo');
        if (headerLogo) {
            headerLogo.src = processedUrl;
            headerLogo.style.filter = "none";
        }

        // 2. Akıllı Kontrast Hesaplama
        if (count > 0) {
            const avgR = rSum / count, avgG = gSum / count, avgB = bSum / count;
            const brightness = (avgR * 299 + avgG * 587 + avgB * 114) / 1000;
            const headerContainer = document.getElementById('header-container');

            if (headerContainer) {
                let startColor = `rgb(${avgR}, ${avgG}, ${avgB})`;
                
                // KOYU LOGO ve DÜŞÜK PARLAKLIK SENARYOSU (Lacivert, Siyah, Koyu Yeşil vb.)
                // Sadece gerçekten koyu olanlar için Turuncu/Sarı geçişi yap
                if (brightness < 80) { 
                    startColor = "rgba(249, 115, 22, 0.95)"; // Canlı Turuncu
                } 
                // AÇIK RENKLİ (BEYAZ VB.) LOGOLAR İÇİN: Koyu Temayı Koru
                else if (brightness > 200) {
                    startColor = "rgba(30, 31, 53, 0.2)"; // Header rengiyle aynı tonda kalsın (şeffaf geçiş)
                }
                else {
                    startColor = `rgba(${avgR}, ${avgG}, ${avgB}, 0.7)`;
                }

                headerContainer.style.background = `linear-gradient(90deg, ${startColor} 0%, #1e1f35 65%)`;
                headerContainer.style.borderLeft = `6px solid ${brightness < 80 ? startColor : "transparent"}`;
            }
        }
    };

    logoImg.onerror = function() {
        console.error("[MARKALAMA] Logo yüklenemedi, varsayılan tema korunuyor.");
    };
}

// Verileri API'den Çek
async function fetchConfig() {
    try {
        // URL'den slug'ı al (örn: kartaltepe.com/omeravniyel -> slug: omeravniyel)
        const path = window.location.pathname;
        let slug = path.split('/')[1] || ''; // Boşsa varsayılanı API halleder

        let isDemoMode = false;
        // "index.html", "index", "board.html", "board" gelirse özel slug olarak alma
        const ignoredBundles = ['index.html', 'index', 'board.html', 'board'];
        if (ignoredBundles.includes(slug.toLowerCase())) {
            // Eğer özellikle board.html ise ve slug yoksa, DEMO MODU'nu aktif et
            if (slug.toLowerCase().includes('board')) {
                isDemoMode = true;
            }
            slug = '';
        }

        if (!slug && !isDemoMode) {
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

        let config;

        if (isDemoMode) {
            // --- DEMO CONFIGURATION ---
            // console.log("Demo Modu Aktif: Örnek veriler yükleniyor...");
            config = {
                institution_title: "Örnek Koleji",
                institution_subtitle: "Eğitimde Mükemmeliyet",
                institution_slogan1: "Gelecek",
                institution_slogan2: "Burada Başlar",
                institution_logo: "logo.png",
                weather_animation_active: true, // WEATHER TOGGLE DEFAULT (Demo)
                city: "İstanbul",
                district: "Üsküdar",
                lunch_menu: "Ezogelin Çorbası\nOrman Kebabı\nPirinç Pilavı\nCacık",
                dinner_menu: "Mercimek Çorbası\nTavuk Sote\nBulgur Pilavı\nTatlı",
                quote_of_day: "1. İlim ilim bilmektir. 2. İlim kendin bilmektir.",
                hadith: {
                    text: "Sizin en hayırlınız Kuran'ı öğrenen ve öğreteninizdir.",
                    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
                    week: "BU HAFTA"
                },
                dorm_main_title: "HAFTANIN YILDIZLARI",
                dorm1: {
                    name: "5-A SINIFI",
                    count: 3,
                    s1: "Ahmet Yılmaz", s2: "Mehmet Demir", s3: "Ali Vural", s4: "Veli Can", s5: "", s6: ""
                },
                dorm2: {
                    name: "6-B SINIFI",
                    count: 5,
                    s1: "Hasan Kaya", s2: "Hüseyin Bakır", s3: "Ömer Faruk", s4: "Yusuf Efe", s5: "", s6: ""
                },
                announcements: [
                    "2025-2026 Eğitim Öğretim Yılı kayıtlarımız başlamıştır.",
                    "Bu hafta sonu veli toplantımız yapılacaktır. Tüm velilerimiz davetlidir.",
                    "Kütüphane haftası etkinlikleri kapsamında kitap okuma yarışması düzenlenecektir."
                ],
                gallery_links: [
                    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1000&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=1000&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1000&auto=format&fit=crop"
                ],
                left_gallery_links: [
                    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop"
                ],
                video_url: "https://www.w3schools.com/html/mov_bbb.mp4"
            };
        } else {
            const res = await fetch(`/api/get-config?slug=${slug}&_t=${Date.now()}`);

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
            config = await res.json();
        }

        // --- ACİL DURUM KONTROLÜ (EMERGENCY MODE) ---
        if (config.emergency_alert) {
            let em = config.emergency_alert;
            // Eğer string olarak gelmişse parse et (Bazı DB sürümlerinde string gelebilir)
            if (typeof em === 'string') {
                try { em = JSON.parse(em); } catch (e) { console.error("Emergency parse error:", e); }
            }

            if (em && typeof em === 'object') {
                const title = em.title || "DİKKAT";
                const message = em.message || "";
                const style = em.style || "red";

                // Renk Temaları
                const styles = {
                    red: 'from-red-600 to-red-900',
                    yellow: 'from-yellow-400 to-amber-600',
                    blue: 'from-blue-600 to-indigo-900'
                };
                const bgGradient = styles[style] || styles.red;
                const icon = style === 'yellow' ? '⚠️' : (style === 'blue' ? 'ℹ️' : '🚨');

                document.body.innerHTML = `
                    <div class="fixed inset-0 z-[99999] bg-gradient-to-br ${bgGradient} text-white flex flex-col items-center justify-center p-10 text-center animate-pulse">
                        <div class="text-[10rem] mb-4 drop-shadow-lg">${icon}</div>
                        <h1 class="text-[8rem] font-black uppercase tracking-tighter leading-none mb-8 drop-shadow-xl bg-black/20 px-8 rounded-xl">${title}</h1>
                        <p class="text-[4rem] font-bold leading-tight max-w-6xl bg-black/10 px-10 py-4 rounded-2xl border-2 border-white/20 shadow-2xl backdrop-blur-sm">
                            ${message.replace(/\n/g, '<br>')}
                        </p>
                        <div class="mt-20 text-2xl font-mono opacity-80 bg-black/30 px-6 py-2 rounded-lg">
                            Sistem Yöneticisi Tarafından Gönderilen Acil Durum Mesajı
                        </div>
                    </div>
                `;
                return;
            }
        }

        // --- WEATHER ANIMATION TOGGLE ---
        // If false, hide the global overlay
        const weatherActive = (config.weather_animation_active !== undefined) ? config.weather_animation_active : true;
        const weatherOverlay = document.getElementById('global-weather-overlay');
        if (weatherOverlay) {
            weatherOverlay.style.display = weatherActive ? 'block' : 'none';
        }

        // Hava durumu için konumu global'e at
        window.configLocation = {
            city: config.city || 'Istanbul',
            district: config.district || 'Uskudar'
        };
        // Hemen hava durumunu güncelle
        fetchWeather();

        // --- 0. Header Bilgileri ---
        // --- 0. Header Bilgileri ---
        const title = config.institution_title || config.name || 'Dijital Pano';
        document.getElementById('header-title').innerText = title;
        document.title = title; // Browser Tab Title

        if (config.institution_subtitle !== undefined) document.getElementById('header-subtitle').innerText = config.institution_subtitle;
        else document.getElementById('header-subtitle').innerText = 'DİJİTAL PANO SİSTEMİ';

        if (config.institution_slogan1 !== undefined) document.getElementById('header-slogan1').innerText = config.institution_slogan1;
        else document.getElementById('header-slogan1').innerText = 'İlgiyle bilginin';

        if (config.institution_slogan2 !== undefined) document.getElementById('header-slogan2').innerText = config.institution_slogan2;
        else document.getElementById('header-slogan2').innerText = 'buluştuğu yer';

        if (config.institution_logo && config.institution_logo.trim() !== "") {
            // Arka planı temizle ve dinamik markalamayı uygula
            processLogo(config.institution_logo);

            // --- DYNAMIC FAVICON ---
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = config.institution_logo;

        } else {
            // Fallback to default logo
            const logoEl = document.getElementById('header-logo');
            if (logoEl) logoEl.src = 'logo.png';

            // Reset favicon
            let link = document.querySelector("link[rel~='icon']");
            if (link) link.href = 'logo.png';
        }

        // --- 1. Başlıklar ---
        if (config.dorm_title) {
            const el = document.getElementById('dorm-section-title');
            if (el) el.innerText = config.dorm_title;
        }

        // Video Listesi Temizleme ve Ayrıştırma
        localVideos = (config.video_urls || []).filter(v => v && v.trim().length > 5);
        centralVideos = (config.central_video_urls || []).filter(v => v && v.trim().length > 5);

        // Yardımcı fonksiyon: Farklı formatlardaki (string, array, object) görsel linklerini güvenli şekilde ayıklar
        const getLinks = (val) => {
            if (!val) return [];
            let arr = [];
            try {
                // Eğer string olarak gelmişse ve JSON formatındaysa parse et
                const parsed = (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) ? JSON.parse(val) : val;
                if (Array.isArray(parsed)) arr = parsed;
                else if (parsed && typeof parsed === 'object') arr = Object.values(parsed);
                else if (typeof parsed === 'string') arr = [parsed];
            } catch (e) {
                if (typeof val === 'string' && val.length > 5) arr = [val];
            }
            // Obje içindeki .url alanını veya direkt string'i al
            return arr.map(item => {
                if (!item) return null;
                if (typeof item === 'string') return item;
                if (typeof item === 'object' && item.url) return item.url;
                return null;
            }).filter(u => u && typeof u === 'string' && u.trim().length > 5);
        };

        const allLocalGallery = getLinks(config.gallery_links) || getLinks(config.gallery_urls) || getLinks(config.images) || [];
        const allCentralGallery = getLinks(config.central_gallery_links) || [];

        // Yardımcı: Video mu yoksa Görsel mi karar veren basit kural
        const isVideo = (url) => {
            const low = url.toLowerCase();
            return low.includes('youtube.com') || low.includes('youtu.be') || low.includes('.mp4') || low.includes('.mov') || low.includes('.webm') || low.includes('drive.google.com');
        };

        // Videoları ve Slaytları Ayrıştır (Ayrı listelere dağıt)
        localVideos = (config.video_urls || []).filter(v => v && v.trim().length > 5);
        localSlides = [];
        allLocalGallery.forEach(item => {
            if (isVideo(item)) { if (!localVideos.includes(item)) localVideos.push(item); }
            else { localSlides.push(item); }
        });

        centralVideos = (config.central_video_urls || []).filter(v => v && v.trim().length > 5);
        centralSlides = [];
        allCentralGallery.forEach(item => {
            if (isVideo(item)) { if (!centralVideos.includes(item)) centralVideos.push(item); }
            else { centralSlides.push(item); }
        });

        // Sayfa ilk yüklendiğinde veya veri değiştiğinde Swiper'ı mevcut moda göre güncelle
        // (Not: Swiper render işlemi artık switchMedia içinde dinamik yapılıyor)
        const currentGalleryStr = JSON.stringify([...localSlides, ...centralSlides]);
        if (currentGalleryStr !== window.lastGalleryStr) {
            console.log(`[GALERİ] Veriler güncellendi. Yerel: ${localSlides.length}, Merkezi: ${centralSlides.length}`);
            window.lastGalleryStr = currentGalleryStr;
            // Eğer şu an slide modundaysak içeriği tazele
            if (currentMediaState === 'slide') {
                updateSwiperContent(currentMediaStep === 1 ? localSlides : centralSlides);
            }
        }


        // 2. Sol Galeri (Left)
        let localLeft = getLinks(config.left_gallery_links);
        if (localLeft.length === 0) localLeft = getLinks(config.left_images);
        if (localLeft.length === 0) localLeft = getLinks(config.left_gallery_urls);
        const centralLeft = getLinks(config.central_left_gallery_links);
        
        const adminLeftGallery = [...new Set([...localLeft, ...centralLeft])];

        if (adminLeftGallery.length > 0) {
            const currentLeftStr = JSON.stringify(adminLeftGallery);
            const lastLeftStr = window.lastLeftStr || "";

            if (currentLeftStr !== lastLeftStr) {
                console.log(`[SOL GALERİ] Güncellendi. Yerel: ${localLeft.length}, Merkezi: ${centralLeft.length}`);
                window.lastLeftStr = currentLeftStr;
                leftGalleryImages = adminLeftGallery;
                startLeftGalleryRotation();
            }
        }

        // --- 3. Yemek Menüsü (Global) ---
        window.lunchMenu = config.lunch_menu || "";
        window.dinnerMenu = config.dinner_menu || "";

        // İlk yüklemede döngüyü başlat
        if (!window.initialCycleStarted && (localVideos.length > 0 || centralVideos.length > 0 || localSlides.length > 0 || centralSlides.length > 0)) {
            window.initialCycleStarted = true;
            console.log("[DÖNGÜ] İlk medya döngüsü başlatılıyor...");
            setTimeout(() => playNextMedia(), 1000);
        }

        // --- 4. Günün Sözleri / Marquee (Gelişmiş Numaralandırma Ayrıştırıcı) ---
        let marqueeItems = [];

        // Helper: Metni numaralardan (1-, 2. vb) bölüp temiz listeye çevirir
        const parseNumberedText = (text) => {
            if (!text) return [];
            // "1- ", "2. ", "3) " gibi desenlerden böl
            // Regex: Bir sayı, ardından tire/nokta/parantez, ardından boşluklar
            const parts = text.split(/\d+[\-\.)]\s*/);
            // Boşlukları temizle ve filtrele
            return parts.map(p => p.trim()).filter(p => p.length > 0);
        };

        // 0. Marquee Text (Yeni Panel Standardı)
        if (config.marquee_text) {
            const parsed = parseNumberedText(config.marquee_text);
            // If parse returns empty (no numbers), use the whole text as one item
            if (parsed.length === 0 && config.marquee_text.trim().length > 0) {
                marqueeItems.push(config.marquee_text);
            } else {
                parsed.forEach(p => {
                    if (!marqueeItems.includes(p)) marqueeItems.push(p);
                });
            }
        } else if (config.quote_of_day) {
            // 2. Günün Sözü (Legacy Fallback - only if marquee_text is missing/empty)
            const parsed = parseNumberedText(config.quote_of_day);
            parsed.forEach(p => {
                if (!marqueeItems.includes(p)) marqueeItems.push(p);
            });
        }

        // 3. Eski Quotes yapısı (Fallback)
        if (config.quotes && (!marqueeItems.length)) {
            try {
                const q = (typeof config.quotes === 'string') ? JSON.parse(config.quotes) : config.quotes;
                if (Array.isArray(q)) marqueeItems = q;
            } catch (e) { }
        }

        let quotesText = "";
        if (marqueeItems.length > 0) {
            // Öğeler arasına YILDIZ koy
            quotesText = marqueeItems.join(' &nbsp; <span class="text-yellow-400 text-2xl">★</span> &nbsp; ');
        } else {
            // Varsayılan
            quotesText = "Dijital Pano sistemine hoşgeldiniz...";
        }

        const marquee = document.getElementById('marquee-text');
        if (marquee) {
            marquee.innerHTML = quotesText;

            // --- Dynamic Marquee Speed ---
            // Sabit hız için süre hesaplama: Yol = Hız x Zaman => Zaman = Yol / Hız
            // Yol = Ekran Genişliği + Metin Genişliği
            // Basitçe: Her karakter yaklaşık 0.3 saniye eklesin + 20sn temel süre
            const plainText = marquee.innerText || ""; // HTML tagleri olmadan uzunluk
            const charCount = plainText.length;
            const baseDuration = 20; // Ekranı boş geçme süresi (saniye)
            const timePerChar = 0.2; // Karakter başı süre (saniye)

            // Eğer metin çok kısaysa hızlanıp gözden kaçmasın diye min 30sn
            // Eğer metin çok uzunsa yavaşlasın diye formül
            const duration = Math.max(30, baseDuration + (charCount * timePerChar));

            marquee.style.animationDuration = `${duration}s`;
        }

        // --- 5. Kazanan Yatakhaneler ---
        // Yatakhane 1
        if (config.dorm1_names && Array.isArray(config.dorm1_names) && config.dorm1_names.length > 0) {
            // Yeni Array Formatı
            dorm1Names = config.dorm1_names.filter(n => n);
            document.getElementById('dorm1-name').innerText = config.dorm1_name || '1. GRUP';
            document.getElementById('dorm1-count').innerText = config.dorm1_count ? (config.dorm1_count + '.KEZ') : '0.KEZ';
        } else if (config.dorm1_name) {
            // Yeni Tekil Format (öğrenciler boş olabilir veya array boş gelmiş olabilir)
            document.getElementById('dorm1-name').innerText = config.dorm1_name;
            document.getElementById('dorm1-count').innerText = config.dorm1_count ? (config.dorm1_count + '.KEZ') : '0.KEZ';
            // Fallback for old style array if exists in other props? No, usually it was fixed.
            // If legacy dorm1_names existed as individual props? No, they were fixed checks.
            // Just empty if not array.
        } else if (config.dorm1) {
            // Legacy JSON support
            try {
                const d1 = (typeof config.dorm1 === 'string') ? JSON.parse(config.dorm1) : config.dorm1;
                document.getElementById('dorm1-name').innerText = d1.name || '---';
                document.getElementById('dorm1-count').innerText = d1.count ? (d1.count + '.KEZ') : '0.KEZ';
                dorm1Names = [d1.s1, d1.s2, d1.s3, d1.s4, d1.s5, d1.s6].filter(n => n && n !== '---');
            } catch (e) { }
        }

        if (config.dorm2_names && Array.isArray(config.dorm2_names)) {
            dorm2Names = config.dorm2_names;
            if (document.getElementById('dorm2-name')) document.getElementById('dorm2-name').innerText = config.dorm2_name || '---';
            if (document.getElementById('dorm2-count')) document.getElementById('dorm2-count').innerText = config.dorm2_count ? (config.dorm2_count + '.KEZ') : '0.KEZ';
        } else if (config.dorm2_name) {
            document.getElementById('dorm2-name').innerText = config.dorm2_name;
            document.getElementById('dorm2-count').innerText = config.dorm2_count ? (config.dorm2_count + '.KEZ') : '0.KEZ';
        } else if (config.dorm2) {
            // Legacy JSON support
            try {
                const d2 = (typeof config.dorm2 === 'string') ? JSON.parse(config.dorm2) : config.dorm2;
                document.getElementById('dorm2-name').innerText = d2.name || '---';
                document.getElementById('dorm2-count').innerText = d2.count ? (d2.count + '.KEZ') : '0.KEZ';
                dorm2Names = [d2.s1, d2.s2, d2.s3, d2.s4, d2.s5, d2.s6].filter(n => n && n !== '---');
            } catch (e) { }
        }

        // Görünürlük ayarları
        // CHAMPIONS (Formerly Dorm) TITLE
        if (document.getElementById('dorm-section-title')) {
            const defaultTitle = "GÜNÜN KAZANAN YATAKHANESİ";
            // Support both old dorm_title and new champions_title
            document.getElementById('dorm-section-title').innerText = config.champions_title || config.dorm_main_title || config.dorm_title || defaultTitle;
        }
        if (document.getElementById('dorm1-custom-title')) {
            document.getElementById('dorm1-custom-title').innerText = config.dorm1_title || "";
        }
        if (document.getElementById('dorm2-custom-title')) {
            document.getElementById('dorm2-custom-title').innerText = config.dorm2_title || "";
        }

        // Single Dorm Mode (Etüt Modu)
        const d2Active = (config.dorm2_active !== undefined) ? config.dorm2_active : true;
        const d2Container = document.getElementById('dorm2-container');
        const d1Container = document.getElementById('dorm1-container');

        if (d2Container && d1Container) {
            if (!d2Active) {
                // Hide Dorm 2
                d2Container.classList.add('hidden');
                // Adjust Dorm 1 (Remove border)
                d1Container.classList.remove('border-r', 'border-white/20');
            } else {
                // Show Dorm 2
                d2Container.classList.remove('hidden');
                d1Container.classList.add('border-r', 'border-white/20');
            }
        }

        // Dorm section visibility check
        const dormActive = (config.module_dorm_active !== undefined) ? config.module_dorm_active : false;
        const dormCard = document.getElementById('dorm-card');
        const hadithCard = document.getElementById('hadith-card');

        if (!dormActive) {
            if (dormCard) dormCard.style.display = 'none';
            if (hadithCard) {
                // If dorm inactive, hadith takes full relative space (but we usually want it to just expand)
                // Actually the design seems to rely on flex ratios.
                // If dorm is hidden, hadith should probably just be flex-1 or take available space.
                hadithCard.classList.remove('flex-[3]');
                hadithCard.classList.add('flex-1');
            }
        } else {
            if (dormCard) dormCard.style.display = 'flex';
            if (hadithCard) {
                hadithCard.classList.add('flex-[3]');
                hadithCard.classList.remove('flex-1');
            }
            startDormNameRotation();
        }

        // --- 6. Hadis (Akıllı Seçim) ---
        let selectedHadith = null;

        // 1. Haftalık Program Kontrolü
        // NEW FORMAT: weekly_hadiths is a direct array
        // OLD FORMAT: weekly_hadiths.weeks is array, weekly_hadiths.startDate exists
        let weeklyHadithsArray = null;
        let semesterStartDate = null;

        if (config.weekly_hadiths) {
            if (Array.isArray(config.weekly_hadiths)) {
                // NEW FORMAT: Direct array
                weeklyHadithsArray = config.weekly_hadiths;
                // Get start_date from dedicated key
                semesterStartDate = config.hadith_start_date || '2025-09-08'; // Fallback
            } else if (config.weekly_hadiths.startDate && Array.isArray(config.weekly_hadiths.weeks)) {
                // OLD FORMAT: Object with startDate and weeks
                weeklyHadithsArray = config.weekly_hadiths.weeks;
                semesterStartDate = config.weekly_hadiths.startDate;
            }
        }

        // MOCK DATA FALLBACK (For Design Testing when API fails)
        if (!weeklyHadithsArray || weeklyHadithsArray.length === 0) {
            console.warn("API Data missing, using MOCK data for design verification.");
            weeklyHadithsArray = [{
                text: "Mücahid, Allah yolunda nefsi ile cihad eden kimsedir.",
                arabic: "الْمُجَاهِدُ مَنْ جَاهَدَ نَفْسَهُ فِي سَبِيلِ اللَّهِ",
                source: "Tirmizî, Fedâilü'l-Cihâd, 2"
            }];
            // Set start date to a past date to ensure week 1 is selected
            let d = new Date();
            d.setDate(d.getDate() - 7);
            semesterStartDate = d.toISOString().split('T')[0];
        }

        if (weeklyHadithsArray && weeklyHadithsArray.length > 0) {
            try {
                const startDate = new Date(semesterStartDate || '2025-09-08');
                const now = new Date();
                const oneWeek = 1000 * 60 * 60 * 24 * 7;

                // Calculate ACTUAL week number (for display)
                let actualWeekIndex = Math.floor((now - startDate) / oneWeek);
                if (actualWeekIndex < 0) actualWeekIndex = 0;

                // Calculate AVAILABLE week index (for hadith selection)
                let availableWeekIndex = actualWeekIndex;
                if (availableWeekIndex >= weeklyHadithsArray.length) {
                    // Loop or stick to last? Let's modulo for mock data to always show something
                    availableWeekIndex = actualWeekIndex % weeklyHadithsArray.length;
                }

                if (availableWeekIndex >= 0) {
                    const wData = weeklyHadithsArray[availableWeekIndex];
                    if (wData) {
                        selectedHadith = {
                            week: `${actualWeekIndex + 1}. HAFTA`, // Use ACTUAL week number
                            text: wData.text,
                            arabic: wData.arabic,
                            img: wData.img,
                            weekIndex: actualWeekIndex // Use ACTUAL week for date calculation
                        };
                        console.log(`Displaying week ${actualWeekIndex + 1} with hadith from array index ${availableWeekIndex}`);
                    }
                }
            } catch (e) {
                console.error('Haftalık hadis hatası:', e);
            }
        }

        // 2. Manuel Hadis (Fallback)
        if (!selectedHadith && config.hadith) {
            try {
                selectedHadith = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;
            } catch (e) {
                selectedHadith = { text: config.hadith };
            }
        }

        // 3. Ekrana Bas
        if (selectedHadith) {
            const h = selectedHadith;

            // --- TARIH VE HAFTA GÖSTERİMİ ---
            // Varsayılan: 2025-2026 Eğitim yılı başlangıcı (8 Eylül 2025)
            const startDateStr = (config.weekly_hadiths && config.weekly_hadiths.startDate) ? config.weekly_hadiths.startDate : '2025-09-08';

            let weekLabel = h.week || '';
            let dateRangeLabel = '';

            try {
                const start = new Date(startDateStr);
                const now = new Date();

                // Eğer manuel olarak week index gelmediyse hesapla
                let wIdx = (typeof h.weekIndex !== 'undefined') ? h.weekIndex : Math.floor((now - start) / (1000 * 60 * 60 * 24 * 7));
                if (wIdx < 0) wIdx = 0;

                // Eğer hafta etiketi yoksa hesapla (Örn: 15. Hafta)
                if (!weekLabel) {
                    weekLabel = `${wIdx + 1}. Hafta`;
                }

                // Tarih Aralığı: (Pazartesi - Pazar)
                const currentWeekStart = new Date(start);
                currentWeekStart.setDate(start.getDate() + (wIdx * 7));

                const currentWeekEnd = new Date(currentWeekStart);
                currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

                const options = { day: 'numeric', month: 'long' };
                const sStr = currentWeekStart.toLocaleDateString('tr-TR', options);
                const eStr = currentWeekEnd.toLocaleDateString('tr-TR', options);

                dateRangeLabel = `${sStr} - ${eStr}`;

            } catch (e) { console.log('Date Calc Err:', e); }

            // UI Güncelle
            const weekEl = document.getElementById('hadith-week');
            const rangeEl = document.getElementById('week-date-range');

            if (weekEl) weekEl.innerText = weekLabel;

            // Eğer ikisi de varsa araya nokta koy
            if (rangeEl) {
                if (weekLabel && dateRangeLabel) {
                    rangeEl.innerHTML = `&nbsp;•&nbsp; ${dateRangeLabel}`;
                } else {
                    rangeEl.innerText = dateRangeLabel;
                }
            }

            // Metin Kontrolü - Boşsa fallback metin
            let hadithText = h.text || ''; // Genellikle Arapça burada
            let turkishText = h.arabic || ''; // Genellikle Türkçe burada

            // --- AKILLI VERİ EŞLEŞTİRME (Smart Data Swap) ---
            // Eğer 'turkishText' (h.arabic) alanı Arapça karakter içeriyorsa ve 'hadithText' içermiyorsa yer değiştir
            const isActuallyArabic = (str) => /[\u0600-\u06FF]/.test(str);

            let finalArabic = "";
            let finalTurkish = "";

            if (isActuallyArabic(hadithText) && !isActuallyArabic(turkishText)) {
                // Beklenen durum: Text=Arapça, Arabic=Türkçe
                finalArabic = hadithText;
                finalTurkish = turkishText;
            } else if (isActuallyArabic(turkishText) && !isActuallyArabic(hadithText)) {
                // TERS DURUM: Arabic=Arapça, Text=Türkçe
                finalArabic = turkishText;
                finalTurkish = hadithText;
            } else if (isActuallyArabic(hadithText) && isActuallyArabic(turkishText)) {
                // İkisi de Arapçaysa (nadir), text'i Türkçe kabul etmeye çalış (slash varsa ayır)
                finalArabic = hadithText;
                finalTurkish = turkishText;
            } else {
                // Hiçbiri Arapça değilse veya karmaşıksa varsayılan ata
                finalArabic = "";
                finalTurkish = hadithText || turkishText;
            }

            // --- SMART SPLIT for Legacy Data (Slash separated) ---
            if (!finalArabic && finalTurkish.includes('/')) {
                const parts = finalTurkish.split('/');
                if (isActuallyArabic(parts[0])) {
                    finalArabic = parts[0].trim();
                    finalTurkish = parts.slice(1).join('/').trim();
                }
            }

            // UI'ya Yazdır
            document.getElementById('hadith-content').innerHTML = finalTurkish.trim() || '...';

            const arabDiv = document.getElementById('hadith-arabic');
            arabDiv.innerText = finalArabic.trim();
            arabDiv.style.display = finalArabic ? 'block' : 'none';

            // --- FONT SIZING (Controlled via board.html CSS) ---
            // Removed inline scaling to allow CSS styles to take effect

            // Resim varsa
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

        // --- 7. Bilgi Kartı (Modüller) ---
        // 1. Duyurular
        const rawAnnouncements = [];
        if (config.announcements && Array.isArray(config.announcements) && config.announcements.length > 0) {
            config.announcements.forEach(text => {
                if (!text) return;
                rawAnnouncements.push({
                    type: 'announcement',
                    title: 'DUYURULAR',
                    badge: 'ÖNEMLİ',
                    circle: '<i class="fas fa-bullhorn text-4xl text-white"></i>',
                    topLabel: 'BİLGİLENDİRME',
                    content: text
                });
            });
        }

        const rawExams = [];
        // --- EXAM WINNER PRIORITIZATION: List -> String Array (exam_winners) -> Individual Legacy fields ---
        if (config.exam_winners_list && Array.isArray(config.exam_winners_list) && config.exam_winners_list.length > 0) {
            // Newest System: Dynamic List (Priority 1)
            config.exam_winners_list.forEach(student => {
                if (student.name && student.name.trim()) {
                    let displayStr = '';
                    if (student.class) displayStr += `<span class="bg-yellow-400 text-purple-900 px-3 py-1 rounded-lg text-lg align-middle mr-2 shadow-sm inline-block font-extrabold">${student.class}</span>`;
                    displayStr += `<span class="font-bold inline-block align-middle">${student.name}</span>`;
                    if (student.points) displayStr += `<span class="bg-green-500 text-white px-3 py-1 rounded-lg text-lg align-middle ml-2 shadow-sm inline-block font-bold">${student.points} PUAN</span>`;

                    rawExams.push({
                        type: 'exam',
                        title: (config.exam_name ? config.exam_name + ' ŞAMPİYONLARI' : 'SINAV ŞAMPİYONLARI'),
                        badge: 'MAŞAALLAH',
                        circle: `<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.2 2H19.5H18C17.1 2 16.3 2.4 15.8 3C15.3 2.4 14.6 2 13.5 2H12.2C11.6 2 11 2.2 10.6 2.6L10 3.3L9.4 2.6C9 2.2 8.4 2 7.8 2H6.5C5.4 2 4.7 2.4 4.2 3C3.7 2.4 2.9 2 2 2H1.3H0V6C0 9.3 2.7 12 6 12H7.2L10 16.2L12.8 12H14C17.3 12 20 9.3 20 6V2H20.2ZM6 10C3.8 10 2 8.2 2 6V4H2.2H3.5C4.1 4 4.5 4.4 4.5 5V6C4.5 6.6 4.9 7 5.5 7H6C6.6 7 7 6.6 7 6V4H7.8C8.4 4 9 4.6 9 5.2V6.5L10 8L11 6.5V5.2C11 4.6 11.6 4 12.2 4H13C13.6-4 14 3.6 14 3H14.5H15.8C16.4 4 17 4.6 17 5.2V6.5L18 8L19 6.5V5.2C19 4.6 19.6 4 20.2 4H21.5H22V6C22 8.2 20.2 10 18 10H14.6L12.8 12.7L10 16.9L7.2 12.7L5.4 10H6ZM10 18H14V22H10V18Z"/></svg>`,
                        topLabel: 'TEBRİK EDERİZ',
                        content: displayStr,
                        image: student.image || '',
                        rawClass: student.class || '',
                        rawName: student.name || '',
                        rawScore: student.points || ''
                    });
                }
            });
        }
        else if (config.exam_winners && Array.isArray(config.exam_winners)) {
            // Mid-Legacy: config.exam_winners array (Priority 2)
            config.exam_winners.forEach(w => {
                let fullStr = w.trim();
                let imageUrl = '';
                const parts = fullStr.split(' | IMG:');
                if (parts.length > 1) {
                    fullStr = parts[0].trim();
                    imageUrl = parts[1].trim();
                }

                let className = '';
                let studentName = '';
                let score = '';

                const scoreParts = fullStr.split(' - ');
                const studentAndClass = scoreParts[0];
                score = scoreParts[1] || "";

                const classMatches = studentAndClass.match(/\[(.*?)\]/);
                className = classMatches ? classMatches[1] : "";
                studentName = studentAndClass.replace(/\[.*?\]/, "").trim();

                let displayStr = '';
                if (className) displayStr += `<span class="bg-yellow-400 text-purple-900 px-3 py-1 rounded-lg text-lg align-middle mr-2 shadow-sm inline-block font-extrabold">${className}</span>`;
                displayStr += `<span class="font-bold inline-block align-middle">${studentName}</span>`;
                if (score) displayStr += `<span class="bg-green-500 text-white px-3 py-1 rounded-lg text-lg align-middle ml-2 shadow-sm inline-block font-bold">${score} PUAN</span>`;

                rawExams.push({
                    type: 'exam',
                    title: (config.exam_name ? config.exam_name + ' ŞAMPİYONLARI' : 'SINAV ŞAMPİYONLARI'),
                    badge: 'MAŞAALLAH',
                    circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.2 2H19.5H18C17.1 2 16.3 2.4 15.8 3C15.3 2.4 14.6 2 13.5 2H12.2C11.6 2 11 2.2 10.6 2.6L10 3.3L9.4 2.6C9 2.2 8.4 2 7.8 2H6.5C5.4 2 4.7 2.4 4.2 3C3.7 2.4 2.9 2 2 2H1.3H0V6C0 9.3 2.7 12 6 12H7.2L10 16.2L12.8 12H14C17.3 12 20 9.3 20 6V2H20.2ZM6 10C3.8 10 2 8.2 2 6V4H2.2H3.5C4.1 4 4.5 4.4 4.5 5V6C4.5 6.6 4.9 7 5.5 7H6C6.6 7 7 6.6 7 6V4H7.8C8.4 4 9 4.6 9 5.2V6.5L10 8L11 6.5V5.2C11 4.6 11.6 4 12.2 4H13C13.6-4 14 3.6 14 3H14.5H15.8C16.4 4 17 4.6 17 5.2V6.5L18 8L19 6.5V5.2C19 4.6 19.6 4 20.2 4H21.5H22V6C22 8.2 20.2 10 18 10H14.6L12.8 12.7L10 16.9L7.2 12.7L5.4 10H6ZM10 18H14V22H10V18Z"/></svg>',
                    topLabel: 'TEBRİK EDERİZ',
                    content: displayStr,
                    image: imageUrl,
                    rawClass: className,
                    rawName: studentName,
                    rawScore: score
                });
            });
        } else {
            // Full-Legacy fields 1-4
            for (let i = 1; i <= 4; i++) {
                const name = config[`exam_s_${i}_name`];
                if (name && name.trim()) {
                    const className = config[`exam_s_${i}_class`] || '';
                    const score = config[`exam_s_${i}_points`] || '';
                    const imageUrl = config[`exam_s_${i}_image`] || '';

                    let displayStr = '';
                    if (className) displayStr += `<span class="bg-yellow-400 text-purple-900 px-3 py-1 rounded-lg text-lg align-middle mr-2 shadow-sm inline-block font-extrabold">${className}</span>`;
                    displayStr += `<span class="font-bold inline-block align-middle">${name}</span>`;
                    if (score) displayStr += `<span class="bg-green-500 text-white px-3 py-1 rounded-lg text-lg align-middle ml-2 shadow-sm inline-block font-bold">${score} PUAN</span>`;

                    rawExams.push({
                        type: 'exam',
                        title: (config.exam_name ? config.exam_name + ' ŞAMPİYONLARI' : 'SINAV ŞAMPİYONLARI'),
                        badge: 'MAŞAALLAH',
                        circle: `<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.2 2H19.5H18C17.1 2 16.3 2.4 15.8 3C15.3 2.4 14.6 2 13.5 2H12.2C11.6 2 11 2.2 10.6 2.6L10 3.3L9.4 2.6C9 2.2 8.4 2 7.8 2H6.5C5.4 2 4.7 2.4 4.2 3C3.7 2.4 2.9 2 2 2H1.3H0V6C0 9.3 2.7 12 6 12H7.2L10 16.2L12.8 12H14C17.3 12 20 9.3 20 6V2H20.2ZM6 10C3.8 10 2 8.2 2 6V4H2.2H3.5C4.1 4 4.5 4.4 4.5 5V6C4.5 6.6 4.9 7 5.5 7H6C6.6 7 7 6.6 7 6V4H7.8C8.4 4 9 4.6 9 5.2V6.5L10 8L11 6.5V5.2C11 4.6 11.6 4 12.2 4H13C13.6-4 14 3.6 14 3H14.5H15.8C16.4 4 17 4.6 17 5.2V6.5L18 8L19 6.5V5.2C19 4.6 19.6 4 20.2 4H21.5H22V6C22 8.2 20.2 10 18 10H14.6L12.8 12.7L10 16.9L7.2 12.7L5.4 10H6ZM10 18H14V22H10V18Z"/></svg>`,
                        topLabel: 'TEBRİK EDERİZ',
                        content: displayStr,
                        image: imageUrl,
                        rawClass: className,
                        rawName: name,
                        rawScore: score
                    });
                }
            }
        }

        const rawMenus = [];
        if (config.lunch_menu) rawMenus.push({ type: 'menu', title: 'ÖĞLE YEMEĞİ', badge: 'AFİYET OLSUN', circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/></svg>', topLabel: 'GÜNÜN MENÜSÜ', content: config.lunch_menu });
        if (config.dinner_menu) rawMenus.push({ type: 'menu', title: 'AKŞAM YEMEĞİ', badge: 'AFİYET OLSUN', circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/></svg>', topLabel: 'GÜNÜN MENÜSÜ', content: config.dinner_menu });

        const rawStudent = [];
        let sow = config.student_of_week;
        if (typeof sow === 'string' && sow.trim()) {
            try { sow = JSON.parse(sow); } catch (e) { sow = null; }
        }
        if (sow && sow.name) {
            rawStudent.push({
                type: 'student',
                title: 'HAFTANIN TALEBESİ',
                badge: sow.class || 'BAŞARI',
                circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.62L12 2L9.19 8.62L2 9.24L7.45 13.97L5.82 21L12 17.27Z"/></svg>', // Image handled in rotation
                topLabel: 'GURUR TABLOMUZ',
                content: `${sow.name}\n${sow.message || ''}`,
                image: sow.image
            });
        }

        // --- NEW: COUNTDOWN MODULE ---
        if (config.countdown_active && config.countdown_date) {
            const targetDate = new Date(config.countdown_date);
            const now = new Date();

            if (targetDate > now) {
                const diff = targetDate - now;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                // Reuse Announcement Style Logic but with Timer Type
                rawAnnouncements.push({
                    type: 'countdown',
                    title: config.countdown_event || 'GERİ SAYIM',
                    target: config.countdown_date,
                    badge: 'HEYECAN',
                    circle: '<i class="fas fa-hourglass-half text-4xl"></i>',
                    topLabel: 'GERİ SAYIM',
                    content: ''
                });
            }
        }

        const rawImproved = [];
        // --- IMPROVED STUDENT PRIORITIZATION: List (improved_list) -> String Array (most_improved_list) -> Individual Legacy fields ---
        if (config.improved_list && Array.isArray(config.improved_list) && config.improved_list.length > 0) {
            // Priority 1: New Dynamic List
            config.improved_list.forEach(student => {
                if (student.name && student.name.trim()) {
                    rawImproved.push({
                        type: 'improved',
                        title: 'EN ÇOK GELİŞENLER',
                        badge: student.class || 'BAŞARI',
                        points: student.points || '0',
                        circle: `<i class="fas fa-chart-line text-2xl text-white"></i>`,
                        topLabel: 'AZİM VE GAYRET',
                        content: student.name,
                        image: student.image || ''
                    });
                }
            });
        }
        else if (config.most_improved_list && Array.isArray(config.most_improved_list)) {
            // Priority 2: Mid-legacy list
            config.most_improved_list.forEach(item => {
                const parts = item.split('-').map(p => p.trim());
                const name = parts[0] || "Öğrenci";
                const score = parts[1] || "—";
                const points = parts[2] || "0";

                rawImproved.push({
                    type: 'improved',
                    title: 'EN ÇOK GELİŞENLER',
                    badge: score,
                    points: points,
                    circle: '<i class="fas fa-chart-line text-2xl text-white"></i>',
                    topLabel: 'AZİM VE GAYRET',
                    content: name
                });
            });
        } else {
            for (let i = 1; i <= 4; i++) {
                const name = config[`improved_s_${i}_name`];
                if (name && name.trim()) {
                    const className = config[`improved_s_${i}_class`] || '';
                    const points = config[`improved_s_${i}_points`] || '0';
                    const imageUrl = config[`improved_s_${i}_image`] || '';

                    rawImproved.push({
                        type: 'improved',
                        title: 'EN ÇOK GELİŞENLER',
                        badge: className || 'BAŞARI',
                        points: points,
                        circle: '<i class="fas fa-chart-line text-2xl text-white"></i>',
                        topLabel: 'AZİM VE GAYRET',
                        content: name,
                        image: imageUrl
                    });
                }
            }
        }

        // --- NEW: TEA TALKS MODULE ---
        const rawTeaTalks = [];
        if (config.module_tea_active && Array.isArray(config.tea_talks)) {
            config.tea_talks.forEach(t => {
                if (t.name && t.name.trim()) {
                    let dateStr = t.day || '';
                    if (dateStr) {
                        try {
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) {
                                dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
                            }
                        } catch (e) { }
                    }

                    rawTeaTalks.push({
                        type: 'tea',
                        title: 'ÇAY SOHBETLERİ',
                        badge: 'RANDEVU',
                        circle: '<i class="fas fa-mug-hot text-3xl text-white"></i>',
                        topLabel: 'BİREBİR GÖRÜŞME',
                        content: t.name,
                        date: dateStr,
                        time: t.time || ''
                    });
                }
            });
        }

        // Countdown Data
        const rawCountdown = [];
        if (config.countdown_target) {
            // Check if future
            const target = new Date(config.countdown_target);
            if (target > new Date()) {
                rawCountdown.push({
                    type: 'countdown',
                    title: config.countdown_title || 'BÜYÜK GÜN',
                    badge: 'HEDEF',
                    circle: '<svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
                    topLabel: 'KALAN SÜRE',
                    target: config.countdown_target // ISO
                });
            }
        }

        // 2. Mod Seçimine Göre infoData'yı Doldur
        let selectedType = config.bottom_widget_type;
        if (!selectedType && config.module_bottom_right_type) selectedType = config.module_bottom_right_type;
        if (!selectedType) selectedType = 'auto'; // Default

        if (selectedType === 'exam') {
            infoData = rawExams;
        } else if (selectedType === 'student_of_week') {
            infoData = rawStudent;
        } else if (selectedType === 'most_improved') {
            infoData = rawImproved;
        } else if (selectedType === 'menu') {
            infoData = rawMenus;
        } else if (selectedType === 'announcement') {
            infoData = rawAnnouncements;
        } else if (selectedType === 'countdown') {
            infoData = rawCountdown;
        } else {
            // AUTO: Sadece DOLU olanları listeye ekle
            infoData = [...rawCountdown, ...rawAnnouncements, ...rawExams, ...rawMenus, ...rawStudent, ...rawImproved, ...rawTeaTalks];
        }

        // Eğer seçilen tipte veri yoksa (veya auto seçilip hepsi boşsa) boş dizide kalır.
        // Fallback: Seçilen tip boşsa, otomatik moda düşerek dolu olan diğerlerini göster.
        if (infoData.length === 0 && selectedType !== 'auto') {
            infoData = [...rawAnnouncements, ...rawExams, ...rawMenus, ...rawStudent, ...rawImproved, ...rawTeaTalks];
        }

        // 7. Video Listesi (Playlist) - Artık yukarıda (satır 322 civarı) merkezi videolarla birleştirilerek hesaplanıyor.
        // Aşağıdaki mükerrer kod merkezi videoları sildiği için kaldırıldı.

        // --- 8. BAŞLAT ---
        // --- 8. BAŞLAT (AKILLI KONTROL) ---
        if (videoPlaylist.length > 0) {
            // Eğer zaten video modundaysak ve playlist değişmediyse KARIŞMA
            const isSamePlaylist = (currentMediaState === 'video') &&
                (JSON.stringify(window.lastVideoPlaylist) === JSON.stringify(videoPlaylist));

            if (!isSamePlaylist) {
                console.log("Playlist değişti veya yeni başlatılıyor...");
                window.lastVideoPlaylist = [...videoPlaylist]; // Kopya sakla
                currentVideoIndex = 0;
                switchMedia('video');
            } else {
                console.log("Playlist aynı, video devam ediyor...");
            }
        } else {
            if (currentMediaState !== 'slide') {
                switchMedia('slide');
            }
        }

        startDormNameRotation();

        // --- 9. Bilgi Kartı Rotasyonunu Başlat ---
        // OPTIMIZASYON: Eğer sadece 1 öğe varsa rotasyonu durdur ve sabit göster.
        const currentInfoStr = JSON.stringify(infoData);
        const lastDataStr = window.lastInfoDataStr || "";

        if (infoData && infoData.length > 0) {
            // Veri değiştiyse veya henüz hiç gösterilmediyse
            if (currentInfoStr !== lastDataStr) {
                window.lastInfoDataStr = currentInfoStr;
                infoIndex = 0; // Başa al
                rotateInfo(); // Hemen göster
            }

            // Rotasyon Yönetimi
            if (infoData.length > 1) {
                // Birden fazla öğe varsa rotasyon başlat
                if (!infoRotationInterval) {
                    infoRotationInterval = setInterval(rotateInfo, 10000); // 10 saniyede bir değiştir
                }
            } else {
                // Tek öğe varsa rotasyonu durdur (sabit kalsın)
                if (infoRotationInterval) {
                    clearInterval(infoRotationInterval);
                    infoRotationInterval = null;
                }
            }
        } else {
            // Hiç veri yoksa durdur
            if (infoRotationInterval) {
                clearInterval(infoRotationInterval);
                infoRotationInterval = null;
            }
        }

        // Döngü başlatılmamışsa başlat
        if (currentMediaState === 'none') {
            playNextMedia();
        }

    } catch (error) {
        console.error("Config error:", error);
        if (document.getElementById('header-title')) {
            document.getElementById('header-title').innerText = "YÜKLEME HATASI";
            document.getElementById('header-subtitle').innerText = "Lütfen bağlantınızı kontrol edin.";
        }
    }
}

function rotateInfo() {
    // Clear previous countdown timer if exists
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    const container = document.getElementById('info-carousel');
    const cardContainer = container ? container.parentElement : null;

    if (!infoData || infoData.length === 0) {
        if (container) {
            container.style.opacity = '0';
            container.innerHTML = '';
        }
        if (cardContainer) {
            cardContainer.classList.add('hidden');
        }
        return;
    }

    // Ensure index is valid (safety check)
    if (infoIndex >= infoData.length) infoIndex = 0;

    if (cardContainer) cardContainer.classList.remove('hidden');

    // Fade out
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';

    setTimeout(() => {
        const item = infoData[infoIndex];

        // Kart arkaplan rengini ve dekorasyonları temizle
        let cardContainer = container.parentElement;
        // Tüm dekoratif ikonları temizle (megaphone vb.)
        const decos = cardContainer.querySelectorAll('.fas.fa-bullhorn.absolute');
        decos.forEach(d => d.remove());

        let mainText = document.getElementById('info-main-text');
        if (mainText) {
            mainText.classList.remove('text-5xl', 'text-4xl', 'text-2xl', 'text-xl', 'text-sm', 'leading-normal', 'leading-tight', 'whitespace-pre-wrap', 'columns-2', 'gap-8', 'text-left', 'text-center', 'w-full', 'flex', 'items-center', 'justify-center');
            mainText.style.fontSize = '';
            mainText.innerHTML = '';
        }

        document.getElementById('info-title').innerText = item.title;
        const badge = document.getElementById('info-badge');
        badge.innerText = item.badge;

        // Önemli rozeti için pulse efekti (sadece duyuruda)
        badge.classList.remove('animate-pulse');
        if (item.type === 'announcement') {
            badge.classList.add('animate-pulse');
        }
        // document.getElementById('info-circle-badge').innerHTML = item.circle; // Managed below

        // Kart arkaplan rengini değiştir (yemek için özel)
        cardContainer = container.parentElement;
        if (item.type === 'menu') {
            // Yemek menüsü için özel gradient
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-orange-700';
        } else if (item.type === 'countdown') {
            // Countdown için özel gradient (Gece mavisi / koyu tema)
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900 rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-indigo-500/50';
        } else if (item.type === 'tea') {
            // Çay Sohbetleri için sıcak amber/turuncu gradient
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-orange-500/50';
        } else if (item.type === 'announcement') {
            // Duyurular için derin gece mavisi gradient
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-blue-500/30';
            // Arka plana hafif bir megaphone ikonu ekleyelim (dekoratif)
            const decorative = document.createElement('i');
            decorative.className = 'fas fa-bullhorn absolute -right-10 -bottom-10 text-[15rem] text-white opacity-5 rotate-12 pointer-events-none';
            cardContainer.appendChild(decorative);
        } else if (item.type === 'student') {
            // Haftanın Öğrencisi için Altın/Amber Gradient
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-yellow-500 via-amber-600 to-yellow-700 rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-yellow-400/50';
            // Dekoratif Yıldızlar
            const decorative = document.createElement('i');
            decorative.className = 'fas fa-star absolute -right-8 -top-8 text-[12rem] text-white opacity-10 rotate-12 pointer-events-none';
            cardContainer.appendChild(decorative);
        } else if (item.type === 'improved') {
            // Gelişim Gösterenler için Zümrüt Yeşili Gradient
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-emerald-400/30';
            // Dekoratif Grafik İkonu
            const decorative = document.createElement('i');
            decorative.className = 'fas fa-chart-line absolute -right-5 -bottom-5 text-[10rem] text-white opacity-5 pointer-events-none';
            cardContainer.appendChild(decorative);
        } else {
            // Diğerleri için mor gradient
            cardContainer.className = 'w-2/3 bg-gradient-to-br from-[#4c1d95] to-[#7c3aed] rounded-xl shadow-lg p-5 flex flex-col relative overflow-hidden text-white border border-purple-800';
        }

        // Circle Style & Text Adjustments based on Type
        const circle = document.getElementById('info-circle-badge');

        // Reset Logic
        circle.innerHTML = '';

        // Reset custom sizing first
        circle.style.width = '';
        circle.style.height = '';

        // Reset display
        circle.style.display = 'flex';
        document.getElementById('info-top-label').style.display = 'block';

        if (item.image) {
            circle.innerHTML = `<img src="${item.image}" class="w-full h-full object-cover rounded-full shadow-lg border-4 border-white/30">`;
            circle.classList.remove('bg-yellow-500', 'bg-blue-500', 'bg-orange-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500');

            // Eğer Haftanın Öğrencisi ise Altın Çerçeve
            if (item.type === 'student') {
                circle.querySelector('img').classList.add('border-yellow-300', 'ring-4', 'ring-yellow-500/30');
            }

            // Görseli Büyüt
            circle.style.width = '7rem';
            circle.style.height = '7rem';
            circle.style.border = 'none';
            circle.classList.remove('border-4', 'border-yellow-300'); // HTML default classlarını temizle
        } else if (item.circle) {
            // Allow HTML (for icons)
            circle.innerHTML = item.circle;
            // Restore default icon border classes
            circle.style.border = ''; // Reset inline border
            circle.classList.add('border-4', 'border-yellow-300');
        } else {
            // İkon veya resim yoksa gizle
            circle.style.display = 'none';
        }

        // Color & Size Logic
        // Classes to remove
        circle.classList.remove('bg-yellow-500', 'bg-green-500', 'bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500');

        if (item.type === 'exam') {
            circle.style.fontSize = '0.9rem';
            circle.classList.add('bg-yellow-500');
        } else if (item.type === 'menu') {
            circle.style.fontSize = '1.8rem';
            circle.classList.add('bg-orange-500');
        } else if (item.type === 'student') {
            // If no image, maybe specific color
            if (!item.image) {
                circle.style.fontSize = '1.5rem';
                circle.classList.add('bg-pink-500');
            }
        } else if (item.type === 'improved') {
            circle.style.fontSize = '1.5rem';
            circle.classList.add('bg-green-500');
        } else if (item.type === 'countdown') {
            circle.style.fontSize = '1.5rem';
            circle.classList.add('bg-indigo-600');
        } else if (item.type === 'tea') {
            circle.style.fontSize = '1.5rem';
            circle.classList.add('bg-orange-500');
        } else if (item.type === 'announcement') {
            circle.style.fontSize = '2rem';
            circle.classList.add('bg-blue-600', 'shadow-2xl');
        } else {
            // Default (e.g. Announcement)
            circle.style.fontSize = '1.5rem';
            circle.classList.add('bg-blue-500');
        }

        document.getElementById('info-top-label').innerText = item.topLabel; // "BİRİNCİSİ"

        mainText = document.getElementById('info-main-text');

        // Menü ise özel HTML formatı (İkonlu Liste)
        if (item.type === 'menu') {
            const lines = item.content.split('\n').filter(l => l.trim().length > 0);

            // Her satırın başına ikon ekle
            mainText.innerHTML = lines.map(line => `
                <div class="flex items-start gap-3 mb-3 break-inside-avoid">
                    <i class="fa-solid fa-utensils text-yellow-300 mt-1.5 text-base opacity-90 shrink-0"></i>
                    <span class="font-medium">${line.trim()}</span>
                </div>
            `).join('');

            mainText.classList.add('text-xl', 'leading-normal', 'columns-2', 'gap-8', 'text-left');

        } else if (item.type === 'tea') {
            mainText.innerHTML = `
                <div class="flex flex-col items-center justify-center space-y-4">
                    <span class="text-4xl font-black uppercase tracking-tight drop-shadow-md text-white">${item.content}</span>
                    <div class="flex items-center gap-3 text-2xl font-bold bg-white/10 px-5 py-2.5 rounded-full backdrop-blur-md shadow-2xl border border-white/20">
                        <i class="far fa-calendar-alt text-orange-200 opacity-90"></i>
                        <span class="text-orange-100">${item.date}</span>
                        <span class="w-1.5 h-1.5 bg-white/30 rounded-full"></span>
                        <span class="text-orange-50 font-black">${item.time}</span>
                    </div>
                </div>
            `;
            mainText.classList.add('text-center');
            mainText.classList.remove('text-2xl', 'whitespace-pre-wrap', 'columns-2', 'gap-8', 'text-left');
        } else if (item.type === 'exam') {
            // Sınav Şampiyonları: Özel Yatay Tasarım
            circle.style.display = 'none'; // Üstteki yuvarlağı gizle
            document.getElementById('info-top-label').style.display = 'none'; // Üstteki TEBRİK EDERİZ yazısını gizle

            let imgHTML = '';
            if (item.image) {
                imgHTML = `<img src="${item.image}" class="w-[8vh] h-[8vh] object-cover rounded-full border-[0.3vh] border-yellow-300 shadow-md shrink-0">`;
            } else {
                imgHTML = `<div class="w-[8vh] h-[8vh] bg-yellow-500 rounded-full border-[0.3vh] border-yellow-300 shadow-md flex items-center justify-center shrink-0"><i class="fa-solid fa-medal text-[3.5vh] text-white"></i></div>`;
            }

            mainText.innerHTML = `
            <div class="flex items-center w-full gap-[1vw] bg-white/10 rounded-2xl p-[1vh] shadow-inner mt-[1vh] overflow-hidden border border-white/20">
                ${imgHTML}
                <div class="flex flex-col flex-1 text-left justify-center overflow-hidden min-w-0">
                    <span class="text-yellow-300 text-[1.4vh] font-black uppercase tracking-wider drop-shadow-sm truncate">${item.rawClass || ''}</span>
                    <span class="text-white text-[2.6vh] font-extrabold leading-tight drop-shadow-md truncate">${item.rawName || ''}</span>
                </div>
                ${item.rawScore ? `
                <div class="shrink-0 bg-green-500 text-white px-[1vw] py-[0.5vh] rounded-xl border-[0.2vh] border-green-400 shadow-xl flex items-center justify-center">
                    <span class="text-[2.2vh] font-black leading-none">${item.rawScore} <span class="text-[1.2vh] opacity-80">PUAN</span></span>
                </div>` : ''}
            </div>
            `;
            
            mainText.classList.remove('text-2xl', 'whitespace-pre-wrap', 'columns-2', 'gap-8', 'text-left');
            mainText.classList.add('w-full', 'px-0');
            mainText.style.fontSize = ''; 
            
        } else if (item.type === 'announcement') {
            const container = mainText.parentElement;

            // 1. Reset & Clear to Measure Pure Container
            mainText.className = '';
            mainText.style.cssText = '';
            mainText.innerHTML = ''; // Clear content so container resets to natural size

            // Measure "Empty" Container
            const availableHeight = container.clientHeight;
            const availableWidth = container.clientWidth;

            // 2. Set Content & Styles
            mainText.innerHTML = item.content;

            // V5: Explicit Pixel Height & Strict Overflow
            mainText.classList.add('w-full', 'flex', 'items-center', 'justify-center', 'text-center', 'leading-tight', 'px-8', 'py-2', 'font-black', 'uppercase', 'tracking-normal', 'drop-shadow-md', 'overflow-hidden');
            mainText.style.wordBreak = 'break-word';

            // FORCE HEIGHT TO PIXEL VALUE
            // This prevents the flex container from expanding at all
            if (availableHeight > 0) {
                mainText.style.height = availableHeight + 'px';
                mainText.style.maxHeight = availableHeight + 'px';
            } else {
                // Fallback if measurement failed (hidden tab etc)
                mainText.classList.add('h-full', 'max-h-full');
            }

            // 3. Auto-Scale Logic
            let fontSize = 3.2;
            mainText.style.fontSize = `${fontSize}rem`;

            let iterations = 0;
            // Check overflow against the CLAMPED clientHeight
            while (
                (mainText.scrollHeight > mainText.clientHeight || mainText.scrollWidth > availableWidth)
                && fontSize > 0.5
                && iterations < 100
            ) {
                fontSize -= 0.1;
                mainText.style.fontSize = `${fontSize}rem`;
                iterations++;
            }

        } else if (item.type === 'countdown') {
            // COUNTDOWN RENDER
            mainText.classList.add('text-center', 'w-full', 'flex', 'items-center', 'justify-center');
            mainText.style.fontSize = '';

            const targetDate = new Date(item.target).getTime();

            const updateTimer = () => {
                const now = new Date().getTime();
                const distance = targetDate - now;

                if (distance < 0) {
                    mainText.innerHTML = '<div class="text-3xl font-bold text-yellow-400 animate-pulse">SÜRE DOLDU!</div>';
                    if (countdownInterval) clearInterval(countdownInterval);
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                // Modern Grid Layout
                mainText.innerHTML = `
                    <div class="grid grid-cols-4 gap-2 w-full max-w-sm">
                        <div class="bg-white/10 rounded-lg p-1.5 text-center backdrop-blur-sm border border-white/10">
                            <div class="text-3xl md:text-4xl font-black text-white leading-none mb-0.5">${days}</div>
                            <div class="text-[0.6rem] uppercase tracking-wider text-indigo-200 font-bold">GÜN</div>
                        </div>
                        <div class="bg-white/10 rounded-lg p-1.5 text-center backdrop-blur-sm border border-white/10">
                            <div class="text-3xl md:text-4xl font-black text-white leading-none mb-0.5">${hours}</div>
                            <div class="text-[0.6rem] uppercase tracking-wider text-indigo-200 font-bold">SAAT</div>
                        </div>
                        <div class="bg-white/10 rounded-lg p-1.5 text-center backdrop-blur-sm border border-white/10">
                            <div class="text-3xl md:text-4xl font-black text-white leading-none mb-0.5">${minutes}</div>
                            <div class="text-[0.6rem] uppercase tracking-wider text-indigo-200 font-bold">DK</div>
                        </div>
                        <div class="bg-indigo-500/20 rounded-lg p-1.5 text-center backdrop-blur-sm border border-indigo-400/30">
                            <div class="text-3xl md:text-4xl font-black text-yellow-300 leading-none mb-0.5">${seconds}</div>
                            <div class="text-[0.6rem] uppercase tracking-wider text-indigo-200 font-bold">SN</div>
                        </div>
                    </div>
                `;
            };

            updateTimer(); // Initial call
            countdownInterval = setInterval(updateTimer, 1000);

        } else if (item.type === 'student') {
            mainText.innerHTML = `
                <div class="flex flex-col items-center justify-center">
                    <div class="text-[0.7rem] font-black tracking-[0.2em] text-yellow-200 mb-1 opacity-80 uppercase">HAFTANIN YILDIZI</div>
                    <span class="text-4xl font-black uppercase tracking-tight drop-shadow-lg text-white mb-2">${item.content}</span>
                    <div class="inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                        <i class="fas fa-medal text-yellow-500"></i>
                        <span class="text-xs font-bold text-yellow-100 uppercase tracking-wider">${item.badge}</span>
                    </div>
                </div>
            `;
            mainText.classList.add('text-center');
        } else if (item.type === 'improved') {
            const points = item.points || "0";
            mainText.innerHTML = `
                <div class="flex flex-col items-center justify-center">
                    <span class="text-4xl font-black uppercase tracking-tight drop-shadow-lg text-white mb-2">${item.content}</span>
                    <div class="flex items-center gap-4">
                        <div class="bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-400/30">
                            <span class="text-[0.6rem] font-bold text-emerald-200 uppercase block leading-none mb-1">DERECE</span>
                            <span class="text-lg font-black text-white leading-none">${item.badge}</span>
                        </div>
                        <div class="bg-emerald-400 text-emerald-950 px-3 py-1 rounded-lg font-black flex items-center gap-1.5 shadow-lg transform rotate-2">
                            <i class="fas fa-arrow-up text-sm"></i>
                            <span class="text-lg">+${points}</span>
                        </div>
                    </div>
                </div>
            `;
            mainText.classList.add('text-center');
        } else {
            // Temizle ve Hazırla
            mainText.innerHTML = item.content;
            mainText.classList.remove('text-xl', 'text-sm', 'leading-normal', 'columns-2', 'gap-8', 'text-left');
            mainText.style.fontSize = ''; // Reset inline styles
            mainText.style.whiteSpace = '';

            if (item.type === 'announcement') {
                // Duyurular: Normal Wrapping, ama taşarsa küçült
                mainText.classList.add('text-center', 'whitespace-pre-wrap');
                mainText.classList.remove('text-2xl', 'text-xl');

                // Başlangıç boyutu
                let size = 1.5; // 1.5rem ~ 24px (text-2xl)
                mainText.style.fontSize = size + 'rem';
                mainText.style.lineHeight = '1.3';

                // DOM güncellemesi sonrası taşma kontrolü
                // (Senkron çalışır çünkü içerik değişti, browser layout'u hesaplar)
                // Max iterasyon: 30 (0.7rem'e kadar iner)
                let iterations = 0;
                // scrollHeight > clientHeight olduğu sürece küçült
                while (mainText.scrollHeight > mainText.clientHeight && size > 0.7 && iterations < 30) {
                    size -= 0.05;
                    mainText.style.fontSize = size + 'rem';
                    iterations++;
                }

            } else {
                // İsimler/Sınavlar: Tek satıra sığdırmaya çalış (Auto-Scale Horizontal)
                mainText.classList.add('text-center');
                mainText.classList.remove('whitespace-pre-wrap');
                mainText.style.whiteSpace = 'nowrap';
                mainText.style.fontSize = '1.7rem'; // Başlangıç

                // Sığana kadar küçült (Min: 0.9rem)
                let size = 1.7;
                let iterations = 0;
                while (mainText.scrollWidth > mainText.clientWidth && iterations < 20) {
                    size -= 0.1;
                    mainText.style.fontSize = size + 'rem';
                    iterations++;
                }
            }
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

// function updateDormNames() logic replacement
function updateDormNames() {
    renderDormList('dorm1-students', dorm1Names);
    renderDormList('dorm2-students', dorm2Names);
}

function renderDormList(containerId, names) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // Fallback if empty
    if (!names || names.length === 0) {
        for (let i = 0; i < 6; i++) {
            const div = document.createElement('div');
            div.className = 'truncate py-1 border-b border-white/10 opacity-50';
            div.innerText = '---';
            container.appendChild(div);
        }
        return;
    }

    names.forEach((name, index) => {
        const div = document.createElement('div');
        // Son 2 elemanda border-b olmasın (grid 2 col olduğu için)
        // Eğer tek sayıysa son eleman border'sız, çift ise son 2.
        // Basit mantık: Her satırın altını çiz, en alt satır hariç.
        // Grid 2 col ise: 
        // 0 1 -> border-b
        // 2 3 -> border-b
        // ...
        // length 6: 0,1,2,3 border-b. 4,5 no border.

        let hasBorder = true;
        const total = names.length;
        // Son satırda mı?
        // Row index: Math.floor(index / 2)
        // Total rows: Math.ceil(total / 2)
        const rowIndex = Math.floor(index / 2);
        const totalRows = Math.ceil(total / 2);

        if (rowIndex === totalRows - 1) hasBorder = false;

        div.className = `truncate py-1 ${hasBorder ? 'border-b border-white/10' : ''}`;
        div.innerText = name;
        div.title = name; // Tooltip for truncated text
        container.appendChild(div);
    });
}

// Başlangıçta verileri çek
fetchConfig();


// --- YOUTUBE API ---
// --- YOUTUBE & HYBRID LOOP ---

// Galeriyi Çek (Yerel klasörden)
async function fetchGalleryImages() {
    // ...
}

function onYouTubeIframeAPIReady() {
    isYoutubeReady = true;
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'rel': 0,
            'showinfo': 0,
            'mute': 0, // Unmuted playback directly requested
            'modestbranding': 1,
            'loop': 0,
            'cc_load_policy': 1, // Force Subtitles
            'cc_lang_pref': 'tr', // Turkish subtitles specifically
            'hl': 'tr' // Turkish UI
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    // Eğer config yüklendiğinde video modu seçildiyse ve başlatılamadıysa şimdi başlat
    if (pendingVideoPlay || currentMediaState === 'video') {
        playCurrentVideo();
    }
}

function onPlayerError(event) {
    console.error("Youtube Player Error:", event.data);
    // Hata durumunda bir sonraki videoya geç
    playNextVideoOrSlide();
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        // Video oynamaya başlayınca sesi aç (Browser politikasını aşmak için)
        player.unMute();
        player.setVolume(100);
    }
    if (event.data == YT.PlayerState.ENDED) {
        playNextVideoOrSlide();
    }
}

function playNextVideoOrSlide() {
    // Toplam içerik sayısını kontrol et (Akıllı Döngü için)
    const totalContent = localVideos.length + localSlides.length + centralVideos.length + centralSlides.length;

    // Eğer sistemde SADECE 1 içerik varsa ve o da video ise, hiç beklemeden loop yap
    if (totalContent === 1 && videoPlaylist.length === 1) {
        console.log("[DÖNGÜ] Tek video tespit edildi, sonsuz döngü başlatılıyor.");
        currentVideoIndex = 0;
        playCurrentVideo();
        return;
    }

    currentVideoIndex++;
    
    // Mevcut adımdaki video listesini kontrol et
    if (videoPlaylist && currentVideoIndex < videoPlaylist.length) {
        playCurrentVideo();
    } else {
        // Bu adımdaki videolar bitti, bir sonraki adıma (genelde slayt) geç
        if (currentMediaStep === 0) currentMediaStep = 1; // Kurum Videoları -> Kurum Slaytları
        else if (currentMediaStep === 2) currentMediaStep = 3; // Merkezi Videolar -> Merkezi Slaytlar
        
        currentVideoIndex = 0;
        playNextMedia();
    }
}

function playCurrentVideo() {
    const rawUrl = videoPlaylist[currentVideoIndex];
    if (!rawUrl) {
        playNextVideoOrSlide();
        return;
    }

    const vid = extractVideoID(rawUrl);
    const playerEl = document.getElementById('player');
    const nativePlayer = document.getElementById('native-player');
    const low = rawUrl.toLowerCase();

    // Helper: Google Drive file ID
    function extractGDriveId(url) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    // YouTube mu yoksa Native mi?
    if (vid) {
        // --- YOUTUBE S\u0130STEM\u0130 ---
        if (!player || typeof player.loadVideoById !== 'function') {
            pendingVideoPlay = true;
            return;
        }
        pendingVideoPlay = false;

        if (nativePlayer) nativePlayer.classList.add('hidden');
        if (playerEl) playerEl.classList.remove('hidden');

        player.loadVideoById(vid);
        player.mute(); // Autoplay garantisi i\u00E7in \u00F6nce sessiz
        player.playVideo();
        
        // 1 sn sonra ses a\u00E7may\u0131 dene
        setTimeout(() => {
            if (player && typeof player.unMute === 'function') {
                player.unMute();
                player.setVolume(100);
            }
        }, 1000);
    } else if (low.includes('drive.google.com')) {
        // --- GOOGLE DRIVE S\u0130STEM\u0130 ---
        const gid = extractGDriveId(rawUrl);
        if (!gid) {
            console.warn("Google Drive ID bulunamad\u0131:", rawUrl);
            playNextVideoOrSlide();
            return;
        }

        // Google Drive videosu: preview URL ile native video player kullan
        const drivePreviewUrl = `https://drive.google.com/uc?export=download&id=${gid}`;
        
        if (!nativePlayer) {
            // Alternatif: iframe ile embed
            if (playerEl) {
                playerEl.classList.remove('hidden');
                playerEl.src = `https://drive.google.com/file/d/${gid}/preview`;
                // Google Drive embed i\u00E7in timeout ile sonraki videoya ge\u00E7
                setTimeout(() => playNextVideoOrSlide(), 60000); // 60sn sonra ge\u00E7
            }
            return;
        }

        if (playerEl) playerEl.classList.add('hidden');
        if (player && typeof player.stopVideo === 'function') player.stopVideo();

        nativePlayer.classList.remove('hidden');
        nativePlayer.src = drivePreviewUrl;
        nativePlayer.muted = true;
        nativePlayer.play().then(() => {
            setTimeout(() => { nativePlayer.muted = false; }, 1000);
        }).catch(err => {
            console.warn("Google Drive native play ba\u015Far\u0131s\u0131z, iframe deneniyor:", err);
            // Fallback: iframe embed
            if (playerEl) {
                nativePlayer.classList.add('hidden');
                playerEl.classList.remove('hidden');
                playerEl.src = `https://drive.google.com/file/d/${gid}/preview`;
                setTimeout(() => playNextVideoOrSlide(), 60000);
            } else {
                playNextVideoOrSlide();
            }
        });

        if (!nativePlayer.onended) {
            nativePlayer.onended = () => playNextVideoOrSlide();
            nativePlayer.onerror = () => playNextVideoOrSlide();
        }
    } else if (low.includes('.mp4') || low.includes('.mov') || low.includes('.webm')) {
        // --- NATIVE VIDEO S\u0130STEM\u0130 ---
        if (!nativePlayer) {
            playNextVideoOrSlide();
            return;
        }

        if (playerEl) playerEl.classList.add('hidden');
        if (player && typeof player.stopVideo === 'function') player.stopVideo();
        
        nativePlayer.classList.remove('hidden');
        nativePlayer.src = rawUrl;
        nativePlayer.muted = true; // Autoplay garantisi
        nativePlayer.play().then(() => {
            setTimeout(() => { nativePlayer.muted = false; }, 1000);
        }).catch(err => {
            console.error("Native play error:", err);
            playNextVideoOrSlide();
        });

        // Eventler (E\u011Fer atanmam\u0131\u015Fsa)
        if (!nativePlayer.onended) {
            nativePlayer.onended = () => playNextVideoOrSlide();
            nativePlayer.onerror = () => playNextVideoOrSlide();
        }
    } else {
        // Tan\u0131mlanamayan format
        console.warn("Ge\u00E7ersiz veya Desteklenmeyen Video:", rawUrl);
        playNextVideoOrSlide();
    }
}



// Helper: Youtube ID
function extractVideoID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

// Medya Döngü Kontrolü
    // --- 4 ADIMLI MEDYA DÖNGÜSÜ YARDIMCI FONKSİYONLARI ---
    
    function updateSwiperContent(images) {
        const wrapper = document.getElementById('slide-wrapper');
        if (!wrapper) return;
        
        wrapper.innerHTML = '';
        if (!images || images.length === 0) return;

        images.forEach(url => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide flex items-center justify-center bg-black';
            slide.innerHTML = `<img src="${url}" class="w-full h-full object-contain" />`;
            wrapper.appendChild(slide);
        });

        if (window.mySwiperInstance) {
            try {
                // Mevcut tüm zamanlayıcıları temizle
                if (window.reachEndTimeout) {
                    clearTimeout(window.reachEndTimeout);
                    window.reachEndTimeout = null;
                }
                
                window.mySwiperInstance.update();
                window.mySwiperInstance.slideTo(0);
                
                // --- GARANTİLİ ADIM ROTASYONU ---
                // Slayt sayısı ne olursa olsun (1 veya daha fazla), 
                // her slayt için 12 saniye bekleyip sonraki ADIMA geçmeyi garantiliyoruz.
                const totalStepDuration = images.length * 12000;
                console.log(`[DÖNGÜ] Adım Süresi: ${totalStepDuration/1000}sn (Slayt: ${images.length})`);

                window.reachEndTimeout = setTimeout(() => {
                    if (currentMediaState !== 'slide') return;
                    
                    console.log("[DÖNGÜ] Adım süresi bitti, sonraki adıma geçiliyor.");
                    // Bir sonraki adıma zorla geç
                    if (currentMediaStep === 1) currentMediaStep = 2;
                    else if (currentMediaStep === 3) currentMediaStep = 0;
                    
                    currentVideoIndex = 0;
                    playNextMedia();
                }, totalStepDuration);

                // Eğer birden fazla görsel varsa Swiper autoplay'i başlat
                if (images.length > 1) {
                    window.mySwiperInstance.autoplay.start();
                } else {
                    window.mySwiperInstance.autoplay.stop();
                }
            } catch (e) { console.error("Swiper güncelleme hatası:", e); }
        }
    }

    function playNextMedia() {
        console.log(`[DÖNGÜ] Adım: ${currentMediaStep}, Video Index: ${currentVideoIndex}`);

        if (currentMediaStep === 0) { // 1. Kurum Videoları
            if (localVideos.length > 0 && currentVideoIndex < localVideos.length) {
                // videoPlaylist'i bu adıma göre güncelle
                videoPlaylist = localVideos; 
                switchMedia('video');
            } else {
                // Yerel video yok veya bitti, slayta geç
                currentMediaStep = 1;
                currentVideoIndex = 0;
                playNextMedia();
            }
        } 
        else if (currentMediaStep === 1) { // 2. Kurum Slaytları
            if (localSlides.length > 0) {
                updateSwiperContent(localSlides);
                switchMedia('slide');
            } else {
                // Yerel slayt yok, merkezi videolara geç
                currentMediaStep = 2;
                currentVideoIndex = 0;
                playNextMedia();
            }
        }
        else if (currentMediaStep === 2) { // 3. Merkezi Videolar
            if (centralVideos.length > 0 && currentVideoIndex < centralVideos.length) {
                videoPlaylist = centralVideos;
                switchMedia('video');
            } else {
                // Merkezi video yok veya bitti, merkezi slayta geç
                currentMediaStep = 3;
                currentVideoIndex = 0;
                playNextMedia();
            }
        }
        else if (currentMediaStep === 3) { // 4. Merkezi Slaytlar
            if (centralSlides.length > 0) {
                updateSwiperContent(centralSlides);
                switchMedia('slide');
            } else {
                // Başa dön ama her şey boşsa sonsuz döngüye girmemek için kısa bir bekleme koy
                currentMediaStep = 0;
                currentVideoIndex = 0;
                setTimeout(() => playNextMedia(), 5000);
            }
        }
    }

    function switchMedia(type) {
        const playerContainer = document.getElementById('right-gallery-wrapper');
        const swiperEl = document.querySelector('.mySwiper');
        const playerEl = document.getElementById('player');

        // Temizle
        if (slideIntervalHandle) {
            clearTimeout(slideIntervalHandle);
            slideIntervalHandle = null;
        }

        if (window.mySwiperInstance && window.mySwiperInstance.autoplay) {
            window.mySwiperInstance.autoplay.stop();
        }

        if (type === 'video') {
            currentMediaState = 'video';
            if (playerContainer) playerContainer.classList.remove('hidden');
            if (swiperEl) swiperEl.classList.add('hidden');
            if (playerEl) playerEl.classList.remove('hidden');
            // Native player'ı sakla
            const nativePlayer = document.getElementById('native-player');
            if (nativePlayer) nativePlayer.classList.add('hidden');

            playCurrentVideo();
        } else if (type === 'slide') {
            currentMediaState = 'slide';
            if (playerContainer) playerContainer.classList.remove('hidden');
            if (swiperEl) swiperEl.classList.remove('hidden');
            if (playerEl) playerEl.classList.add('hidden');

            if (player && typeof player.stopVideo === 'function') player.stopVideo();
            const nativePlayer = document.getElementById('native-player');
            if (nativePlayer) {
                nativePlayer.pause();
                nativePlayer.classList.add('hidden');
            }

            // Swiper Başlatma
            if (!window.mySwiperInstance) {
                window.mySwiperInstance = new Swiper(".mySwiper", {
                    spaceBetween: 30,
                    effect: "fade",
                    centeredSlides: true,
                    fadeEffect: { crossFade: true },
                    observer: true,
                    observeParents: true,
                    autoplay: { delay: 12000, disableOnInteraction: false },
                    loop: false,
                    speed: 1500,
                    on: {
                        // reachEnd artık manuel setTimeout tarafından yönetiliyor, 
                        // çakışmaları önlemek için burayı sadeleştiriyoruz.
                        reachEnd: function () {
                            console.log("[DÖNGÜ] Swiper sonuna ulaştı (Otomatik geçiş zamanlayıcısı devrede)");
                        },
                        slideChange: function () {
                            if (!this.isEnd && window.reachEndTimeout) {
                                clearTimeout(window.reachEndTimeout);
                                window.reachEndTimeout = null;
                            }
                        }
                    }
                });
        } else {
            window.mySwiperInstance.update();
            window.mySwiperInstance.slideTo(0);
            window.mySwiperInstance.autoplay.start();
        }
    }
}


// --- WEATHER API (Open-Meteo with Geocoding) ---
async function fetchWeather() {
    try {
        const city = window.configLocation?.city || 'Istanbul';
        const district = window.configLocation?.district || 'Uskudar';

        // Helper to fetch geo
        const getGeo = async (q) => {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=tr&format=json`;
            const r = await fetch(url);
            return await r.json();
        };

        // Strategy 1: "District + City + Turkey" (Most Precise)
        let searchQueries = [
            `${district} ${city} Turkey`,
            `${district} Turkey`,
            `${city} Turkey`
        ];

        // Display Name Preference: District > City > Istanbul
        let displayName = (district || city || 'ISTANBUL').toUpperCase();
        let location = null;

        for (const q of searchQueries) {
            try {
                const geoData = await getGeo(q);
                if (geoData.results && geoData.results.length > 0) {
                    location = geoData.results[0];
                    break;
                }
            } catch (e) { console.log("Geo search err:", e); }
        }

        // Fallback: Istanbul (Reliable)
        if (!location) {
            console.warn("Konum bulunamadı, varsayılana (Istanbul) dönülüyor.");
            try {
                // Direct fallback to coordinates if search fails to avoid loop
                location = {
                    latitude: 41.0082,
                    longitude: 28.9784,
                    name: 'Istanbul',
                    country: 'Turkey'
                };
                // Do NOT overwrite displayName here, keep user's preference
            } catch (e) { }
        }

        if (!location) throw new Error("Konum servisi yanıt vermiyor.");

        // 2. Weather Data
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();
        const current = weatherData.current_weather;

        const temp = current.temperature;
        const wmoCode = current.weathercode;

        // 3. WMO Code Mapping
        const { icon, desc } = getWeatherInfo(wmoCode);

        // --- WEATHER ANIMATIONS ---
        // --- WEATHER ANIMATIONS & GLOBAL OVERLAY ---
        const weatherCard = document.getElementById('weather-card');
        const globalOverlay = document.getElementById('global-weather-overlay');

        // Reset Global Overlay (keep base classes)
        if (globalOverlay) globalOverlay.className = 'fixed inset-0 pointer-events-none z-50';

        if (weatherCard) {
            // Reset Card
            weatherCard.classList.remove('anim-rain', 'anim-snow', 'anim-storm', 'anim-cloud');

            // Logic
            if (
                (wmoCode >= 51 && wmoCode <= 67) ||
                (wmoCode >= 80 && wmoCode <= 82)
            ) {
                weatherCard.classList.add('anim-rain');
                if (globalOverlay) globalOverlay.classList.add('global-rain-overlay');
            } else if (
                (wmoCode >= 71 && wmoCode <= 77) ||
                (wmoCode >= 85 && wmoCode <= 86)
            ) {
                weatherCard.classList.add('anim-snow');
                if (globalOverlay) globalOverlay.classList.add('global-snow-overlay');
            } else if (wmoCode >= 95 && wmoCode <= 99) {
                weatherCard.classList.add('anim-storm');
                // Storm implies rain globally
                if (globalOverlay) globalOverlay.classList.add('global-rain-overlay');
            } else if (wmoCode >= 1 && wmoCode <= 3 || wmoCode === 45 || wmoCode === 48) {
                weatherCard.classList.add('anim-cloud');
            }
        }

        // 4. Update UI
        if (document.getElementById('weather-temp')) {
            document.getElementById('weather-temp').innerHTML = `${icon} ${Math.round(temp)}°C`;
            document.getElementById('weather-desc').innerText = displayName;

            if (document.getElementById('weather-condition')) {
                document.getElementById('weather-condition').innerText = desc;
            }
        }
        if (document.getElementById('weather-icon')) document.getElementById('weather-icon').innerHTML = icon;

    } catch (e) {
        console.error("Hava durumu hatası:", e);
        if (document.getElementById('weather-condition')) {
            document.getElementById('weather-condition').innerText = "Hata: " + e.message;
        }
    }
}

function getWeatherInfo(code) {
    // WMO Weather interpretation codes (WW)
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55: Drizzle
    // 61, 63, 65: Rain
    // 71, 73, 75: Snow
    // 77: Snow grains
    // 80, 81, 82: Rain showers
    // 85, 86: Snow showers
    // 95: Thunderstorm
    // 96, 99: Thunderstorm with slight and heavy hail

    // SVG Icons (Performance: Removed drop-shadows)
    const sun = '<svg class="w-10 h-10 text-yellow-400 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M6.99 11L7 11.03C7.03 14.33 9.69 17 13 17C16.3 17 18.96 14.34 19 11.05C19.03 8.35 17.29 6.01 14.9 4.9C14.75 3.32 13.43 2.1 11.85 2.1C10.08 2.1 8.65 3.53 8.65 5.3C8.65 5.71 8.74 6.1 8.9 6.45C7.26 7.37 6.99 9.38 6.99 11ZM12 7C14.21 7 16 8.79 16 11C16 13.21 14.21 15 12 15C9.79 15 8 13.21 8 11C8 8.79 9.79 7 12 7Z" /></svg>';
    const cloud = '<svg class="w-10 h-10 text-gray-200 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.64-4.96z"/></svg>';
    const rain = '<svg class="w-10 h-10 text-blue-300 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M4.13 12C4.05 11.36 4 10.69 4 10C4 5.58 7.58 2 12 2C16.42 2 20 5.58 20 10C20 10.69 19.95 11.36 19.87 12H20C21.66 12 23 13.34 23 15C23 16.66 21.66 18 20 18H5C3.34 18 2 16.66 2 15C2 13.34 3.34 12 5 12H4.13ZM8 15V19H10V15H8ZM14 15V19H16V15H14Z"/></svg>';
    const snow = '<svg class="w-10 h-10 text-white inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M22 11H20.08L21.5 9.59L20.09 8.17L18.67 9.59L17.26 8.17L18.67 6.76L17.26 5.34L15.84 6.76L14.43 5.34L15.84 3.93L14.43 2.5L13 3.93V2H11V3.93L9.57 2.5L8.16 3.93L9.57 5.34L8.16 6.76L6.74 5.34L5.33 6.76L6.74 8.17L5.33 9.59L3.91 8.17L2.5 9.59L3.92 11H2V13H3.92L2.5 14.41L3.91 15.83L5.33 14.41L6.74 15.83L5.33 17.24L6.74 18.66L8.16 17.24L9.57 18.66L8.16 20.07L9.57 21.5L11 20.07V22H13V20.07L14.43 21.5L15.84 20.07L14.43 18.66L15.84 17.24L14.43 15.83L15.84 14.41L17.26 15.83L18.67 14.41L20.09 15.83L21.5 14.41L20.08 13H22V11Z"/></svg>';
    const storm = '<svg class="w-10 h-10 text-yellow-300 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 1.25.38 2.4 1.03 3.35L11.5 22l-1.92-3.84L8 19l2-4h-2l3-6v4h2l-1.5 3.5c1.17 1 2.72 1.5 4.5 1.5 3.31 0 6-2.69 6-6h-2.65z"/></svg>';
    const fog = '<svg class="w-10 h-10 text-gray-300 inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M6 16H18V18H6V16ZM6 12H18V14H6V12ZM4 8H20V10H4V8Z"/></svg>';

    if (code === 0) return { icon: sun, desc: 'Açık' };
    if (code >= 1 && code <= 3) return { icon: cloud, desc: 'Parçalı Bulutlu' };
    if (code === 45 || code === 48) return { icon: fog, desc: 'Sisli' };
    if (code >= 51 && code <= 55) return { icon: rain, desc: 'Çiseleme' };
    if (code >= 61 && code <= 65) return { icon: rain, desc: 'Yağmurlu' };
    if (code >= 71 && code <= 77) return { icon: snow, desc: 'Karlı' };
    if (code >= 80 && code <= 82) return { icon: rain, desc: 'Sağanak' };
    if (code >= 85 && code <= 86) return { icon: snow, desc: 'Kar Sağanağı' };
    if (code >= 95) return { icon: storm, desc: 'Fırtına' };

    return { icon: sun, desc: 'Açık' };
}

// Initial Fetch and Interval
// fetchWeather() is called in fetchConfig after location is set
setInterval(fetchWeather, 30 * 60 * 1000); // 30 Mins

// Auto Refresh Page every 60 minutes to fetch new code/config cleanly and clear memory
setTimeout(() => {
    window.location.reload();
}, 60 * 60 * 1000);

// --- SOL GALERİ ROTASYONU ---
// (Değişkenler yukarı taşındı)

// Sol galeri görsellerini yükle
/*
// Sol galeri görsellerini yükle
async function fetchLeftGalleryImages() {
    try {
        // Get slug from URL
        const path = window.location.pathname;
        let slug = path.split('/')[1] || '';

        const ignoredBundles = ['index.html', 'index', 'board.html', 'board'];
        if (ignoredBundles.includes(slug.toLowerCase())) {
            slug = '';
        }

        if (!slug) {
            console.log('No slug, skipping left gallery');
            return;
        }

        const response = await fetch(`/api/get-left-gallery?slug=${slug}`);
        const data = await response.json();

        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            leftGalleryImages = data.images;
            console.log(`Left gallery loaded: ${leftGalleryImages.length} images`);
            startLeftGalleryRotation();
        } else {
            console.log('No left gallery images found');
            leftGalleryImages = [];
            document.getElementById('left-gallery-container').classList.add('hidden');
            document.getElementById('left-normal-content').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Left gallery fetch error:', error);
        leftGalleryImages = [];
    }
}
*/


// Sol galeri rotasyonunu başlat
function startLeftGalleryRotation() {
    if (leftGalleryImages.length === 0) {
        document.getElementById('left-gallery-container').classList.add('hidden');
        document.getElementById('left-normal-content').classList.remove('hidden');
        return;
    }

    // Mevcut timeout'u temizle
    if (leftGalleryTimeout) clearTimeout(leftGalleryTimeout);

    // İndeksi sıfırla
    leftGalleryIndex = 0;

    // --- MANUEL DÜZELTME: Önce Hadis görünsün, sonra Galeri ---
    // Galeriyi gizle, Normal içeriği göster
    document.getElementById('left-gallery-container').classList.add('hidden');
    document.getElementById('left-normal-content').classList.remove('hidden');

    // 15 saniye Hadis/Normal içerik göster, sonra galeriye geç
    console.log("Sol galeri rotasyonu başlatıldı (15sn gecikmeli)...");
    leftGalleryTimeout = setTimeout(() => {
        showLeftGalleryImage();
    }, 15000);
}

// Görseli göster (Tek kutu)
// Görseli göster (Tek kutu - Efektli Geçiş)
function showLeftGalleryImage() {
    const galleryContainer = document.getElementById('left-gallery-container');
    const galleryImage = document.getElementById('left-gallery-image');
    const normalContent = document.getElementById('left-normal-content');

    // Güvenlik Kontrolü
    if (!leftGalleryImages || leftGalleryImages.length === 0) {
        galleryContainer.classList.add('hidden');
        normalContent.classList.remove('hidden');
        return;
    }

    // İndeks kontrolü
    if (leftGalleryIndex >= leftGalleryImages.length) {
        leftGalleryIndex = 0;
    }

    // Mevcut görseli al
    const currentImage = leftGalleryImages[leftGalleryIndex];

    if (!currentImage) {
        // Görsel yoksa normal içeriğe dön (Siyah ekranı engelle)
        galleryContainer.classList.add('hidden');
        normalContent.classList.remove('hidden');
        return;
    }

    // İlk açılış mı kontrolü (Container gizliyse)
    if (galleryContainer.classList.contains('hidden')) {
        galleryImage.src = currentImage;
        galleryImage.style.opacity = '0'; // Başlangıçta gizli
        galleryImage.style.transform = 'scale(0.95)';

        galleryContainer.classList.remove('hidden');
        normalContent.classList.add('hidden');

        // Hafif gecikmeyle göster (CSS transition tetiklensin)
        setTimeout(() => {
            galleryImage.style.opacity = '1';
            galleryImage.style.transform = 'scale(1)';
        }, 100);

    } else {
        // Zaten açık, görsel değiştir (Fade Out -> Change -> Fade In)
        galleryImage.style.opacity = '0';
        galleryImage.style.transform = 'scale(0.95)';

        setTimeout(() => {
            galleryImage.src = currentImage;
            galleryImage.style.opacity = '1';
            galleryImage.style.transform = 'scale(1)';
        }, 700); // CSS duration ile aynı olmalı
    }

    // Sonraki görsele geç
    leftGalleryIndex++;

    // Eğer tüm görseller gösterildiyse
    if (leftGalleryIndex >= leftGalleryImages.length) {
        // 10 saniye sonra galeriyi gizle (GÜNCELLENDİ: 18sn)
        leftGalleryTimeout = setTimeout(() => {
            // Eğer tam bekleme aşamasındayken config fetch tetiklenirse,
            // startLeftGalleryRotation indexi 0 yapacak, bu timeout çakışabilir.
            // Bu yüzden normalContent checki yapıyoruz.
            galleryContainer.classList.add('hidden');
            normalContent.classList.remove('hidden');

            // 20 saniye bekle, sonra tekrar başla
            leftGalleryTimeout = setTimeout(() => {
                leftGalleryIndex = 0;
                showLeftGalleryImage();
            }, 20000); // 20 saniye bekleme
        }, 18000); // Son görseli 18 saniye göster
    } else {
        // 18 saniye sonra bir sonraki görseli göster
        leftGalleryTimeout = setTimeout(showLeftGalleryImage, 18000);
    }
}

// Görsel yükleme hatası durumunda normal içeriğe dön
function handleGalleryError() {
    console.warn("Galeri görseli yüklenemedi, normal içeriğe dönülüyor.");
    const galleryContainer = document.getElementById('left-gallery-container');
    const normalContent = document.getElementById('left-normal-content');
    if (galleryContainer && normalContent) {
        galleryContainer.classList.add('hidden');
        normalContent.classList.remove('hidden');
    }
}

// Sayfa yüklendiğinde sol galeriyi başlat
// Sayfa yüklendiğinde sol galeriyi başlat
// fetchLeftGalleryImages(); // REDUNDANT: fetchConfig already handles this with merged data

// Regular Config Polling (1 Minute)
// TV ekranında verilerin (kayan yazı vb.) güncel kalması için her dakika config çek
setInterval(() => {
    // Sadece config güncellemesi yapmak için hafif bir çağrı mantığı eklenebilir
    // Ancak fetchConfig fonksiyonu tüm UI'yı güncellediği için doğrudan çağırabiliriz.
    // Animasyonlar CSS tabanlı olduğu için DOM update anlık bir "göz kırpma" yapabilir ama veri güncelliği için gereklidir.
    fetchConfig();
}, 60 * 1000);

// --- UNIVERSAL PIXEL-PERFECT SCALING (LG, Samsung, Vestel & More) ---
function resizeApp() {
    // KULLANICI TALEBİ: "İlla sığacak diye kalite düşmesin, gerekirse kaydırayım"
    // Bu yüzden ekranı zorla küçülten (ve bulanıklaştıran) transform scale iptal edildi.
    // Ekran orijinal 1920x1080 olarak çizilir, eğer donanımın ekranı küçükse scroll çıkar ama cam gibi net kalır.
}

// Event Listeners for Scaling
window.addEventListener('resize', resizeApp);
window.addEventListener('load', () => {
    resizeApp();

    // TV'lerdeki gecikmeli çözünürlük bildirimleri için kademeli kontrol
    [100, 500, 1000, 2000, 5000].forEach(delay => {
        setTimeout(resizeApp, delay);
    });

    // İlk 10 saniye boyunca her 2 saniyede bir zorla kontrol et (Bootscreen vb. durumlara karşı)
    const bootCheck = setInterval(resizeApp, 2000);
    setTimeout(() => clearInterval(bootCheck), 10000);
});
document.addEventListener('DOMContentLoaded', resizeApp);
fetchConfig(); // İlk yüklemeyi başlat




