// Admin Panel v3 Loaded
// --- GLOBAL ERROR HANDLER ---
window.onerror = function (msg, url, line, col, error) {
    const extra = !col ? '' : '\ncolumn: ' + col;
    const err = 'Error: ' + msg + '\nurl: ' + url + '\nline: ' + line + extra;
    console.error(err);
    if (typeof Swal !== 'undefined') Swal.fire('Kritik Hata', err, 'error');
    else alert(err);
    return false;
};

// --- ADMIN PANEL V3 - FULL CONTROLLER ---
const API_URL = '/api/manage-institutions';
let currentUserPassword = '';
let supabaseClient = null;

// --- LIVE PREVIEW ---
function previewAnnouncement() {
    const text = document.getElementById('announcement-text').value.trim();
    if (!text) return Swal.fire('Uyarı', 'Önizleme için metin giriniz', 'warning');

    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('preview-frame');

    // Construct a minimal HTML to simulate the marquee
    // We use data:text/html to avoid cross-origin issues with about:blank in some browsers, 
    // but here we can just write to doc.

    // Using styles from board.html
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <script src="https://cdn.tailwindcss.com"><\/script>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Montserrat', sans-serif; overflow: hidden; background-color: #000; color: white; }
                .marquee-container {
                    overflow: hidden; white-space: nowrap; position: absolute; bottom: 0; left: 0; right: 0; height: 3rem; background: #000; display: flex; items-center;
                }
                .marquee-content {
                    display: inline-block; white-space: nowrap; padding-left: 100%; animation: marquee 20s linear infinite; font-size: 1.5rem; font-weight: bold; color: #fbbf24;
                }
                @keyframes marquee {
                    0% { transform: translate3d(0, 0, 0); }
                    100% { transform: translate3d(-100%, 0, 0); }
                }
            </style>
        </head>
        <body class="flex items-center justify-center h-screen w-screen bg-gray-900">
            <div class="text-center p-10">
                <h1 class="text-4xl font-bold text-white mb-4">DİJİTAL PANO SİMÜLASYONU</h1>
                <p class="text-gray-400">Duyuru metni aşağıda kayan yazı olarak görünecektir.</p>
            </div>
            
            <div class="fixed bottom-0 w-full bg-red-800 text-white h-16 flex items-center z-50 border-t-4 border-red-900">
                 <div class="px-6 py-2 bg-red-900 font-black tracking-widest text-sm h-full flex items-center z-20 shadow-xl uppercase">DUYURULAR</div>
                 <div class="marquee-container relative flex-1 h-full flex items-center overflow-hidden bg-red-800">
                     <div class="marquee-content leading-none pt-1">
                        ${text} &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; ${text}
                     </div>
                 </div>
            </div>
        </body>
        </html>
    `;

    modal.classList.remove('hidden');

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
}

function closePreviewModal() {
    document.getElementById('preview-modal').classList.add('hidden');
    document.getElementById('preview-frame').src = 'about:blank'; // Reset
}

// --- AUTH & INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const savedPass = localStorage.getItem('super_admin_pass');
    if (savedPass) {
        document.getElementById('master-password').value = savedPass;
        doLogin();
    }
});

async function doLogin() {
    // Login attempt started...
    try {
        // Selector fix: handle both the test button and normal button
        let btn = document.querySelector('button[onclick*="attemptLogin"]');
        const input = document.getElementById('master-password');
        const val = input ? input.value.trim() : '';

        if (!val) {
            if (typeof Swal !== 'undefined') Swal.fire('Uyarı', 'Lütfen şifre giriniz.', 'warning');
            else alert('Lütfen şifre giriniz.');
            return;
        }

        // UI Feedback
        if (btn) {
            btn.innerText = 'Kontrol Ediliyor...';
            btn.disabled = true;
        }
        if (input) input.disabled = true;

        // Verify Password via API
        const verifyRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify_password',
                master_password: val
            })
        });

        if (!verifyRes.ok) {
            const errText = await verifyRes.text();
            throw new Error('Sunucu Hatası: ' + verifyRes.status + ' - ' + errText);
        }

        let verifyData;
        try {
            verifyData = await verifyRes.json();
        } catch (e) {
            throw new Error('Sunucudan geçersiz JSON yanıtı alındı.');
        }

        if (!verifyData.success) throw new Error('Şifre Hatalı!');

        // SUCCESS
        currentUserPassword = val;
        localStorage.setItem('super_admin_pass', val);

        // Initialize Supabase
        if (typeof initSupabase === 'function') {
            await initSupabase();
        } else {
            console.warn('initSupabase function missing!');
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Giriş Başarılı',
                timer: 1000,
                showConfirmButton: false
            });
        }

        const loginModal = document.getElementById('login-modal');
        const mainContent = document.getElementById('main-content');

        if (loginModal) loginModal.classList.add('hidden');
        if (mainContent) {
            mainContent.classList.remove('hidden');
            mainContent.classList.add('flex');
        }

        // Load Initial Data
        if (typeof switchView === 'function') switchView('dashboard');
        else if (typeof loadInstitutions === 'function') loadInstitutions();

    } catch (err) {
        console.error('Login Error:', err);
        let btn = document.querySelector('button[onclick*="attemptLogin"]');
        const input = document.getElementById('master-password');

        if (btn) {
            btn.innerText = 'Giriş Yap';
            btn.disabled = false;
        }
        if (input) input.disabled = false;
        localStorage.removeItem('super_admin_pass');

        if (typeof Swal !== 'undefined') Swal.fire('Hata', err.message, 'error');
        else alert('Hata: ' + err.message);
    }
}

// Support both names for safety
window.attemptLogin = doLogin;

async function requestApi(action, payload = {}) {
    if (!currentUserPassword) throw new Error("Oturum süresi doldu.");

    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action,
            master_password: currentUserPassword,
            payload
        })
    });
    const data = await res.json();
    if (!data.success && !data.config && !data.announcements) throw new Error(data.error || 'İşlem başarısız');
    return data;
}

// --- INSTITUTIONS ---
async function loadInstitutions() {
    const contentDiv = document.getElementById('institution-list');
    contentDiv.innerHTML = '<p class="text-center text-slate-500 w-full col-span-3 py-12 animate-pulse">Kurum verileri yükleniyor...</p>';

    try {
        const data = await requestApi('list');
        const institutions = data.institutions || [];
        // console.log(`Loaded ${institutions.length} institutions`);

        let html = '';

        if (institutions.length === 0) {
            html = '<div class="col-span-full text-center text-slate-500 py-10">Kayıtlı kurum bulunamadı.</div>';
        }

        institutions.forEach(inst => {
            try {
                // DEFINE CONFIG FIRST
                const config = typeof inst.config === 'string' ? JSON.parse(inst.config) : (inst.config || {});

                const logoInfo = config.institution_logo || null;
                const initials = (inst.name || '??').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                // Fallback Logic: Render both IMG and DIV. If IMG error, hide IMG and show DIV.
                const fallbackHtml = `
                    <div class="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 border-2 border-white/10 flex items-center justify-center shadow-lg pointer-events-none z-0">
                        <span class="text-xl font-display font-bold text-white tracking-wider">${initials}</span>
                    </div>
                `;

                let logoHtml;
                if (logoInfo) {
                    // Show IMG on top (z-10). If error, hide it (opacity-0/display-none) revealing fallback (z-0) underneath.
                    // IMPORTANT: Fallback is HIDDEN by default to prevent "ghosting" behind transparent logos.
                    logoHtml = `
                        <div class="relative w-16 h-16">
                            <div class="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 border-2 border-white/10 flex items-center justify-center shadow-lg z-0 hidden">
                                <span class="text-xl font-display font-bold text-white tracking-wider">${initials}</span>
                            </div>
                            <img src="${logoInfo}" 
                                class="absolute inset-0 w-16 h-16 rounded-2xl object-cover border-2 border-slate-700/50 shadow-lg z-10 transition-opacity duration-300"
                                onerror="this.style.opacity='0'; this.previousElementSibling.classList.remove('hidden');">
                        </div>
                    `;
                } else {
                    // No logo -> Just fallback (visible)
                    logoHtml = `
                        <div class="relative w-16 h-16">
                             <div class="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 border-2 border-white/10 flex items-center justify-center shadow-lg z-0">
                                <span class="text-xl font-display font-bold text-white tracking-wider">${initials}</span>
                            </div>
                        </div>
                    `;
                }

                const type = config.institution_type || inst.type || 'Kurum';
                const safeName = (inst.name || 'İsimsiz').replace(/'/g, "\\'");
                const safeSlug = inst.slug || '#';

                html += `
                <div class="glass-card p-5 rounded-2xl group relative overflow-hidden flex flex-col gap-4">
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div class="flex items-center gap-4 relative z-10">
                        <!-- Logo Wrapper -->
                        <div class="relative">
                            <div class="absolute inset-0 bg-blue-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            ${logoHtml}
                        </div>
                        <div>
                            <h3 class="font-display font-bold text-white text-lg group-hover:text-blue-400 transition-colors tracking-tight line-clamp-1" title="${inst.name}">${inst.name}</h3>
                            <div class="flex flex-wrap gap-2 text-[10px] font-bold mt-1.5 opacity-80">
                                 <span class="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded uppercase tracking-wider">${type}</span>
                                 <span class="bg-slate-700/30 text-slate-400 border border-slate-600/30 px-2 py-0.5 rounded font-mono">${inst.slug}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-auto relative z-10 pt-2 border-t border-white/5">
                        <button onclick="editInstitution('${safeSlug}')" class="flex-1 px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 font-bold text-xs transition-all text-center flex items-center justify-center gap-2">
                            <i class="fa-solid fa-pen"></i> Düzenle
                        </button>
                        <button onclick="openPreviewModal('${safeSlug}')" class="px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 font-bold text-xs transition-all" title="Canlı Önizleme">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button onclick="deleteInstitution('${safeSlug}', '${safeName}')" class="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 font-bold text-xs transition-all" title="Sil">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <a href="/${safeSlug}/admin" target="_blank" class="w-full px-4 py-2.5 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/20 font-bold text-xs text-center transition-all relative z-10 flex items-center justify-center gap-2 group/btn">
                        <span>Yönetici Paneline Git</span>
                        <i class="fa-solid fa-arrow-right opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all"></i>
                    </a>
                </div>`;
            } catch (innerErr) {
                console.error('Error rendering institution card:', innerErr, inst);
            }
        });



        // DEBUG: Log HTML length
        // console.log("Generated HTML Length:", html.length);

        if (contentDiv) {
            contentDiv.innerHTML = html;
            // DEBUG: Verify innerHTML
            // console.log("Container innerHTML length after set:", contentDiv.innerHTML.length);

            // Force container visibility just in case
            contentDiv.style.display = 'grid';
            document.getElementById('institution-view').classList.remove('hidden');
        } else {
            console.error("FATAL: contentDiv (institution-list) not found!");
        }

        // Populate "filter" if search has value
        // setTimeout(() => filterInstitutions(), 50); // Removed for direct execution test

        // Force show all first
        const cards = contentDiv.querySelectorAll('.glass-card');
        // console.log(`Found ${cards.length} cards in DOM`);
        cards.forEach(c => c.style.display = 'flex');

    } catch (err) {
        console.error("Load Inst Error:", err);
        if (contentDiv) contentDiv.innerHTML = `<div class="bg-red-900/20 border border-red-500/20 p-6 rounded-2xl w-full col-span-3 text-center"><p class="text-red-400 font-bold mb-2">Hata:</p><p class="text-red-300 text-sm">${err.message}</p></div>`;
    }
}

// Preview Modal Functions
function openPreviewModal(slug) {
    const modal = document.getElementById('preview-modal');
    const frame = document.getElementById('preview-frame');
    const slugText = document.getElementById('preview-slug');
    const loading = document.getElementById('preview-loading');

    if (!modal || !frame) return;

    // Reset state
    loading.style.opacity = '1';
    loading.style.display = 'flex';
    frame.src = 'about:blank';
    slugText.innerText = `/${slug}`;

    // Show modal
    modal.classList.remove('hidden');

    // Load URL
    setTimeout(() => {
        // Assuming the public board is at root/{slug}
        frame.src = `/${slug}`;

        // Hide loading after a delay (iframe load event is unreliable with cross-origin or complex apps, so a timeout is a safe UX choice)
        frame.onload = () => {
            loading.style.opacity = '0';
            setTimeout(() => loading.style.display = 'none', 300);
        };
        // Fallback if onload doesn't fire (e.g. same origin policy restrictions or quick load)
        setTimeout(() => {
            loading.style.opacity = '0';
            setTimeout(() => loading.style.display = 'none', 300);
        }, 2000);
    }, 100);
}

function closePreviewModal() {
    const modal = document.getElementById('preview-modal');
    const frame = document.getElementById('preview-frame');
    if (modal) {
        modal.classList.add('hidden');
        if (frame) frame.src = 'about:blank';
    }
}

function filterInstitutions() {
    try {
        const input = document.getElementById('search-input');
        if (!input) return;

        const term = input.value.toLowerCase();
        const cards = document.querySelectorAll('#institution-list > div');

        cards.forEach(card => {
            if (!card) return;
            const text = (card.innerText || "").toLowerCase();
            if (term.length === 0) {
                card.style.display = 'flex';
            } else {
                card.style.display = text.includes(term) ? 'flex' : 'none';
            }
        });
    } catch (e) {
        console.error("Filter Error:", e);
    }
}

// --- INSTITUTION CRUD ---
let editingSlug = null; // null = new institution, string = editing existing

function openInstitutionModal(isNew = true) {
    editingSlug = null;
    document.getElementById('edit-modal').classList.remove('hidden');
    if (isNew) {
        // Clear form for new institution
        document.getElementById('form-slug').value = '';
        document.getElementById('form-slug').disabled = false;
        document.getElementById('form-name').value = '';
        document.getElementById('form-password').value = '';
        document.getElementById('form-type').value = 'Ortaokul';
        document.getElementById('form-city').value = '';
        document.getElementById('form-district').value = '';
        document.getElementById('form-region').value = '';
        document.getElementById('form-logo').value = '';
        document.getElementById('form-contact-name').value = '';
        document.getElementById('form-contact-phone').value = '';
        document.getElementById('form-contact-email').value = '';
        document.getElementById('form-dorm-active').checked = true;
        document.getElementById('form-logo-locked').checked = false;
    }
}

function closeInstitutionModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    editingSlug = null;
}

async function editInstitution(slug) {
    try {
        Swal.fire({ title: 'Yükleniyor...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const data = await requestApi('get_institution', { slug });
        const inst = data.institution;
        const cfg = typeof inst.config === 'string' ? JSON.parse(inst.config) : (inst.config || {});

        editingSlug = slug;
        document.getElementById('form-slug').value = inst.slug;
        document.getElementById('form-slug').disabled = true; // Can't change slug
        document.getElementById('form-name').value = inst.name || '';
        document.getElementById('form-password').value = inst.password || '';
        document.getElementById('form-type').value = cfg.type || inst.type || 'Ortaokul';
        document.getElementById('form-city').value = cfg.city || '';
        document.getElementById('form-district').value = cfg.district || '';
        document.getElementById('form-region').value = cfg.region || '';
        document.getElementById('form-logo').value = cfg.institution_logo || '';
        document.getElementById('form-contact-name').value = cfg.admin_contact?.name || '';
        document.getElementById('form-contact-phone').value = cfg.admin_contact?.phone || '';
        document.getElementById('form-contact-email').value = cfg.admin_contact?.email || '';
        document.getElementById('form-dorm-active').checked = cfg.module_dorm_active !== false;
        document.getElementById('form-logo-locked').checked = !!cfg.logo_locked;

        Swal.close();
        openInstitutionModal(false);
    } catch (err) {
        Swal.fire('Hata', err.message, 'error');
    }
}

async function deleteInstitution(slug, name) {
    const result = await Swal.fire({
        title: 'Kurum Silinsin mi?',
        html: `<strong>${name}</strong> kurumunu silmek istediğinize emin misiniz?<br><span class="text-red-600 font-bold">Bu işlem geri alınamaz!</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, Sil',
        cancelButtonText: 'İptal'
    });

    if (!result.isConfirmed) return;

    try {
        Swal.fire({ title: 'Siliniyor...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        await requestApi('delete', { slug });
        Swal.fire('Silindi!', 'Kurum başarıyla silindi.', 'success');
        loadInstitutions();
    } catch (err) {
        Swal.fire('Hata', err.message, 'error');
    }
}

// Form submit handler
document.getElementById('institution-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const slug = document.getElementById('form-slug').value.trim();
    const name = document.getElementById('form-name').value.trim();
    const password = document.getElementById('form-password').value.trim();
    const type = document.getElementById('form-type').value;

    if (!slug || !name || !password) {
        Swal.fire('Hata', 'Slug, isim ve şifre zorunludur.', 'error');
        return;
    }

    const payload = {
        slug,
        name,
        password,
        type,
        city: document.getElementById('form-city').value,
        district: document.getElementById('form-district').value,
        region: document.getElementById('form-region').value,
        institution_logo: document.getElementById('form-logo').value,
        logo_locked: document.getElementById('form-logo-locked').checked,
        module_dorm_active: document.getElementById('form-dorm-active').checked,
        admin_contact: {
            name: document.getElementById('form-contact-name').value,
            phone: document.getElementById('form-contact-phone').value,
            email: document.getElementById('form-contact-email').value
        }
    };

    try {
        Swal.fire({ title: 'Kaydediliyor...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // upsert checks internally
        await requestApi('upsert', payload);

        Swal.fire('Başarılı', editingSlug ? 'Kurum güncellendi.' : 'Kurum oluşturuldu.', 'success');
        closeInstitutionModal();
        loadInstitutions();
    } catch (err) {
        Swal.fire('Hata', err.message, 'error');
    }
});

// --- NAVIGATION ---
function switchView(viewName) {
    // Close all modals
    document.querySelectorAll('[id$="-modal"]').forEach(el => {
        if (el.id !== 'login-modal') el.classList.add('hidden');
    });

    // Auto-close sidebar on mobile
    if (window.innerWidth < 768) {
        toggleSidebar(false);
    }

    // If Institutions, ensure we are exploring
    if (viewName === 'institutions') {
        loadInstitutions();
    }
}

function toggleSidebar(forceState) {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    const isClosed = sidebar.classList.contains('-translate-x-full');
    const shouldOpen = forceState !== undefined ? forceState : isClosed;

    if (shouldOpen) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('super_admin_pass');
    location.reload();
}

// --- HADITH MANAGEMENT ---
let currentHadiths = {};

async function openHadithModal() {
    document.getElementById('hadith-modal').classList.remove('hidden');
    loadHadiths();
}

function closeHadithModal() {
    document.getElementById('hadith-modal').classList.add('hidden');
}

async function loadHadiths() {
    const container = document.getElementById('weeks-container');
    container.innerHTML = 'Yükleniyor...';

    try {
        const data = await requestApi('get_hadiths');
        currentHadiths = data.config || {};
        renderHadithWeeks();
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="text-red-500 text-center p-4">Hata: ${e.message}</div>`;
    }
}


function renderHadithWeeks() {
    const type = document.getElementById('hadith-type').value;
    const container = document.getElementById('weeks-container');

    // Get existing data or initialize
    let rawWeeks = currentHadiths[type];
    if (typeof rawWeeks === 'string') {
        try { rawWeeks = JSON.parse(rawWeeks); } catch (e) { rawWeeks = []; }
    }
    const weeks = Array.isArray(rawWeeks) ? rawWeeks : [];

    // Get the first item or create empty
    const currentWeek = weeks.length > 0 ? weeks[0] : { text: '', arabic: '', Source: '' };

    // Date
    let startDate = currentHadiths[type + '_date'];

    // Helper: Get Current Monday
    function getCurrentMonday() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    if (!startDate) {
        startDate = getCurrentMonday();
        // Auto-set the internal overlap tracker too
        currentHadiths[type + '_date'] = startDate;
    }

    if (startDate) document.getElementById('semester-start-date').value = startDate;

    // Render DARK FORM
    container.innerHTML = `
    <div class="glass-card p-6 rounded-xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-50"></div>
        <div class="relative z-10">
            <div class="mb-5">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Haftanın Başlangıç Tarihi (Pazartesi)</label>
                <input type="date" id="single-date" onchange="updateSingleDate(this.value)" value="${startDate}" class="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors shadow-inner">
                <p class="text-[10px] text-slate-500 mt-1.5 font-medium"><i class="fa-solid fa-info-circle mr-1"></i>Bu tarihi seçtiğiniz haftanın Pazartesi günü olarak ayarlayın.</p>
            </div>

            <div class="mb-5">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Hadis-i Şerif (Türkçe)</label>
                <textarea onchange="updateSingleHadith('text', this.value)" class="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-4 text-white h-32 focus:border-emerald-500 outline-none transition-colors shadow-inner leading-relaxed" placeholder="Hadis metnini buraya giriniz...">${currentWeek.text || currentWeek.Hadith || ''}</textarea>
            </div>

            <div class="mb-5">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Arapça Metin</label>
                <textarea onchange="updateSingleHadith('arabic', this.value)" class="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-4 text-white h-28 font-mono text-right focus:border-emerald-500 outline-none transition-colors shadow-inner text-lg" placeholder="Arapça metnini buraya giriniz...">${currentWeek.arabic || ''}</textarea>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Kaynak</label>
                <input onchange="updateSingleHadith('Source', this.value)" value="${currentWeek.Source || ''}" class="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors shadow-inner" placeholder="Örn: Buhari">
            </div>
        </div>
    </div>
    `;
}

// --- SINGLE MODE UPDATERS ---
window.updateSingleDate = function (val) {
    const type = document.getElementById('hadith-type').value;
    currentHadiths[type + '_date'] = val;
    // Also update the hidden original input if needed, but we use strict sync now
    document.getElementById('semester-start-date').value = val;
}

window.updateSingleHadith = function (field, val) {
    const type = document.getElementById('hadith-type').value;

    // Ensure array exists
    if (!currentHadiths[type] || !Array.isArray(currentHadiths[type])) {
        currentHadiths[type] = [];
    }

    // Ensure first item exists
    if (currentHadiths[type].length === 0) {
        currentHadiths[type].push({ text: '', arabic: '', Source: '' });
    }

    // Update
    currentHadiths[type][0][field] = val;

    // Legacy sync
    if (field === 'text') currentHadiths[type][0].Hadith = val;
}

// Expose render
window.renderHadithWeeks = renderHadithWeeks;

async function syncHadithsToApi() {
    const type = document.getElementById('hadith-type').value;
    // Ensure we send what we have
    const weeks = currentHadiths[type] || [];
    const start_date = document.getElementById('semester-start-date').value;

    try {
        await requestApi('save_hadith', { type, weeks, start_date });
        Swal.fire('Başarılı', 'Hadis güncellendi.', 'success');
    } catch (e) {
        Swal.fire('Hata', e.message, 'error');
    }
}
window.syncHadithsToApi = syncHadithsToApi;

// --- GALLERY ---
let currentGallery = {}; // {Ortaokul: {images:[], videos:[], left_images: [] } }

// Initialize Supabase Client
async function initSupabase() {
    try {
        const data = await requestApi('get_upload_config');
        if (data.url && data.key && window.supabase) {
            supabaseClient = window.supabase.createClient(data.url, data.key);
            // Supabase Initialized
        }
    } catch (e) {
        console.error('Supabase init failed', e);
    }
}

async function openGalleryModal() {
    document.getElementById('gallery-modal').classList.remove('hidden');
    loadGallery();
}

function closeGalleryModal() {
    document.getElementById('gallery-modal').classList.add('hidden');
}

let activeGalleryTab = 'main'; // main, left, video
function switchGalleryTab(tab) {
    activeGalleryTab = tab;

    // Update buttons
    document.querySelectorAll('.gallery-tab').forEach(btn => {
        btn.classList.remove('active', 'bg-white', 'shadow-sm', 'text-slate-800');
        btn.classList.add('text-slate-500', 'hover:bg-white/50');
    });

    const activeBtn = document.getElementById('tab-' + tab);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-white', 'shadow-sm', 'text-slate-800');
        activeBtn.classList.remove('text-slate-500', 'hover:bg-white/50');
    }

    loadGallery(); // Reload grid
}

async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '<p class="text-center text-gray-500 w-full col-span-full py-8">Yükleniyor...</p>';
    document.getElementById('gallery-empty').classList.add('hidden');

    updateSelectionUI(); // Reset selection

    try {
        const data = await requestApi('get_gallery');
        currentGallery = data.gallery || data.config || {};
        renderGallery();
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p class="text-center text-red-500 w-full col-span-full">Hata oluştu.</p>';
    }
}

function renderGallery() {
    const type = document.getElementById('gallery-type').value;
    const grid = document.getElementById('gallery-grid');
    // Clear grid
    grid.innerHTML = '';

    const typeData = currentGallery[type] || {};

    // UI 'tab-main' maps to 'images' (Right)
    // UI 'tab-left' maps to 'left_images' (Left)
    // UI 'tab-video' maps to 'videos' (Video URLs)

    let items = [];
    if (activeGalleryTab === 'main') items = typeData.images || [];
    else if (activeGalleryTab === 'left') items = typeData.left_images || [];
    else if (activeGalleryTab === 'video') items = typeData.videos || [];

    if (!items || items.length === 0) {
        document.getElementById('gallery-empty').classList.remove('hidden');
        return;
    }
    document.getElementById('gallery-empty').classList.add('hidden');

    items.forEach((item, idx) => {
        const url = typeof item === 'string' ? item : (item.url || '');

        const div = document.createElement('div');
        // Clean, Standard Video Aspect Ratio
        div.className = 'group relative aspect-video bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50 shadow-sm hover:shadow-lg hover:border-blue-500/50 transition-all duration-300';

        // Content Logic - Object Contain (Show Full Image)
        let content = `<img src="${url}" class="w-full h-full object-contain" loading="lazy">`;

        if (activeGalleryTab === 'video') {
            if (url.includes('youtube') || url.includes('youtu.be')) {
                const videoId = url.split('v=')[1] || url.split('/').pop();
                const thumbUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                content = `
                    <div class="relative w-full h-full bg-black">
                        <img src="${thumbUrl}" class="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity">
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div class="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg text-white transform group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-play ml-1 text-lg"></i>
                            </div>
                        </div>
                    </div>`;
            } else {
                content = `<video src="${url}" class="w-full h-full object-contain bg-black" muted></video>`;
            }
        }

        div.innerHTML = `
        <!-- Selection (Hidden by default, visible on hover or checked) -->
        <div class="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity peer-checked:opacity-100">
            <input type="checkbox" data-idx="${idx}" data-url="${url}"
            onchange="updateSelectionUI(this)" 
            class="gallery-checkbox w-5 h-5 accent-blue-600 cursor-pointer shadow-md rounded border-slate-600 bg-slate-700 focus:ring-blue-500 checked:opacity-100">
        </div>

        <!-- Main Content -->
        <div class="w-full h-full bg-slate-900 flex items-center justify-center">
            ${content}
        </div>

        <!-- Hover Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"></div>

        <!-- Delete Button (Top Right) -->
        <button onclick="deleteGalleryItem(${idx})" 
            class="absolute top-2 right-2 z-20 bg-slate-900/80 text-red-500 w-8 h-8 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:text-white flex items-center justify-center transform scale-90 hover:scale-100 border border-slate-700"
            title="Sil">
            <i class="fa fa-trash text-xs"></i>
        </button>
        `;
        grid.appendChild(div);

        // Re-apply selection state if needed (logic simplified)
    });
}

async function deleteGalleryItem(idx) {
    const type = document.getElementById('gallery-type').value;
    if (!currentGallery[type]) return;

    // Determine array to splice
    let arr = null;
    if (activeGalleryTab === 'main') arr = currentGallery[type].images;
    else if (activeGalleryTab === 'left') arr = currentGallery[type].left_images;
    else if (activeGalleryTab === 'video') arr = currentGallery[type].videos;

    if (!arr) return;

    const item = arr[idx];
    const url = typeof item === 'string' ? item : (item.url || '');

    // Confirm
    const result = await Swal.fire({
        title: 'Silinsin mi?',
        text: "Bu öğe galeri listesinden kaldırılacak.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Evet, Sil',
        cancelButtonText: 'İptal'
    });

    if (!result.isConfirmed) return;

    // Delete from array
    arr.splice(idx, 1);

    // Attempt storage delete if it looks like our storage file
    if (url && url.includes('supabase')) {
        // Fire and forget storage delete
        requestApi('delete_gallery_file', { path: url }).catch(console.error);
    }

    // Save Config
    try {
        await requestApi('save_gallery', { gallery: currentGallery });
        renderGallery();
        Swal.fire({
            icon: 'success',
            title: 'Silindi',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
    } catch (e) {
        Swal.fire('Hata', 'Kaydetme hatası: ' + e.message, 'error');
    }
}

// --- IMAGE COMPRESSION ---
async function compressImage(file, quality = 0.8, maxWidth = 1920) {
    if (!file.type.match(/image.*/)) return file; // Skip non-images

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize logic
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file); // Fallback
                        return;
                    }
                    // Create new File object
                    const newFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(newFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => resolve(file); // Fallback on error
        };
        reader.onerror = (err) => resolve(file); // Fallback on error
    });
}

// --- UPLOAD DISTRIBUTION ---
let selectedDistFiles = [];

function initDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('dist-files');

    if (!dropZone || !fileInput) return;

    // Click to open file dialog
    dropZone.addEventListener('click', () => fileInput.click());

    // Input change
    fileInput.addEventListener('change', () => handleDistFiles(fileInput.files));

    // Drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('border-blue-500', 'bg-blue-500/10');
        dropZone.classList.remove('border-slate-700', 'bg-slate-800/50');
    }

    function unhighlight(e) {
        dropZone.classList.remove('border-blue-500', 'bg-blue-500/10');
        dropZone.classList.add('border-slate-700', 'bg-slate-800/50');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleDistFiles(files);
    }
}

async function handleDistFiles(files) {
    if (!files || files.length === 0) return;

    const fileListElement = document.getElementById('file-list');

    // Show loading state if many files
    if (files.length > 3) {
        Swal.fire({
            title: 'Dosyalar İşleniyor...',
            text: 'Görseller optimize ediliyor, lütfen bekleyin.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    }

    // Process files sequentially or parallel
    const processedFiles = [];

    for (const file of Array.from(files)) {
        // Compress if image
        if (file.type.startsWith('image/')) {
            try {
                const compressed = await compressImage(file);
                // Attach original size for comparison UI (optional hack)
                compressed._originalSize = file.size;
                processedFiles.push(compressed);
            } catch (e) {
                console.error("Compression failed", e);
                processedFiles.push(file);
            }
        } else {
            processedFiles.push(file);
        }
    }

    if (files.length > 3) Swal.close();

    // Convert to array and append
    selectedDistFiles = [...selectedDistFiles, ...processedFiles];

    // Update UI
    renderDistFiles();
}

function renderDistFiles() {
    const list = document.getElementById('file-list');
    list.innerHTML = '';

    selectedDistFiles.forEach((file, idx) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700';

        // Size display
        let sizeText = (file.size / 1024).toFixed(1) + ' KB';
        if (file._originalSize && file._originalSize > file.size) {
            const saved = ((file._originalSize - file.size) / 1024).toFixed(1);
            sizeText += ` <span class="text-emerald-400 text-[10px] ml-1">(-${saved} KB)</span>`;
        }

        div.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <i class="fa-solid fa-image text-slate-400"></i>
                <div class="flex flex-col overflow-hidden">
                    <span class="text-xs font-bold text-slate-200 truncate">${file.name}</span>
                    <span class="text-[10px] text-slate-500">${sizeText}</span>
                </div>
            </div>
            <button onclick="removeDistFile(${idx})" class="text-slate-500 hover:text-red-400 transition-colors">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
        list.appendChild(div);
    });
}
window.removeDistFile = function (idx) {
    selectedDistFiles.splice(idx, 1);
    renderDistFiles();
}

function openUploadModal() {
    document.getElementById('upload-dist-modal').classList.remove('hidden');
    // Reset defaults
    document.getElementById('dist-target-general').checked = true;
    toggleUploadTarget();

    // Reset Files
    selectedDistFiles = [];
    renderDistFiles();
}

function closeUploadModal() {
    document.getElementById('upload-dist-modal').classList.add('hidden');
}

function toggleUploadTarget() {
    const target = document.querySelector('input[name="dist-target"]:checked').value;
    document.getElementById('dist-select-region').classList.add('hidden');
    document.getElementById('dist-select-institution').classList.add('hidden');

    if (target === 'region') document.getElementById('dist-select-region').classList.remove('hidden');
    if (target === 'institution') document.getElementById('dist-select-institution').classList.remove('hidden');
}

async function startDistributionUpload() {
    // USE SELECTED FILES ARRAY
    const files = selectedDistFiles;

    if (files.length === 0) {
        Swal.fire('Hata', 'Lütfen en az bir dosya seçin.', 'warning');
        return;
    }

    if (!supabaseClient) {
        Swal.fire('Hata', 'Yükleme servisi başlatılamadı. Sayfayı yenileyip tekrar deneyin.', 'error');
        return;
    }

    const galleryTarget = document.querySelector('input[name="dist-gallery-type"]:checked').value; // main, left
    const distributionTarget = document.querySelector('input[name="dist-target"]:checked').value; // general, region, institution
    let distributionValue = '';

    if (distributionTarget === 'region') {
        distributionValue = document.getElementById('dist-region-input').value;
        if (!distributionValue) { Swal.fire('Uyarı', 'Mıntıka adı giriniz.', 'warning'); return; }
    }
    if (distributionTarget === 'institution') {
        distributionValue = document.getElementById('dist-institution-input').value;
        if (!distributionValue) { Swal.fire('Uyarı', 'Kurum slug veya adı giriniz.', 'warning'); return; }
    }

    // 1. Upload Files
    Swal.fire({ title: 'Yükleniyor...', html: 'Dosyalar yükleniyor, lütfen bekleyin.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const uploadedUrls = [];
        for (let file of files) {
            const fileName = `admin-upload/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            const { data, error } = await supabaseClient.storage.from('images').upload(fileName, file);
            if (error) throw error;

            const { data: { publicUrl } } = supabaseClient.storage.from('images').getPublicUrl(fileName);
            uploadedUrls.push(publicUrl);
        }

        // 2. Distribute via API
        await requestApi('distribute_gallery_items', {
            items: uploadedUrls,
            target_type: distributionTarget,
            target_value: distributionValue,
            gallery_type: galleryTarget,
            institution_type: document.getElementById('gallery-type').value // For 'general' target needed context
        });

        Swal.fire('Başarılı', 'Dosyalar başarıyla yüklendi ve hedef kurumlara dağıtıldı.', 'success');
        closeUploadModal();

        // Reload if we updated something visible (General)
        if (distributionTarget === 'general') {
            loadGallery();
        }
    } catch (e) {
        console.error('Upload error:', e);
        Swal.fire('Hata', 'Yükleme sırasında hata oluştu: ' + e.message, 'error');
    }
}

async function saveGallery() {
    try {
        await requestApi('save_gallery', { gallery: currentGallery });
        Swal.fire('Başarılı', 'Galeri kaydedildi.', 'success');
    } catch (e) {
        Swal.fire('Hata', e.message, 'error');
    }
}

// --- GALLERY SELECTION & BULK DELETE ---
let isAllSelected = false;

function toggleSelectAll() {
    isAllSelected = !isAllSelected;
    const checkboxes = document.querySelectorAll('.gallery-checkbox');
    checkboxes.forEach(cb => cb.checked = isAllSelected);

    const btn = document.getElementById('select-all-btn');
    if (isAllSelected) {
        btn.innerHTML = '<i class="fa-solid fa-square"></i> Seçimi Kaldır';
        btn.classList.add('bg-blue-100', 'text-blue-600');
        btn.classList.remove('bg-slate-100', 'text-slate-600');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-check-square"></i> Tümünü Seç';
        btn.classList.remove('bg-blue-100', 'text-blue-600');
        btn.classList.add('bg-slate-100', 'text-slate-600');
    }
    updateSelectionUI();
}

function updateSelectionUI(context) {
    // 1. Visual Feedback (Card Highlight)
    if (context && context.tagName === 'INPUT') {
        // Single Checkbox Changed
        const card = context.closest('.group');
        if (card) {
            if (context.checked) {
                card.classList.add('ring-2', 'ring-blue-500', 'border-transparent');
            } else {
                card.classList.remove('ring-2', 'ring-blue-500', 'border-transparent');
            }
        }
    } else {
        // Bulk Update (Select All or Init)
        document.querySelectorAll('.gallery-checkbox').forEach(cb => {
            const card = cb.closest('.group');
            if (card) {
                if (cb.checked) {
                    card.classList.add('ring-2', 'ring-blue-500', 'border-transparent');
                } else {
                    card.classList.remove('ring-2', 'ring-blue-500', 'border-transparent');
                }
            }
        });
    }

    // 2. Update Counts & Buttons
    const checkboxes = document.querySelectorAll('.gallery-checkbox:checked');
    const count = checkboxes.length;

    // Update bulk edit button
    const editBtn = document.getElementById('bulk-edit-btn');
    const deleteBtn = document.getElementById('bulk-delete-btn');

    if (count > 0) {
        editBtn.classList.remove('hidden');
        deleteBtn.classList.remove('hidden');
        document.getElementById('selected-count').textContent = count;
        document.getElementById('delete-selected-count').textContent = count;
        // Opsiyonel: Bulk edit modalındaki sayıyı da güncelle
        const bulkCountSpan = document.getElementById('bulk-selected-count');
        if (bulkCountSpan) bulkCountSpan.textContent = count;
    } else {
        editBtn.classList.add('hidden');
        deleteBtn.classList.add('hidden');
    }

    // Update select all button state
    const allCheckboxes = document.querySelectorAll('.gallery-checkbox');
    const isAllSelected = allCheckboxes.length > 0 && count === allCheckboxes.length;
    const btn = document.getElementById('select-all-btn');

    if (btn) {
        if (isAllSelected) {
            btn.innerHTML = '<i class="fa-solid fa-square-check"></i> Seçimi Kaldır';
            btn.classList.add('bg-blue-100', 'text-blue-600');
            btn.classList.remove('bg-slate-100', 'text-slate-600');
        } else {
            btn.innerHTML = '<i class="fa-solid fa-check-square"></i> Tümünü Seç';
            btn.classList.remove('bg-blue-100', 'text-blue-600');
            btn.classList.add('bg-slate-100', 'text-slate-600');
        }
        // Ensure click handler handles the toggle correctly
        btn.onclick = toggleSelectAll;
    }
}

async function bulkDeleteSelected() {
    const checkboxes = document.querySelectorAll('.gallery-checkbox:checked');
    if (checkboxes.length === 0) {
        Swal.fire('Uyarı', 'Silmek için önce görsel seçin', 'warning');
        return;
    }

    const result = await Swal.fire({
        title: `${checkboxes.length} görsel silinecek!`,
        text: 'Bu görseller hem veritabanından hem de Storage\'dan kalıcı olarak silinecektir. Bu işlem geri alınamaz!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, Hepsini Sil',
        cancelButtonText: 'İptal'
    });

    if (!result.isConfirmed) return;

    // We process deletions sequentially or parallel?
    // Parallel is faster but let's do simple loop
    const type = document.getElementById('gallery-type').value;
    if (!currentGallery[type]) return;

    let arr = null;
    if (activeGalleryTab === 'main') arr = currentGallery[type].images;
    else if (activeGalleryTab === 'left') arr = currentGallery[type].left_images;
    else if (activeGalleryTab === 'video') arr = currentGallery[type].videos;

    if (!arr) return;

    // Get indices to delete (in reverse order to avoid index shift)
    const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.idx)).sort((a, b) => b - a);

    for (let idx of indices) {
        const item = arr[idx];
        const url = typeof item === 'string' ? item : (item.url || '');

        arr.splice(idx, 1);

        // Try storage delete
        if (url && url.includes('supabase')) {
            requestApi('delete_gallery_file', { path: url }).catch(() => { });
        }
    }

    try {
        await requestApi('save_gallery', { gallery: currentGallery });
        renderGallery();
        Swal.fire('Başarılı', 'Seçilenler silindi.', 'success');
    } catch (e) {
        Swal.fire('Hata', 'Kaydetme hatası: ' + e.message, 'error');
    }
}

