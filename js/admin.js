// Admin Panel JavaScript
console.log("Admin panel yüklendi");

// Authentication Control
const CURRENT_SLUG = localStorage.getItem('admin_slug');
const CURRENT_PASSWORD = localStorage.getItem('admin_password');

if (!CURRENT_SLUG) {
    window.location.href = '/login.html';
}

// Duyuru ekleme
function addAnnouncement() {
    const container = document.getElementById('announcements-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="announcement-input flex-1 px-4 py-2 border border-gray-300 rounded-lg" placeholder="Duyuru metni...">
        <button type="button" onclick="removeAnnouncement(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Duyuru silme
function removeAnnouncement(btn) {
    btn.parentElement.remove();
}

// Sınav kazananı ekleme
function addExamWinner() {
    const container = document.getElementById('exam-winners-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `
        <input type="text" class="exam-class flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Sınıf (örn: 7.Sınıf)">
        <input type="text" class="exam-student flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="İsim Soyisim">
        <input type="number" class="exam-score w-32 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Puan">
        <button type="button" onclick="removeExamWinner(this)" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
    `;
    container.appendChild(div);
}

// Sınav kazananı silme
function removeExamWinner(btn) {
    btn.parentElement.remove();
}

// Mesaj gösterme
function showMessage(message, type = 'success') {
    const container = document.getElementById('message-container');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    container.innerHTML = `
        <div class="${bgColor} text-white px-6 py-4 rounded-lg shadow-lg">
            <p class="font-semibold">${message}</p>
        </div>
    `;
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}

// Verileri yükle
async function loadData() {
    try {
        const res = await fetch(`/api/get-config?slug=${CURRENT_SLUG}`);
        const config = await res.json();

        // --- 0. Kurum Ayarları ---
        if (config.institution_title) document.getElementById('institution-title').value = config.institution_title;
        if (config.institution_subtitle) document.getElementById('institution-subtitle').value = config.institution_subtitle;
        if (config.institution_slogan1) document.getElementById('institution-slogan1').value = config.institution_slogan1;
        if (config.institution_slogan2) document.getElementById('institution-slogan2').value = config.institution_slogan2;
        if (config.institution_logo) document.getElementById('institution-logo').value = config.institution_logo;

        // Hadis
        if (config.hadith) {
            const hadith = typeof config.hadith === 'string' ? JSON.parse(config.hadith) : config.hadith;
            document.getElementById('hadith-week').value = hadith.week || '';
            document.getElementById('hadith-arabic').value = hadith.arabic || '';
            document.getElementById('hadith-turkish').value = hadith.text || '';
        }

        // Yatakhane 1
        if (config.dorm1) {
            const dorm1 = typeof config.dorm1 === 'string' ? JSON.parse(config.dorm1) : config.dorm1;
            document.getElementById('dorm1-name').value = dorm1.name || '';
            document.getElementById('dorm1-count').value = dorm1.count || '';
            document.getElementById('dorm1-s1').value = dorm1.s1 || '';
            document.getElementById('dorm1-s2').value = dorm1.s2 || '';
            document.getElementById('dorm1-s3').value = dorm1.s3 || '';
            document.getElementById('dorm1-s4').value = dorm1.s4 || '';
            document.getElementById('dorm1-s5').value = dorm1.s5 || '';
            document.getElementById('dorm1-s6').value = dorm1.s6 || '';
        }

        // Yatakhane 2
        if (config.dorm2) {
            const dorm2 = typeof config.dorm2 === 'string' ? JSON.parse(config.dorm2) : config.dorm2;
            document.getElementById('dorm2-name').value = dorm2.name || '';
            document.getElementById('dorm2-count').value = dorm2.count || '';
            document.getElementById('dorm2-s1').value = dorm2.s1 || '';
            document.getElementById('dorm2-s2').value = dorm2.s2 || '';
            document.getElementById('dorm2-s3').value = dorm2.s3 || '';
            document.getElementById('dorm2-s4').value = dorm2.s4 || '';
            document.getElementById('dorm2-s5').value = dorm2.s5 || '';
            document.getElementById('dorm2-s6').value = dorm2.s6 || '';
        }

        // Duyurular
        if (config.announcements) {
            const announcements = typeof config.announcements === 'string' ? JSON.parse(config.announcements) : config.announcements;
            const container = document.getElementById('announcements-container');
            container.innerHTML = '';
            announcements.forEach(announcement => {
                const div = document.createElement('div');
                div.className = 'flex gap-2';
                div.innerHTML = `
                    <input type="text" class="announcement-input flex-1 px-4 py-2 border border-gray-300 rounded-lg" value="${announcement}" placeholder="Duyuru metni...">
                    <button type="button" onclick="removeAnnouncement(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
                `;
                container.appendChild(div);
            });
        }

        // Sınav
        if (config.exam_config) {
            const exam = typeof config.exam_config === 'string' ? JSON.parse(config.exam_config) : config.exam_config;
            document.getElementById('exam-name').value = exam.name || '';

            // Kazananları yükle
            if (exam.winners) {
                const container = document.getElementById('exam-winners-container');
                container.innerHTML = '';
                const lines = exam.winners.split('\n').filter(l => l.trim() !== '');

                lines.forEach(line => {
                    const parts = line.split(',');
                    if (parts.length >= 3) {
                        const div = document.createElement('div');
                        div.className = 'flex gap-2 items-center';
                        div.innerHTML = `
                            <input type="text" class="exam-class flex-1 px-3 py-2 border border-gray-300 rounded-lg" value="${parts[0].trim()}" placeholder="Sınıf (örn: 7.Sınıf)">
                            <input type="text" class="exam-student flex-1 px-3 py-2 border border-gray-300 rounded-lg" value="${parts[1].trim()}" placeholder="İsim Soyisim">
                            <input type="number" class="exam-score w-32 px-3 py-2 border border-gray-300 rounded-lg" value="${parts[2].trim()}" placeholder="Puan">
                            <button type="button" onclick="removeExamWinner(this)" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Sil</button>
                        `;
                        container.appendChild(div);
                    }
                });
            }
        }

        // Günün Sözü
        if (config.quote_of_day) {
            document.getElementById('quote-of-day').value = config.quote_of_day;
        }

        // Video URL
        if (config.video_url) {
            document.getElementById('video-url').value = config.video_url;
        }

        console.log('Veriler yüklendi');
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        showMessage('Veriler yüklenirken hata oluştu! Girdiğiniz link yanlış olabilir mi?', 'error');
    }
}

// Form submit
document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Kaydediliyor...';

    try {
        // Hadis
        const hadith = {
            week: document.getElementById('hadith-week').value,
            arabic: document.getElementById('hadith-arabic').value,
            text: document.getElementById('hadith-turkish').value
        };

        // Yatakhane 1
        const dorm1 = {
            name: document.getElementById('dorm1-name').value,
            count: document.getElementById('dorm1-count').value,
            s1: document.getElementById('dorm1-s1').value,
            s2: document.getElementById('dorm1-s2').value,
            s3: document.getElementById('dorm1-s3').value,
            s4: document.getElementById('dorm1-s4').value,
            s5: document.getElementById('dorm1-s5').value,
            s6: document.getElementById('dorm1-s6').value
        };

        // Yatakhane 2
        const dorm2 = {
            name: document.getElementById('dorm2-name').value,
            count: document.getElementById('dorm2-count').value,
            s1: document.getElementById('dorm2-s1').value,
            s2: document.getElementById('dorm2-s2').value,
            s3: document.getElementById('dorm2-s3').value,
            s4: document.getElementById('dorm2-s4').value,
            s5: document.getElementById('dorm2-s5').value,
            s6: document.getElementById('dorm2-s6').value
        };

        // Duyurular
        const announcementInputs = document.querySelectorAll('.announcement-input');
        const announcements = Array.from(announcementInputs)
            .map(input => input.value.trim())
            .filter(val => val !== '');

        // Sınav
        const examWinnerRows = document.querySelectorAll('#exam-winners-container > div');
        const examWinners = [];
        examWinnerRows.forEach(row => {
            const classInput = row.querySelector('.exam-class');
            const studentInput = row.querySelector('.exam-student');
            const scoreInput = row.querySelector('.exam-score');

            if (classInput && studentInput && scoreInput) {
                const classVal = classInput.value.trim();
                const studentVal = studentInput.value.trim();
                const scoreVal = scoreInput.value.trim();

                if (classVal && studentVal && scoreVal) {
                    examWinners.push(`${classVal},${studentVal},${scoreVal}`);
                }
            }
        });

        const exam_config = {
            name: document.getElementById('exam-name').value,
            winners: examWinners.join('\n')
        };

        // Günün Sözü
        const quote_of_day = document.getElementById('quote-of-day').value;

        // Video URL
        const video_url = document.getElementById('video-url').value;

        // Kurum Ayarları
        const institution_title = document.getElementById('institution-title').value;
        const institution_subtitle = document.getElementById('institution-subtitle').value;
        const institution_slogan1 = document.getElementById('institution-slogan1').value;
        const institution_slogan2 = document.getElementById('institution-slogan2').value;
        const institution_logo = document.getElementById('institution-logo').value;

        // Tüm verileri tek bir objede topla (Yeni sistem)
        const newConfig = {
            hadith: JSON.stringify(hadith),
            dorm1: JSON.stringify(dorm1),
            dorm2: JSON.stringify(dorm2),
            announcements: JSON.stringify(announcements),
            exam_config: JSON.stringify(exam_config),
            quote_of_day,
            video_url,
            institution_title,
            institution_subtitle,
            institution_slogan1,
            institution_slogan2,
            institution_logo
        };

        // Kaydet (Tek seferde)
        await fetch('/api/save-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: CURRENT_SLUG,
                password: CURRENT_PASSWORD,
                config: newConfig
            })
        });

        showMessage('✅ Tüm veriler başarıyla kaydedildi!', 'success');

    } catch (error) {
        console.error('Kaydetme hatası:', error);
        showMessage('❌ Kaydetme sırasında hata oluştu!', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Kaydet';
    }
});

// Sayfa yüklendiğinde verileri yükle
window.addEventListener('DOMContentLoaded', loadData);
