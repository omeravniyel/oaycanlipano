// js/main.js
console.log("Pano uygulaması başlatılıyor...");

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

        // 1. Duyurular (Dizi veya Tekil olabilir) - İPTAL EDİLDİ (Kayan yazıda çıkmasın istendi)
        /*
        if (config.announcements && Array.isArray(config.announcements)) {
            config.announcements.forEach(a => {
                const parsed = parseNumberedText(a);
                marqueeItems.push(...parsed);
            });
        }
        */

        // 2. Günün Sözü (Tekil)
        if (config.quote_of_day) {
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
        if (document.getElementById('dorm-section-title')) {
            document.getElementById('dorm-section-title').innerText = config.dorm_main_title || "GÜNÜN KAZANAN YATAKHANESİ";
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
                const oneWeek = 1000 * 60 * 60 * 24 * 7;

                // Hafta indexini hesapla
                let weekIndex = Math.floor((now - startDate) / oneWeek);

                // Eğer negatifse (henüz başlamadıysa) ilk haftayı göster
                if (weekIndex < 0) weekIndex = 0;

                // Eğer index array dışındaysa son haftayı göster
                if (weekIndex >= config.weekly_hadiths.weeks.length) {
                    weekIndex = config.weekly_hadiths.weeks.length - 1;
                }

                if (weekIndex >= 0 && weekIndex < config.weekly_hadiths.weeks.length) {
                    const wData = config.weekly_hadiths.weeks[weekIndex];
                    if (wData) {
                        selectedHadith = {
                            week: wData.week || `${weekIndex + 1}. HAFTA`,
                            text: wData.text,
                            arabic: wData.arabic,
                            img: wData.img,
                            weekIndex: weekIndex // Tarih hesaplama için sakla
                        };
                        console.log(`Haftalık program: ${weekIndex + 1}. hafta`, selectedHadith);
                    }
                }
            } catch (e) { console.error('Haftalık hadis hatası:', e); }
        }

        // 2. Manuel Hadis (Fallback)
        if (!selectedHadith && config.hadith) {
            selectedHadith = (typeof config.hadith === 'string') ? JSON.parse(config.hadith) : config.hadith;
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
            let hadithText = h.text || '...';
            let arabicText = h.arabic || '';

            // --- SMART SPLIT for Legacy Data (Arabic / Turkish) ---
            // Eğer Arapça alanı boşsa VE metin içinde Türkçe karakterler ve / varsa ayırmayı dene
            if (!arabicText && hadithText.includes('/')) {
                // Arapça Unicode Aralığı: \u0600 - \u06FF
                const hasArabicChar = /[\u0600-\u06FF]/.test(hadithText);
                if (hasArabicChar) {
                    const parts = hadithText.split('/');
                    if (parts.length >= 2) {
                        // Genellikle format: ARAPÇA / TÜRKÇE
                        // İlk parçada Arapça harf var mı?
                        if (/[\u0600-\u06FF]/.test(parts[0])) {
                            arabicText = parts[0].trim();
                            hadithText = parts.slice(1).join('/').trim(); // Geri kalan hepsi Türkçe
                        }
                    }
                }
            }

            document.getElementById('hadith-content').innerHTML = hadithText;

            const arabDiv = document.getElementById('hadith-arabic');
            arabDiv.innerText = arabicText;
            arabDiv.style.display = arabicText ? 'block' : 'none';

            // --- AUTO FONT SIZING (More Aggressive) ---
            // Arabic Scaling
            if (arabicText.length > 100) {
                arabDiv.style.fontSize = '1.8rem';
            } else if (arabicText.length > 60) {
                arabDiv.style.fontSize = '2.2rem';
            } else {
                arabDiv.style.fontSize = '2.8rem';
            }

            // Turkish Scaling
            const trDiv = document.getElementById('hadith-content').parentElement;
            if (hadithText.length > 150) {
                trDiv.style.fontSize = '1rem';
                trDiv.style.marginTop = '5px';
            } else if (hadithText.length > 80) {
                trDiv.style.fontSize = '1.2rem';
                trDiv.style.marginTop = '8px';
            } else {
                trDiv.style.fontSize = '1.5rem';
                trDiv.style.marginTop = '15px';
            }

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
                    badge: 'ÖNEMLİ', // Sol üst köşe
                    circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M22 13C22 14.1 21.1 15 20 15H17.8L15.4 19.8C15.1 20.5 14.3 21 13.5 21C12.4 21 11.5 20.1 11.5 19V15H7C5.9 15 5 14.1 5 13V5C5 3.9 5.9 3 7 3H20C21.1 3 22 3.9 22 5V13ZM2 15H4V5H2V15Z"/></svg>', // Daire içi,
                    topLabel: 'BİLGİLENDİRME', // Sağ üst
                    content: text // Ana metin
                });
            });
        }

        const rawExams = [];
        if (config.exam_winners && Array.isArray(config.exam_winners) && config.exam_winners.length > 0) {
            config.exam_winners.forEach(w => {
                // Parse format: [Class] Name - Score | IMG:url
                let fullStr = w.trim();
                let imageUrl = '';

                // Extract Image first
                const parts = fullStr.split(' | IMG:');
                if (parts.length > 1) {
                    fullStr = parts[0].trim();
                    imageUrl = parts[1].trim();
                }

                let className = '';
                let studentName = '';
                let score = '';

                // Regex to capture [Class] (optional), Name, - Score (optional)
                const match = fullStr.match(/^(?:\[(.*?)\]\s*)?(.*?)(?:\s*-\s*(.*))?$/);

                if (match) {
                    className = match[1] ? match[1].trim() : '';
                    studentName = match[2] ? match[2].trim() : '';
                    score = match[3] ? match[3].trim() : '';
                } else {
                    // Fallback
                    studentName = fullStr;
                }

                // Fallback for score if inside name (Legacy spaces split)
                if (!score && !className) {
                    const spaces = studentName.split(' ');
                    const last = spaces[spaces.length - 1];
                    if (spaces.length > 1 && !isNaN(last)) {
                        score = last;
                        studentName = spaces.slice(0, -1).join(' ');
                    }
                }

                // Construct Display String
                let displayStr = '';
                if (className) displayStr += `${className} `;
                displayStr += studentName;
                if (score) displayStr += ` ${score} PUAN`;

                rawExams.push({
                    type: 'exam',
                    title: (config.exam_name ? config.exam_name + ' ŞAMPİYONLARI' : 'SINAV ŞAMPİYONLARI'),
                    badge: 'MAŞAALLAH',
                    circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.2 2H19.5H18C17.1 2 16.3 2.4 15.8 3C15.3 2.4 14.6 2 13.5 2H12.2C11.6 2 11 2.2 10.6 2.6L10 3.3L9.4 2.6C9 2.2 8.4 2 7.8 2H6.5C5.4 2 4.7 2.4 4.2 3C3.7 2.4 2.9 2 2 2H1.3H0V6C0 9.3 2.7 12 6 12H7.2L10 16.2L12.8 12H14C17.3 12 20 9.3 20 6V2H20.2ZM6 10C3.8 10 2 8.2 2 6V4H2.2H3.5C4.1 4 4.5 4.4 4.5 5V6C4.5 6.6 4.9 7 5.5 7H6C6.6 7 7 6.6 7 6V4H7.8C8.4 4 9 4.6 9 5.2V6.5L10 8L11 6.5V5.2C11 4.6 11.6 4 12.2 4H13C13.6-4 14 3.6 14 3H14.5H15.8C16.4 4 17 4.6 17 5.2V6.5L18 8L19 6.5V5.2C19 4.6 19.6 4 20.2 4H21.5H22V6C22 8.2 20.2 10 18 10H14.6L12.8 12.7L10 16.9L7.2 12.7L5.4 10H6ZM10 18H14V22H10V18Z"/></svg>',
                    topLabel: 'TEBRİK EDERİZ',
                    content: displayStr,
                    image: imageUrl // Pass image
                });
            });
        }

        const rawMenus = [];
        if (config.lunch_menu) rawMenus.push({ type: 'menu', title: 'ÖĞLE YEMEĞİ', badge: 'AFİYET OLSUN', circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/></svg>', topLabel: 'GÜNÜN MENÜSÜ', content: config.lunch_menu });
        if (config.dinner_menu) rawMenus.push({ type: 'menu', title: 'AKŞAM YEMEĞİ', badge: 'AFİYET OLSUN', circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z"/></svg>', topLabel: 'GÜNÜN MENÜSÜ', content: config.dinner_menu });

        const rawStudent = [];
        if (config.student_of_week && config.student_of_week.name) {
            rawStudent.push({
                type: 'student',
                title: 'HAFTANIN TALEBESİ',
                badge: config.student_of_week.class || 'BAŞARI',
                circle: '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.62L12 2L9.19 8.62L2 9.24L7.45 13.97L5.82 21L12 17.27Z"/></svg>', // Image handled in rotation
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
                const score = parts[1] ? parts[1].trim() : '<svg class="w-6 h-6 text-white inline-block" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.59-6.59L22 12V6z"/></svg>';
                rawImproved.push({
                    type: 'improved',
                    title: 'EN ÇOK GELİŞENLER',
                    badge: score,
                    circle: '<svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.59-6.59L22 12V6z"/></svg>',
                    topLabel: 'AZİM VE GAYRET',
                    content: name
                });
            });
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
        } else {
            // AUTO: Sadece DOLU olanları listeye ekle
            infoData = [...rawAnnouncements, ...rawExams, ...rawMenus, ...rawStudent, ...rawImproved];
        }

        // Eğer seçilen tipte veri yoksa (veya auto seçilip hepsi boşsa) boş dizide kalır.
        // Fallback: Seçilen tip boşsa, otomatik moda düşerek dolu olan diğerlerini göster.
        if (infoData.length === 0 && selectedType !== 'auto') {
            infoData = [...rawAnnouncements, ...rawExams, ...rawMenus, ...rawStudent, ...rawImproved];
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

        // --- 9. Bilgi Kartı Rotasyonunu Başlat ---
        if (infoRotationInterval) clearInterval(infoRotationInterval);
        if (infoData && infoData.length > 0) {
            infoIndex = 0; // Her config güncellemesinde 1. sıradan başla
            rotateInfo(); // İlkini hemen göster
            infoRotationInterval = setInterval(rotateInfo, 10000); // 10 saniyede bir değiştir
        }

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

        // Reset custom sizing first
        circle.style.width = '';
        circle.style.height = '';

        if (item.image) {
            circle.innerHTML = `<img src="${item.image}" class="w-full h-full object-cover rounded-full shadow-lg">`;
            circle.classList.remove('bg-yellow-500', 'bg-blue-500', 'bg-orange-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500');

            // Görseli Büyüt (w-16 = 4rem, biz 6rem yapalım ~ 1.5 katı)
            circle.style.width = '6rem';
            circle.style.height = '6rem';

            // Çerçeveyi Kaldır
            circle.style.border = 'none';
            circle.classList.remove('border-4', 'border-yellow-300'); // HTML default classlarını temizle
        } else {
            // Allow HTML (for icons)
            circle.innerHTML = item.circle;
            // Restore default icon border classes
            circle.style.border = ''; // Reset inline border
            circle.classList.add('border-4', 'border-yellow-300');
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

            mainText.classList.remove('text-2xl', 'text-center', 'whitespace-pre-wrap');
            mainText.classList.add('text-xl', 'leading-normal', 'columns-2', 'gap-8', 'text-left');

        } else {
            // Temizle ve Hazırla
            mainText.innerText = item.content;
            mainText.classList.remove('text-xl', 'text-sm', 'leading-normal', 'columns-2', 'gap-8', 'text-left');
            mainText.style.fontSize = ''; // Reset inline styles
            mainText.style.whiteSpace = '';

            if (item.type === 'announcement') {
                // Duyurular: Normal Wrapping, biraz daha küçük font
                mainText.classList.add('text-xl', 'text-center', 'whitespace-pre-wrap');
                mainText.classList.remove('text-2xl');
            } else {
                // İsimler/Sınavlar: Tek satıra sığdırmaya çalış (Auto-Scale)
                mainText.classList.add('text-center');
                mainText.classList.remove('whitespace-pre-wrap');
                mainText.style.whiteSpace = 'nowrap';
                mainText.style.fontSize = '1.7rem'; // Başlangıç (text-2xl civarı)

                // Sığana kadar küçült (Min: 0.9rem)
                // DOM update sonrası ölçüm için kısa bir gecikme gerekebilir ama senkron genellikle çalışır.
                // Güvenlik için max iterasyon: 20
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
        videoId: '',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'rel': 0,
            'showinfo': 0,
            'mute': 1, // SESLİ BAŞLATMA HİLESİ: Önce sessiz başlat (Oto-oynatma garantisi)
            'modestbranding': 1,
            'loop': 1,
            'cc_load_policy': 1,
            'cc_lang_pref': 'tr'
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
    currentVideoIndex++;
    if (currentVideoIndex < videoPlaylist.length) {
        playCurrentVideo();
    } else {
        // Liste bitti, görsel varsa slayta geç, yoksa başa sar
        currentVideoIndex = 0;
        if (galleryImages.length > 0) {
            switchMedia('slide');
        } else {
            playCurrentVideo();
        }
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
        // ÖNCE SESSİZ BAŞLAT (Oto oynatma garantisi için)
        player.mute();
        player.playVideo();
        // SONRA: onPlayerStateChange içinde "PLAYING" olunca sesi açacağız
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

    // Swiper'ı durdur (arka planda çalışmasın)
    if (window.mySwiperInstance && window.mySwiperInstance.autoplay) {
        window.mySwiperInstance.autoplay.stop();
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
                observer: true, // DOM değişikliklerini izle
                observeParents: true, // Parent değişikliklerini izle
                autoplay: {
                    delay: 12000,
                    disableOnInteraction: false,
                },
                loop: false, // Loop false yapıyoruz ki sona gelince yakalayalım
                speed: 1000,
                on: {
                    reachEnd: function () {
                        // Slayt bitti -> Videoya geç (Eğer video varsa)
                        if (videoPlaylist.length > 0) {
                            // Beklemeden videoya geç
                            switchMedia('video');
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

        let location = null;
        let displayName = district.toUpperCase();

        // Strategy 1: Search District only (Most precise usually)
        let geoData = await getGeo(district);
        if (geoData.results && geoData.results.length > 0) {
            location = geoData.results[0];
        }

        // Strategy 2: Search "District City"
        if (!location) {
            geoData = await getGeo(`${district} ${city}`);
            if (geoData.results && geoData.results.length > 0) {
                location = geoData.results[0];
            }
        }

        // Strategy 3: Search City only
        if (!location) {
            geoData = await getGeo(city);
            if (geoData.results && geoData.results.length > 0) {
                location = geoData.results[0];
                displayName = city.toUpperCase();
            }
        }

        // Strategy 4: Fallback Istanbul
        if (!location) {
            console.warn("Konum bulunamadı, varsayılana dönülüyor.");
            geoData = await getGeo("Istanbul");
            if (geoData.results && geoData.results.length > 0) {
                location = geoData.results[0];
                displayName = "ISTANBUL";
            }
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
        if (document.getElementById('weather-icon')) document.getElementById('weather-icon').innerText = icon;

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

// Auto Refresh Page every 5 minutes to fetch new code/config cleanly and clear memory
setTimeout(() => {
    window.location.reload();
}, 5 * 60 * 1000);

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

// Regular Config Polling (1 Minute)
// TV ekranında verilerin (kayan yazı vb.) güncel kalması için her dakika config çek
setInterval(() => {
    // Sadece config güncellemesi yapmak için hafif bir çağrı mantığı eklenebilir
    // Ancak fetchConfig fonksiyonu tüm UI'yı güncellediği için doğrudan çağırabiliriz.
    // Animasyonlar CSS tabanlı olduğu için DOM update anlık bir "göz kırpma" yapabilir ama veri güncelliği için gereklidir.
    fetchConfig();
}, 60 * 1000);