// --- ANNOUNCEMENT MANAGEMENT ---
let currentAnnouncements = [];

async function openAnnouncementModal() {
    document.getElementById('announcement-modal').classList.remove('hidden');

    // Load announcements
    try {
        const data = await requestApi('get_announcements');
        currentAnnouncements = data.announcements || [];
        renderAnnouncements();
    } catch (e) {
        console.error(e);
    }
}

function closeAnnouncementModal() {
    document.getElementById('announcement-modal').classList.add('hidden');
}

function renderAnnouncements() {
    const list = document.getElementById('announcements-list'); // Fixed ID
    if (!list) return;
    list.innerHTML = '';

    const today = new Date().setHours(0, 0, 0, 0);

    currentAnnouncements.forEach((ann, idx) => {
        // Status Check
        let statusBadge = '<span class="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Aktif</span>';

        if (ann.start_date || ann.end_date) {
            const start = ann.start_date ? new Date(ann.start_date).setHours(0, 0, 0, 0) : null;
            const end = ann.end_date ? new Date(ann.end_date).setHours(23, 59, 59, 999) : null;

            if (start && start > today) {
                statusBadge = '<span class="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Planlandı</span>';
            } else if (end && end < today) {
                statusBadge = '<span class="text-[10px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Süresi Doldu</span>';
            }
        }

        const dateRange = (ann.start_date || ann.end_date)
            ? `<div class="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                 <i class="fa-regular fa-calendar"></i> 
                 ${ann.start_date ? new Date(ann.start_date).toLocaleDateString() : '...'} - 
                 ${ann.end_date ? new Date(ann.end_date).toLocaleDateString() : 'Süresiz'}
               </div>`
            : '';

        const div = document.createElement('div');
        div.className = 'glass-card flex items-center justify-between p-4 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors group';
        div.innerHTML = `
            <div>
                <p class="font-bold text-slate-200">${ann.text}</p>
                <div class="flex flex-wrap gap-2 mt-2 items-center">
                    ${statusBadge}
                    <span class="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">${ann.target || 'Tüm'}</span>
                    ${ann.region ? `<span class="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">${ann.region}</span>` : ''}
                </div>
                ${dateRange}
            </div>
            <button onclick="deleteAnnouncement(${idx})" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-900/30 text-slate-500 hover:text-red-400 flex items-center justify-center transition-all">
                <i class="fa-solid fa-trash text-sm"></i>
            </button>
        `;
        list.appendChild(div);
    });
}

