// ADMIN.JS - Super Admin Logic (V2 - Consolidated)
// This file contains the logic for the super admin panel.
// It matches the inlined logic in admin.html (V17).

// --- CONFIG ---
const API_URL = '/api/manage-institutions';
const MASTER_PASSWORD_KEY = 'super_admin_pass';

// --- STATE ---
let currentInstitutions = [];

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin V2 JS Loaded");

    // Check for auto-login
    const savedPass = localStorage.getItem(MASTER_PASSWORD_KEY);
    if (savedPass) {
        document.getElementById('master-password').value = savedPass;
    }

    // Enter key support
    const input = document.getElementById('master-password');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }
});

// --- FUNCTIONS ---

async function attemptLogin() {
    const passwordInput = document.getElementById('master-password');
    const password = passwordInput.value.trim();
    const btn = document.querySelector('button[onclick="attemptLogin()"]');

    if (!password) {
        showError("Lütfen şifre giriniz.");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = "Giriş Yapılıyor...";
    }

    try {
        // 1. Verify Password & Fetch Data
        console.log("Attempting login...");
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'list',
                password: password
            })
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            console.error("Non-JSON Response", text);
            throw new Error("Sunucu JSON döndürmedi. Muhtemelen 500 hatası.");
        }

        const data = await res.json();

        if (data.success) {
            // Login Success
            console.log("Login successful, records:", data.count);
            localStorage.setItem(MASTER_PASSWORD_KEY, password);

            // Hide Login, Show Panel
            document.getElementById('admin-login-container').classList.add('hidden');
            document.getElementById('admin-panel-content').classList.remove('hidden');

            // Filter and Render
            currentInstitutions = data.data.filter(i => !i.slug.startsWith('system-'));
            renderInstitutions(currentInstitutions);

            showSuccess("Giriş Başarılı!");
        } else {
            throw new Error(data.error || "Giriş başarısız.");
        }

    } catch (err) {
        console.error("Login Error:", err);
        showError(err.message);
        localStorage.removeItem(MASTER_PASSWORD_KEY);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Giriş Yap";
        }
    }
}

function renderInstitutions(list) {
    const grid = document.getElementById('institutions-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (list.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">Kayıtlı kurum bulunamadı.</div>';
        return;
    }

    list.forEach(inst => {
        const div = document.createElement('div');
        div.className = 'bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group relative';

        // Extract a name
        let name = inst.slug;
        try {
            if (inst.config) {
                const cfg = typeof inst.config === 'string' ? JSON.parse(inst.config) : inst.config;
                name = cfg.institution_title || cfg.name || inst.slug;
            }
        } catch (e) { }

        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <i class="fas fa-school text-xl"></i>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href="/${inst.slug}/admin" target="_blank" class="p-2 text-slate-400 hover:text-blue-600 transition" title="Yönet">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <button onclick="deleteInstitution('${inst.slug}')" class="p-2 text-slate-400 hover:text-red-600 transition" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <h3 class="font-bold text-lg text-slate-800 mb-1 line-clamp-1">${name}</h3>
            <div class="text-xs font-mono text-slate-400 mb-4 bg-slate-50 px-2 py-1 rounded w-fit">${inst.slug}</div>
            
            <div class="flex gap-2 mt-auto">
                <a href="/${inst.slug}" target="_blank" class="flex-1 py-2 text-center text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                    Pano
                </a>
                <a href="/${inst.slug}/admin" target="_blank" class="flex-1 py-2 text-center text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition">
                    Yönet
                </a>
            </div>
        `;
        grid.appendChild(div);
    });
}

async function deleteInstitution(slug) {
    const password = localStorage.getItem(MASTER_PASSWORD_KEY);
    if (!password) return;

    const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: `${slug} kurumu ve tüm ayarları silinecek!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, Sil'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                slug: slug,
                password: password
            })
        });

        const data = await res.json();
        if (data.success) {
            showSuccess('Kurum silindi.');
            // Refresh list
            currentInstitutions = currentInstitutions.filter(i => i.slug !== slug);
            renderInstitutions(currentInstitutions);
        } else {
            throw new Error(data.error || "Silme başarısız.");
        }
    } catch (e) {
        showError(e.message);
    }
}

// --- HELPERS ---
function showError(msg) {
    Swal.fire({
        icon: 'error',
        title: 'Hata',
        text: msg,
        confirmButtonColor: '#2563eb'
    });
}

function showSuccess(msg) {
    Swal.fire({
        icon: 'success',
        title: 'Başarılı',
        text: msg,
        timer: 1500,
        showConfirmButton: false
    });
}
