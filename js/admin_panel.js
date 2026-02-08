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

// --- AUTH & INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const savedPass = localStorage.getItem('super_admin_pass');
    if (savedPass) {
        document.getElementById('master-password').value = savedPass;
        doLogin();
    }
});

async function doLogin() {
    console.log('Login attempt started...');
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
        if (typeof loadInstitutions === 'function') loadInstitutions();

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
    contentDiv.innerHTML = '<p class="text-center text-gray-500 w-full col-span-3">Veriler yükleniyor...</p>';

    try {
        const data = await requestApi('list');
        const institutions = data.institutions || [];

        let html = '';

        institutions.forEach(inst => {
            const config = typeof inst.config === 'string' ? JSON.parse(inst.config) : (inst.config || {});
            const logo = config.institution_logo || 'https://via.placeholder.com/100';

            html += `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div class="flex items-center gap-4 mb-4">
                    <img src="${logo}" class="w-16 h-16 rounded-full object-cover border-2 border-slate-50 shadow-sm" onerror="this.src='https://via.placeholder.com/100'">
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">${inst.name}</h3>
                        <div class="flex gap-2 text-xs font-bold mt-1">
                             <span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">${inst.type || 'Kurum'}</span>
                             <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">${inst.slug}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editInstitution('${inst.slug}')" class="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-bold text-sm" title="Düzenle">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deleteInstitution('${inst.slug}', '${inst.name.replace(/'/g, "\\'")}')" class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-bold text-sm" title="Sil">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    <a href="/${inst.slug}/admin" target="_blank" class="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-bold text-sm">
                        Yönet
                    </a>
                </div>
            </div>`;
        });
        contentDiv.innerHTML = html;
    } catch (err) {
        contentDiv.innerHTML = `<p class="text-red-500 font-bold w-full col-span-3 text-center">Hata: ${err.message}</p>`;
    }
}

function filterInstitutions() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const cards = document.querySelectorAll('#institution-list > div');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'flex' : 'none';
    });
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

    // If Institutions, ensure we are exploring
    if (viewName === 'institutions') {
        loadInstitutions();
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

    // Render SIMPLE FORM
    container.innerHTML = `
    <div class="bg-white p-6 rounded-xl border shadow-sm">
        <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-2">Haftanın Başlangıç Tarihi (Pazartesi)</label>
            <input type="date" id="single-date" onchange="updateSingleDate(this.value)" value="${startDate}" class="w-full border p-2 rounded">
            <p class="text-xs text-slate-400 mt-1">Bu tarihi seçtiğiniz haftanın Pazartesi günü olarak ayarlayın.</p>
        </div>

        <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-2">Hadis-i Şerif (Türkçe)</label>
            <textarea onchange="updateSingleHadith('text', this.value)" class="w-full border p-3 rounded h-32" placeholder="Hadis metnini buraya giriniz...">${currentWeek.text || currentWeek.Hadith || ''}</textarea>
        </div>

        <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-2">Arapça Metin</label>
            <textarea onchange="updateSingleHadith('arabic', this.value)" class="w-full border p-3 rounded h-24 font-mono text-right" placeholder="Arapça metnini buraya giriniz...">${currentWeek.arabic || ''}</textarea>
        </div>

        <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">Kaynak</label>
            <input onchange="updateSingleHadith('Source', this.value)" value="${currentWeek.Source || ''}" class="w-full border p-2 rounded" placeholder="Örn: Buhari">
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
            console.log('Supabase Initialized');
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
        // Modern Card Container
        div.className = 'group relative aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300';

        // Content Logic
        let content = `<img src="${url}" class="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105" loading="lazy">`;

        if (activeGalleryTab === 'video') {
            if (url.includes('youtube') || url.includes('youtu.be')) {
                // YouTube Embed Preview
                const videoId = url.split('v=')[1] || url.split('/').pop();
                const thumbUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                content = `
                    <div class="relative w-full h-full">
                        <img src="${thumbUrl}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg text-white">
                                <i class="fa-solid fa-play ml-1"></i>
                            </div>
                        </div>
                    </div>`;
            } else {
                // Direct Video
                content = `<video src="${url}" class="w-full h-full object-cover" muted></video>`;
            }
        }

        div.innerHTML = `
        <!-- Selection Checkbox -->
        <div class="absolute top-2 left-2 z-20">
            <input type="checkbox" data-idx="${idx}" data-url="${url}"
            onchange="updateSelectionUI(this)" 
            class="gallery-checkbox w-5 h-5 accent-blue-600 cursor-pointer shadow-sm rounded border-gray-300 focus:ring-blue-500">
        </div>

        <!-- Main Content Area -->
        <div class="w-full h-full flex items-center justify-center bg-slate-100">
            ${content}
        </div>

        <!-- Actions Overlay (Gradient) -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

        <!-- Delete Button -->
        <button onclick="deleteGalleryItem(${idx})" 
            class="absolute top-2 right-2 z-20 bg-white text-red-500 w-8 h-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-50 hover:scale-110 flex items-center justify-center transform translate-y-2 group-hover:translate-y-0"
            title="Sil">
            <i class="fa fa-trash text-sm"></i>
        </button>
        
        <!-- Info Badge -->
        <div class="absolute bottom-3 left-3 right-3 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
             <span class="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] px-2 py-1 rounded font-bold shadow-sm uppercase tracking-wide border border-white/50">
                ${activeGalleryTab === 'main' ? 'Ana Galeri' : activeGalleryTab === 'left' ? 'Sol Galeri' : 'Video'}
             </span>
        </div>
        `;
        grid.appendChild(div);
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

// --- UPLOAD DISTRIBUTION ---
function openUploadModal() {
    document.getElementById('upload-dist-modal').classList.remove('hidden');
    // Reset defaults
    document.getElementById('dist-target-general').checked = true;
    toggleUploadTarget();
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
    const files = document.getElementById('dist-files').files;
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
    const list = document.getElementById('active-announcements');
    list.innerHTML = '';

    currentAnnouncements.forEach((ann, idx) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 bg-white border rounded-lg';
        div.innerHTML = `
            <div>
                <p class="font-bold text-slate-800">${ann.text}</p>
                <div class="flex gap-2 mt-1">
                    <span class="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">${ann.target || 'Tüm'}</span>
                    <span class="text-xs text-slate-400">${new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <button onclick="deleteAnnouncement(${idx})" class="text-red-500 hover:text-red-700 p-2">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        list.appendChild(div);
    });
}

async function addAnnouncement() {
    const text = document.getElementById('new-announcement-text').value.trim();
    if (!text) return Swal.fire('Uyarı', 'Duyuru metni giriniz', 'warning');

    const targets = Array.from(document.getElementById('announcement-target').selectedOptions).map(o => o.value);
    const targetStr = targets.includes('all') ? 'all' : targets.join(',');

    const newAnn = {
        id: Date.now(),
        text,
        target: targetStr,
        created_at: new Date().toISOString()
    };

    currentAnnouncements.push(newAnn);

    // Save
    try {
        await requestApi('save_announcements', { announcements: currentAnnouncements });
        document.getElementById('new-announcement-text').value = '';
        renderAnnouncements();
        Swal.fire('Başarılı', 'Duyuru eklendi.', 'success');
    } catch (e) {
        Swal.fire('Hata', e.message, 'error');
    }
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