async function deleteAnnouncement(idx) {
    currentAnnouncements.splice(idx, 1);
    try {
        await requestApi('save_announcements', { announcements: currentAnnouncements });
        renderAnnouncements();
    } catch (e) {
        Swal.fire('Hata', e.message, 'error');
    }
}

// --- CMS MANAGEMENT ---
let currentCMSContent = {};

async function openCMSModal() {
    document.getElementById('cms-modal').classList.remove('hidden');

    // Default tab
    switchCMSTab('hero');

    try {
        const data = await requestApi('get_landing_content');
        if (data.content) {
            currentCMSContent = data.content;
            populateCMSForm(currentCMSContent);
        }
    } catch (e) {
        console.error('CMS Content Load Error:', e);
    }
}

function closeCMSModal() {
    document.getElementById('cms-modal').classList.add('hidden');
}

function switchCMSTab(tabName) {
    // Hide all tabs
    ['hero', 'solutions', 'contact'].forEach(t => {
        document.getElementById(`cms-tab-${t}`).classList.add('hidden');
        document.getElementById(`tab-btn-${t}`).classList.remove('border-indigo-500', 'text-indigo-400', 'bg-indigo-500/10');
        document.getElementById(`tab-btn-${t}`).classList.add('border-transparent', 'text-slate-500');
    });

    // Show selected
    document.getElementById(`cms-tab-${tabName}`).classList.remove('hidden');
    const btn = document.getElementById(`tab-btn-${tabName}`);
    btn.classList.remove('border-transparent', 'text-slate-500');
    btn.classList.add('border-indigo-500', 'text-indigo-400', 'bg-indigo-500/10');
}

