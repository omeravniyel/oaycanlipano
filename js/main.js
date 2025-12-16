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
        let slug = path.split('/')[1] || ''; // Boşsa varsayılanı API halleder

        // "index.html" veya "index" gelirse ana sayfa kabul et
        if (slug.toLowerCase() === 'index.html' || slug.toLowerCase() === 'index') {
            slug = '';
        }

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

        if (config.institution_subtitle !== undefined) document.getElementById('header-subtitle').innerText = config.institution_subtitle;
        else document.getElementById('header-subtitle').innerText = 'ÖĞRENCİ YURDU - DİJİTAL PANO';

        if (config.institution_slogan1 !== undefined) document.getElementById('header-slogan1').innerText = config.institution_slogan1;
        else document.getElementById('header-slogan1').innerText = 'ilgiyle bilginin';

        if (config.institution_slogan2 !== undefined) document.getElementById('header-slogan2').innerText = config.institution_slogan2;
        else document.getElementById('header-slogan2').innerText = 'buluştuğu yer';

        if (config.institution_logo && config.institution_logo.trim() !== "") {
            document.getElementById('header-logo').src = config.institution_logo;
        }

        // --- 1. Başlıklar ---
        if (config.dorm_title) {
            const el = document.getElementById('dorm-section-title');
            if (el) el.innerText = config.dorm_title;
        }

        // --- 2. Galeri & Video Data Prep ---
        // Video Playlist Hazırlığı
        videoPlaylist = [];
        if (config.video_urls && Array.isArray(config.video_urls) && config.video_urls.length > 0) {
            videoPlaylist = config.video_urls;
        } else if (config.video_url) {
            let vUrl = config.video_url;
            if (vUrl.startsWith('[') && vUrl.endsWith(']')) {
                try { videoPlaylist = JSON.parse(vUrl); } catch (e) { videoPlaylist = [vUrl]; }
            } else {
                videoPlaylist = [vUrl];
            }
        }
        videoPlaylist = videoPlaylist.filter(v => v && v.trim().length > 5);

        // Ana Galeri Linkleri
        let adminGallery = [];
        if (config.gallery_links) {
            try {
                const parsed = (typeof config.gallery_links === 'string') ? JSON.parse(config.gallery_links) : config.gallery_links;
                if (Array.isArray(parsed) && parsed.length > 0) adminGallery = parsed;
            } catch (e) { console.error('Galeri parse hatası', e); }
        }

        // Galeri DOM Güncelleme
        if (adminGallery.length > 0) {
            galleryImages = adminGallery;
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

        // Sol Galeri
        let adminLeftGallery = [];
        if (config.left_gallery_links) {
            try {
                const parsed = (typeof config.left_gallery_links === 'string') ? JSON.parse(config.left_gallery_links) : config.left_gallery_links;
                if (Array.isArray(parsed) && parsed.length > 0) adminLeftGallery = parsed;
            } catch (e) { console.error('Sol Galeri parse hatası', e); }
        }

        if (adminLeftGallery.length > 0) {
            leftGalleryImages = adminLeftGallery;
            startLeftGalleryRotation();
        }

        // --- 3. Yemek Menüsü (Global) ---
        window.lunchMenu = config.lunch_menu || "";
        window.dinnerMenu = config.dinner_menu || "";

        // --- 4. Günün Sözleri (Marquee) ---
        let quotesText = "";
        if (config.quotes) {
            try {
                const q = (typeof config.quotes === 'string') ? JSON.parse(config.quotes) : config.quotes;
                if (Array.isArray(q) && q.length > 0) {
                    quotesText = q.join(' &nbsp; <span class="text-yellow-400 text-2xl">★</span> &nbsp; ');
                }
            } catch (e) { }
        }
        if (!quotesText && config.quote_of_day) {
            quotesText = `★ ${config.quote_of_day} ★`;
        }
        const marquee = document.getElementById('marquee-text');
        if (marquee && quotesText) {
            marquee.innerHTML = quotesText;
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
            dorm1Names = []; // Temizle
        } else if (config.dorm1) {
            // Legacy Nesne Formatı
            try {
                const d1 = (typeof config.dorm1 === 'string') ? JSON.parse(config.dorm1) : config.dorm1;
                document.getElementById('dorm1-name').innerText = d1.name || '---';
                document.getElementById('dorm1-count').innerText = d1.count ? (d1.count + '.KEZ') : '0.KEZ';
                dorm1Names = [d1.s1, d1.s2, d1.s3, d1.s4, d1.s5, d1.s6].filter(n => n && n !== '---');
            } catch (e) { }
        }

        // Yatakhane 2
        if (config.dorm2_names && Array.isArray(config.dorm2_names) && config.dorm2_names.length > 0) {
            dorm2Names = config.dorm2_names.filter(n => n);
            document.getElementById('dorm2-name').innerText = config.dorm2_name || '2. GRUP';
            document.getElementById('dorm2-count').innerText = config.dorm2_count ? (config.dorm2_count + '.KEZ') : '0.KEZ';
        } else if (config.dorm2_name) {
            document.getElementById('dorm2-name').innerText = config.dorm2_name;
            document.getElementById('dorm2-count').innerText = config.dorm2_count ? (config.dorm2_count + '.KEZ') : '0.KEZ';
            dorm2Names = [];
        } else if (config.dorm2) {
            try {
                const d2 = (typeof config.dorm2 === 'string') ? JSON.parse(config.dorm2) : config.dorm2;
                document.getElementById('dorm2-name').innerText = d2.name || '---';
                document.getElementById('dorm2-count').innerText = d2.count ? (d2.count + '.KEZ') : '0.KEZ';
                dorm2Names = [d2.s1, d2.s2, d2.s3, d2.s4, d2.s5, d2.s6].filter(n => n && n !== '---');
            } catch (e) { }
        }

        // Görünürlük ayarları
        if (document.getElementById('dorm1-custom-title')) {
            document.getElementById('dorm1-custom-title').innerText = config.dorm1_custom_title || "";
        }
        if (document.getElementById('dorm2-custom-title')) {
            document.getElementById('dorm2-custom-title').innerText = config.dorm2_custom_title || "";
        }

        // Dorm section visibility check
        const dormActive = (config.module_dorm_active !== undefined) ? config.module_dorm_active : true;
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
        if (config.weekly_hadiths && config.weekly_hadiths.startDate && Array.isArray(config.weekly_hadiths.weeks)) {
            try {
                const startDate = new Date(config.weekly_hadiths.startDate);
                const now = new Date();

                // Hafta farkını bul (ms cinsinden fark / bir haftalık ms)
                const diffTime = Math.abs(now - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // Daha hassas hesap:
                const oneWeek = 1000 * 60 * 60 * 24 * 7;
                // Başlangıç tarihinden bugüne geçen hafta sayısı (0-indexed)
                // Eğer startDate gelecekteyse 0. index, geçmişteyse hesapla.
                let weekIndex = -1;

                if (now >= startDate) {
                    weekIndex = Math.floor((now - startDate) / oneWeek);
                }

                if (weekIndex >= 0 && weekIndex < config.weekly_hadiths.weeks.length) {
                    const wData = config.weekly_hadiths.weeks[weekIndex];
                    if (wData && (wData.text || wData.arabic)) {
                        // Otomatik Hafta İsmi Oluştur (Eğer boşsa)
                        let displayWeek = wData.week;

                        // Tarih aralığını hesapla ve göster (İsteğe bağlı, şimdilik sadece haftayı gösterelim)
                        // const currentWeekStart = new Date(startDate.getTime() + (weekIndex * oneWeek));
                        // const currentWeekEnd = new Date(currentWeekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
                        // const dateRange = `${currentWeekStart.getDate()} - ${currentWeekEnd.getDate()} ${currentWeekEnd.toLocaleString('tr-TR', { month: 'long' })}`;

                        selectedHadith = {
                            week: displayWeek || `${weekIndex + 1}. HAFTA`,
                            text: wData.text,
                            arabic: wData.arabic,
                            img: wData.img // img desteği varsa
                        };
                        console.log(`Haftalık programdan ${weekIndex + 1}. hafta hadisi seçildi.`);
                    }
                }
            } catch (e) { console.error('Haftalık hadis hesaplama hatası:', e); }
        }

        // 2. Manuel Hadis (Fallback)
        if (!selectedHadith && config.hadith) {
            selectedHadith = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;
        }

        // 3. Ekrana Bas
        if (selectedHadith) {
            const h = selectedHadith;

            if (h.week && document.getElementById('hadith-week')) {
                document.getElementById('hadith-week').innerText = h.week;
            }

            document.getElementById('hadith-content').innerHTML = `
                <i class="fas fa-quote-left absolute -top-6 left-0 text-3xl text-emerald-200/50"></i>
                <span class="relative z-10 block py-2">${h.text || ''}</span>
                <i class="fas fa-quote-right absolute -bottom-6 right-0 text-3xl text-emerald-200/50"></i>
            `;

            const arabDiv = document.getElementById('hadith-arabic');
            arabDiv.innerText = h.arabic || '';
            arabDiv.style.display = h.arabic ? 'block' : 'none';

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
        // (Buradaki mantık unchanged, sadece değişken hazırlığı)


        // 1. Veri Kaynaklarını Hazırla
        const rawAnnouncements = [];
        let annList = config.announcements || [];
        if (typeof annList === 'string') annList = JSON.parse(annList);
        if (Array.isArray(annList)) {
            annList.forEach(a => rawAnnouncements.push({
                type: 'duyuru',
                title: 'DUYURULAR',
                badge: 'GÜNCEL',
                circle: '📢',
                topLabel: 'GENEL BİLGİLENDİRME',
                content: a
            }));
        }

        const rawExams = [];
        if (config.exam_winners && Array.isArray(config.exam_winners)) {
            config.exam_winners.forEach(w => {
                // Format: "Name - Puan" or just "Name"
                const parts = w.split('-');
                const name = parts[0].trim();
                const score = parts[1] ? parts[1].trim() : '';
                rawExams.push({
                    type: 'exam',
                    title: 'SINAV ŞAMPİYONLARI',
                    badge: score ? `${score} PUAN` : '🏆',
                    circle: '🥇', // Sıra numarası eklenebilir
                    topLabel: 'TEBRİK EDERİZ',
                    content: name
                });
            });
        }
        // Legacy Support (exam_config / exam_results) removed for cleanliness as Admin Panel overrides it now.

        const rawMenus = [];
        if (config.menu_enabled) {
            if (config.lunch_menu) rawMenus.push({ type: 'menu', title: 'ÖĞLE YEMEĞİ', badge: 'AFİYET OLSUN', circle: '☀️', topLabel: 'GÜNÜN MENÜSÜ', content: config.lunch_menu });
            if (config.dinner_menu) rawMenus.push({ type: 'menu', title: 'AKŞAM YEMEĞİ', badge: 'AFİYET OLSUN', circle: '🌙', topLabel: 'GÜNÜN MENÜSÜ', content: config.dinner_menu });
        }

        const rawStudent = [];
        if (config.student_of_week && config.student_of_week.name) {
            rawStudent.push({
                type: 'student',
                title: 'HAFTANIN TALEBESİ',
                badge: config.student_of_week.class || 'BAŞARI',
                circle: '⭐', // Image handled in rotation
                topLabel: 'GURUR TABLOMUZ',
                content: `${config.student_of_week.name}\n${config.student_of_week.message || ''}`,
                image: config.student_of_week.image
            });
        }

        const rawImproved = [];
        if (config.most_improved_list && Array.isArray(config.most_improved_list)) {
            config.most_improved_list.forEach(item => {
                const parts = item.split('-');
                const name = parts[0].trim();
                const score = parts[1] ? parts[1].trim() : '📈';
                rawImproved.push({
                    type: 'improved',
                    title: 'EN ÇOK GELİŞENLER',
                    badge: score,
                    circle: '🚀',
                    topLabel: 'AZİM VE GAYRET',
                    content: name
                });
            });
        }

        // 2. Mod Seçimine Göre infoData'yı Doldur
        // Super Admin ve Admin ayarlarını birleştiriyoruz.
        // Super Admin 'module_bottom_right_type' kullanıyor (auto, exam, announcement).
        // Regular Admin 'bottom_widget_type' kullanıyor (exam, student_of_week, most_improved, menu).
        // Öncelik: Regular Admin ayarı varsa onu kullan (User Request). Yoksa Super Admin.

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
        } else {
            // AUTO: Mix appropriate content
            infoData = [...rawAnnouncements, ...rawExams, ...rawMenus];
        }

        // Eğer seçilen tipte veri yoksa boş kalmaması için duyuruları veya menüyü ekle (Fallback)
        if (infoData.length === 0 && selectedType !== 'auto') {
            infoData = [...rawAnnouncements, ...rawMenus];
        }


        // 7. Video Listesi (Playlist)
        videoPlaylist = [];
        if (config.video_urls && Array.isArray(config.video_urls) && config.video_urls.length > 0) {
            videoPlaylist = config.video_urls;
        } else if (config.video_url) {
            // Fallback for single video
            let vUrl = config.video_url;
            // Bazen string array gibi gelebilir "["..."]"
            if (vUrl.startsWith('[') && vUrl.endsWith(']')) {
                try { videoPlaylist = JSON.parse(vUrl); } catch (e) { videoPlaylist = [vUrl]; }
            } else {
                videoPlaylist = [vUrl];
            }
        }
        // Admin panelinden gelen boş satırları temizle
        videoPlaylist = videoPlaylist.filter(v => v && v.trim().length > 5);

        // --- 8. BAŞLAT ---
        if (videoPlaylist.length > 0) {
            currentVideoIndex = 0;
            switchMedia('video');
        } else {
            switchMedia('slide');
        }

        startDormNameRotation();



        // B) Filter Info Data (Already handled above)


    } catch (error) {
        console.error("Config error:", error);
    }
}