function populateCMSForm(content) {
    if (!content) return;

    // Hero
    if (content.hero) {
        document.getElementById('cms-hero-badge').value = content.hero.badge || '';
        document.getElementById('cms-hero-title1').value = content.hero.title1 || '';
        document.getElementById('cms-hero-title2').value = content.hero.title2 || '';
        document.getElementById('cms-hero-desc').value = content.hero.description || '';
    }

    // Solutions
    if (content.solutions) {
        if (content.solutions.sol1) {
            document.getElementById('cms-sol1-title').value = content.solutions.sol1.title || '';
            document.getElementById('cms-sol1-desc').value = content.solutions.sol1.desc || '';
        }
        if (content.solutions.sol2) {
            document.getElementById('cms-sol2-title').value = content.solutions.sol2.title || '';
            document.getElementById('cms-sol2-desc').value = content.solutions.sol2.desc || '';
        }
        if (content.solutions.sol3) {
            document.getElementById('cms-sol3-title').value = content.solutions.sol3.title || '';
            document.getElementById('cms-sol3-desc').value = content.solutions.sol3.desc || '';
        }
    }

    // Contact
    if (content.contact) {
        document.getElementById('cms-contact-email').value = content.contact.email || '';
        document.getElementById('cms-contact-phone').value = content.contact.phone || '';
        document.getElementById('cms-whatsapp-link').value = content.contact.whatsapp || '';
    }
}

async function saveCMS() {
    const content = {
        hero: {
            badge: document.getElementById('cms-hero-badge').value,
            title1: document.getElementById('cms-hero-title1').value,
            title2: document.getElementById('cms-hero-title2').value,
            description: document.getElementById('cms-hero-desc').value
        },
        solutions: {
            sol1: {
                title: document.getElementById('cms-sol1-title').value,
                desc: document.getElementById('cms-sol1-desc').value
            },
            sol2: {
                title: document.getElementById('cms-sol2-title').value,
                desc: document.getElementById('cms-sol2-desc').value
            },
            sol3: {
                title: document.getElementById('cms-sol3-title').value,
                desc: document.getElementById('cms-sol3-desc').value
            }
        },
        contact: {
            email: document.getElementById('cms-contact-email').value,
            phone: document.getElementById('cms-contact-phone').value,
            whatsapp: document.getElementById('cms-whatsapp-link').value
        }
    };

    try {
        await requestApi('save_landing_content', { content });
        Swal.fire('Başarılı', 'Site güncellendi.', 'success');
    } catch (e) {
        Swal.fire('Hata', e.message, 'error');
    }
}

// --- EMERGENCY ---
async function openEmergencyModal() {
    document.getElementById('emergency-modal').classList.remove('hidden');
    try {
        const data = await requestApi('get_emergency_config');
        const cfg = data.config || {};
        document.getElementById('emergency-active').checked = !!cfg.active;
        document.getElementById('emergency-title').value = cfg.title || '';
        document.getElementById('emergency-message').value = cfg.message || '';
        document.getElementById('emergency-style').value = cfg.style || 'red';
    } catch (e) { }
}