function rotateInfo() {
    if (!infoData || infoData.length === 0) return;

    // Fade out
    const container = document.getElementById('info-carousel');
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';

    setTimeout(() => {
        const item = infoData[infoIndex];
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

        // Reset Logic
        circle.innerHTML = '';
        if (item.image) {
            circle.innerHTML = `<img src="${item.image}" class="w-full h-full object-cover rounded-full">`;
            circle.classList.remove('bg-yellow-500', 'bg-blue-500', 'bg-orange-500', 'bg-green-500');
            circle.style.border = '2px solid white';
        } else {
            circle.innerText = item.circle;
            circle.style.border = ''; // Reset border
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
        } else {
            // Default (e.g. Announcement)
            circle.style.fontSize = '1.5rem';
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
var videoPlaylist = [];
var currentVideoIndex = 0;
var slideIntervalHandle = null;
var isYoutubeReady = false;
var pendingVideoPlay = false;

// Galeriyi Çek (Yerel klasörden)
async function fetchGalleryImages() {
    // ...
}

function onYouTubeIframeAPIReady() {
    isYoutubeReady = true;
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '', // Başlangıçta boş, loadVideoById ile yüklenecek
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'rel': 0,
            'showinfo': 0,
            'mute': 1, // Otomatik oynatma için
            'modestbranding': 1
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
    if (event.data == YT.PlayerState.ENDED) {
        playNextVideoOrSlide();
    }
}

function playNextVideoOrSlide() {
    currentVideoIndex++;
    if (currentVideoIndex < videoPlaylist.length) {
        playCurrentVideo();
    } else {
        // Liste bitti, slayta geç
        currentVideoIndex = 0;
        switchMedia('slide');
    }
}

function playCurrentVideo() {
    if (!player || typeof player.loadVideoById !== 'function') {
        // Player henüz hazır değilse flag koy, ready olunca çalar
        pendingVideoPlay = true;
        return;
    }

    pendingVideoPlay = false;
    const rawUrl = videoPlaylist[currentVideoIndex];
    const vid = extractVideoID(rawUrl);

    if (vid) {
        player.loadVideoById(vid);
        player.playVideo();
    } else {
        // Link geçersizse sonrakine atla
        console.warn("Geçersiz Video Linki:", rawUrl);
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
function switchMedia(mode) {
    const playerEl = document.getElementById('player');
    const swiperEl = document.querySelector('.mySwiper');
    const playerContainer = document.getElementById('video-container');

    // Temizle
    if (slideIntervalHandle) {
        clearTimeout(slideIntervalHandle);
        slideIntervalHandle = null;
    }

    if (mode === 'video' && videoPlaylist.length > 0) {
        // --- 1. VIDEO MODU ---
        currentMediaState = 'video';

        // UI Güncelle
        if (swiperEl) swiperEl.classList.add('hidden');
        if (playerContainer) playerContainer.classList.remove('hidden');
        if (playerEl) playerEl.style.display = 'block';

        // Videoyu başlat
        playCurrentVideo();

    } else if (mode === 'slide') {
        // --- 2. SLAYT MODU ---
        currentMediaState = 'slide';

        // UI Güncelle
        if (swiperEl) swiperEl.classList.remove('hidden');
        if (playerContainer) playerContainer.classList.add('hidden');
        if (playerEl) playerEl.style.display = 'none';

        if (player && typeof player.stopVideo === 'function') player.stopVideo();

        // Swiper Init
        if (!window.mySwiperInstance) {
            window.mySwiperInstance = new Swiper(".mySwiper", {
                spaceBetween: 30,
                effect: "fade",
                centeredSlides: true,
                autoplay: {
                    delay: 10000,
                    disableOnInteraction: false,
                },
                loop: false, // Loop false yapıyoruz ki sona gelince yakalayalım
                speed: 1000,
                on: {
                    reachEnd: function () {
                        // Slayt bitti -> Videoya geç (Eğer video varsa)
                        if (videoPlaylist.length > 0) {
                            setTimeout(() => {
                                switchMedia('video');
                            }, 5000); // 5 sn bekle
                        } else {
                            // Video yoksa başa sar
                            this.slideTo(0);
                            this.autoplay.start();
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

// Auto Refresh Page every 30 minutes to fetch new code/config cleanly
setTimeout(() => {
    window.location.reload();
}, 30 * 60 * 1000);

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