function closeEmergencyModal() {
    document.getElementById('emergency-modal').classList.add('hidden');
}

async function saveEmergencyConfig() {
    const config = {
        active: document.getElementById('emergency-active').checked,
        title: document.getElementById('emergency-title').value,
        message: document.getElementById('emergency-message').value,
        style: document.getElementById('emergency-style').value,
        updated_at: new Date().toISOString()
    };

    try {
        await requestApi('save_emergency', { config });
        Swal.fire('Başarılı', 'Acil durum ayarları güncellendi.', 'success');
        closeEmergencyModal();
    } catch (e) {
        Swal.fire('Hata', e.message, 'error');
    }
}

// Enter key for login
document.getElementById('master-password')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') doLogin();
});

// --- DASHBOARD LOGIC ---
let dashboardChart = null;

async function switchView(viewName) {
    // UI Toggles
    const views = ['dashboard', 'institution'];
    views.forEach(v => {
        const el = document.getElementById(`${v}-view`);
        if (el) {
            if (v === viewName) {
                el.classList.remove('hidden');
                // el.classList.add('flex'); // Removed flex enforcement as dashboard might be block
            } else {
                el.classList.add('hidden');
                el.classList.remove('flex');
            }
        }
    });

    // Close Modals
    document.querySelectorAll('[id$="-modal"]').forEach(el => {
        if (el.id !== 'login-modal') el.classList.add('hidden');
    });

    // Sidebar Active State
    document.querySelectorAll('nav a').forEach(el => {
        // Reset classes
        if (el.id === `nav-${viewName}`) {
            // Add active styles
            el.classList.add('bg-gradient-to-r', 'from-indigo-600/20', 'to-transparent', 'border-indigo-500/30', 'text-white', 'shadow-lg'); // Indigo for dashboard
            if (viewName === 'institutions') {
                el.classList.remove('from-indigo-600/20', 'border-indigo-500/30');
                el.classList.add('from-blue-600/20', 'border-blue-500/30');
            }

            el.classList.remove('hover:bg-white/5', 'text-slate-400', 'border-transparent');
            const iconBox = el.querySelector('div');
            if (iconBox) {
                iconBox.classList.add('text-white');
                iconBox.classList.remove('bg-slate-800', 'text-slate-500');
                if (viewName === 'dashboard') iconBox.classList.add('bg-indigo-600');
                if (viewName === 'institutions') iconBox.classList.add('bg-blue-600');
            }
        } else if (el.id && el.id.startsWith('nav-')) {
            // Remove active styles
            el.classList.remove('bg-gradient-to-r', 'from-indigo-600/20', 'from-blue-600/20', 'to-transparent', 'border-indigo-500/30', 'border-blue-500/30', 'text-white', 'shadow-lg');
            el.classList.add('hover:bg-white/5', 'text-slate-400', 'border-transparent');
            const iconBox = el.querySelector('div');
            if (iconBox) {
                iconBox.classList.remove('bg-indigo-600', 'bg-blue-600', 'text-white');
                iconBox.classList.add('bg-slate-800', 'text-slate-500');
            }
        }
    });

    // Content Load
    if (viewName === 'dashboard') {
        await loadDashboard();
    } else if (viewName === 'institutions') {
        await loadInstitutions();
    }
}

async function loadDashboard() {
    try {
        // Parallel Fetch
        const [instRes, annRes, galRes] = await Promise.all([
            requestApi('list'),
            requestApi('list_announcements'),
            requestApi('get_gallery')
        ]);

        const institutions = instRes.institutions || [];
        const announcements = annRes.announcements || [];
        const gallery = galRes.gallery || galRes.config || {};

        // Stats
        document.getElementById('stat-total-inst').textContent = institutions.length;
        document.getElementById('stat-active-ann').textContent = announcements.length;

        let totalMedia = 0;
        // Count media across all institution types
        Object.values(gallery).forEach(typeObj => {
            if (typeObj && typeof typeObj === 'object') {
                totalMedia += (typeObj.images?.length || 0) + (typeObj.left_images?.length || 0) + (typeObj.videos?.length || 0);
            }
        });
        document.getElementById('stat-gallery-count').textContent = totalMedia;

        // Chart Logic
        renderInstChart(institutions);

    } catch (e) {
        console.error('Dashboard Load Error:', e);
    }
}

function renderInstChart(institutions) {
    const ctx = document.getElementById('instChart');
    if (!ctx) return;

    // Group by Type
    const typeCounts = {};
    institutions.forEach(inst => {
        let type = 'Diğer';

        // 1. Try root level (if returned directly)
        if (inst.type) type = inst.type;

        // 2. Try config object (Most likely scenario for jsonb)
        else if (inst.config) {
            const cfg = typeof inst.config === 'string' ? JSON.parse(inst.config) : inst.config;
            type = cfg.institution_type || cfg.type || 'Diğer';
        }

        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);

    if (dashboardChart) {
        dashboardChart.destroy();
    }

    dashboardChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)', // Blue
                    'rgba(168, 85, 247, 0.8)', // Purple
                    'rgba(236, 72, 153, 0.8)', // Pink
                    'rgba(16, 185, 129, 0.8)', // Emerald
                    'rgba(245, 158, 11, 0.8)', // Amber
                    'rgba(14, 165, 233, 0.8)', // Sky
                    'rgba(99, 102, 241, 0.8)'  // Indigo
                ],
                borderColor: 'rgba(30, 41, 59, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
                }
            },
            cutout: '75%'
        }
    });
}

document.addEventListener('DOMContentLoaded', initDragAndDrop);

async function broadcastAnnouncement() {
    const textInput = document.getElementById('announcement-text');
    const text = textInput.value.trim();

    if (!text) return Swal.fire('Uyar�', 'Duyuru metni giriniz', 'warning');

    const targetSelect = document.getElementById('announcement-type-filter');
    const targets = Array.from(targetSelect.selectedOptions).map(o => o.value).filter(v => v);
    const targetStr = targets.length > 0 ? targets.join(',') : 'T�m�';

    const regionInput = document.getElementById('announcement-region-filter');
    const region = regionInput ? regionInput.value.trim() : '';

    const startDate = document.getElementById('announcement-start').value;
    const endDate = document.getElementById('announcement-end').value;

    const newAnn = {
        id: Date.now(),
        text,
        target: targetStr,
        region: region,
        start_date: startDate || null,
        end_date: endDate || null,
        created_at: new Date().toISOString()
    };

    if (!currentAnnouncements) currentAnnouncements = [];
    currentAnnouncements.push(newAnn);

    // Save
    try {
        await requestApi('save_announcements', { announcements: currentAnnouncements });
        textInput.value = '';
        if (regionInput) regionInput.value = '';
        document.getElementById('announcement-start').value = '';
        document.getElementById('announcement-end').value = '';

        renderAnnouncements();
        Swal.fire('Ba�ar�l�', 'Duyuru yay�na al�nd�.', 'success');
    } catch (e) {
        Swal.fire('Hata', e.message, 'error');
    }
}

// =============================================================================
// AUDIT LOGS & PASSWORD MANAGEMENT
// =============================================================================

let allLogs = [];
let filteredLogs = [];

// --- AUDIT LOGS MODAL ---
async function openAuditLogsModal() {
    document.getElementById('audit-logs-modal').classList.remove('hidden');
    await loadAuditLogs();
}

function closeAuditLogsModal() {
    document.getElementById('audit-logs-modal').classList.add('hidden');
}

async function loadAuditLogs() {
    try {
        const res = await requestApi('get_audit_logs', {});
        allLogs = res.logs || [];
        filteredLogs = [...allLogs];
        renderAuditLogs();
    } catch (e) {
        console.error('Failed to load audit logs:', e);
        document.getElementById('logs-container').innerHTML = `
            <div class="text-center text-red-400 py-12">
                <i class="fa-solid fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Loglar yüklenemedi: ${e.message}</p>
            </div>
        `;
    }
}

async function refreshAuditLogs() {
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');

    await loadAuditLogs();

    icon.classList.remove('fa-spin');
    Swal.fire({
        icon: 'success',
        title: 'Yenilendi',
        text: `${allLogs.length} log kaydı yüklendi`,
        timer: 1500,
        showConfirmButton: false
    });
}

function renderAuditLogs() {
    const container = document.getElementById('logs-container');

    if (filteredLogs.length === 0) {
        container.innerHTML = `
            <div class="text-center text-slate-500 py-12">
                <i class="fa-solid fa-inbox text-3xl mb-3"></i>
                <p>Henüz işlem kaydı yok</p>
            </div>
        `;
        return;
    }

    // Action labels for pretty display
    const actionLabels = {
        'create_institution': { icon: 'fa-plus-circle', color: 'green', label: 'Kurum Ekle' },
        'update_institution': { icon: 'fa-edit', color: 'blue', label: 'Kurum Güncelle' },
        'delete_institution': { icon: 'fa-trash', color: 'red', label: 'Kurum Sil' },
        'broadcast_announcement': { icon: 'fa-bullhorn', color: 'amber', label: 'Duyuru Yayınla' },
        'save_gallery': { icon: 'fa-images', color: 'purple', label: 'Galeri Kaydet' },
        'save_landing_content': { icon: 'fa-desktop', color: 'indigo', label: 'CMS Güncelle' },
        'save_emergency': { icon: 'fa-triangle-exclamation', color: 'red', label: 'Acil Durum' },
        'change_password': { icon: 'fa-key', color: 'red', label: 'Şifre Değiştir' }
    };

    let html = '';
    filteredLogs.forEach(log => {
        const action = actionLabels[log.action] || { icon: 'fa-circle', color: 'slate', label: log.action };
        const timestamp = new Date(log.timestamp).toLocaleString('tr-TR');
        const details = JSON.stringify(log.details || {}, null, 2);

        html += `
            <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800 transition-all group">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-lg bg-${action.color}-500/10 flex items-center justify-center text-${action.color}-400 shrink-0 group-hover:scale-110 transition-transform">
                        <i class="fa-solid ${action.icon}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <h4 class="font-bold text-white">${action.label}</h4>
                            <span class="text-xs text-slate-500 font-mono whitespace-nowrap">${timestamp}</span>
                        </div>
                        <div class="space-y-1">
                            ${log.details?.slug ? `<p class="text-sm text-slate-400"><span class="text-slate-500">Slug:</span> <code class="text-blue-400">${log.details.slug}</code></p>` : ''}
                            ${log.details?.name ? `<p class="text-sm text-slate-400"><span class="text-slate-500">İsim:</span> ${log.details.name}</p>` : ''}
                            ${log.details?.type && log.details.type !== 'Ortaokul' ? `<p class="text-sm text-slate-400"><span class="text-slate-500">Tür:</span> <span class="inline-block px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">${log.details.type}</span></p>` : ''}
                            ${log.details?.message ? `<p class="text-sm text-slate-400">${log.details.message}</p>` : ''}
                            ${log.details?.text ? `<p class="text-sm text-slate-400 italic">"${log.details.text}"</p>` : ''}
                        </div>
                        <div class="flex items-center gap-3 mt-2 text-xs text-slate-600">
                            <span class="flex items-center gap-1">
                                <i class="fa-solid fa-network-wired"></i>
                                ${log.ip || 'unknown'}
                            </span>
                            <span class="flex items-center gap-1">
                                <i class="fa-solid fa-fingerprint"></i>
                                ${log.id.substring(0, 8)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function filterAuditLogs() {
    const searchText = document.getElementById('log-search').value.toLowerCase();
    const actionFilter = document.getElementById('log-action-filter').value;

    filteredLogs = allLogs.filter(log => {
        // Action filter
        if (actionFilter && log.action !== actionFilter) return false;

        // Search filter
        if (searchText) {
            const searchableText = JSON.stringify(log).toLowerCase();
            if (!searchableText.includes(searchText)) return false;
        }

        return true;
    });

    renderAuditLogs();
}

// --- PASSWORD MANAGEMENT ---
function openPasswordModal() {
    document.getElementById('password-modal').classList.remove('hidden');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.add('hidden');
}

async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        return Swal.fire('Uyarı', 'Tüm alanları doldurunuz', 'warning');
    }

    if (newPassword.length < 6) {
        return Swal.fire('Uyarı', 'Yeni şifre en az 6 karakter olmalıdır', 'warning');
    }

    if (newPassword !== confirmPassword) {
        return Swal.fire('Uyarı', 'Yeni şifreler eşleşmiyor', 'warning');
    }

    try {
        const res = await requestApi('change_password', {
            current_password: currentPassword,
            new_password: newPassword
        });

        Swal.fire({
            icon: 'success',
            title: 'Şifre Güncellendi!',
            text: 'Yeni şifrenizle tekrar giriş yapabilirsiniz.',
            showConfirmButton: false,
            timer: 2000
        });

        // Auto logout after 2 seconds
        setTimeout(() => {
            closePasswordModal();
            logout();
        }, 2000);

    } catch (e) {
        Swal.fire('Hata', e.message || 'Şifre güncellenemedi', 'error');
    }
}

// --- GLOBAL EXPORTS ---
window.attemptLogin = doLogin;
// console.log('Admin Panel v3 Script Fully Loaded');
