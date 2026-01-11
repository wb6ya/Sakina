/**
 * @file utils/quran-content.js
 * @description كود حقن وعرض المصحف داخل صفحة الويب
 */

if (typeof window.sakinaQuranInitialized === 'undefined') {
    window.sakinaQuranInitialized = true;

    const QURAN_API = "https://api.alquran.cloud/v1";
    let quranDataCache = null; // لتخزين قائمة السور لعدم طلبها كل مرة

    // الاستماع لرسالة الفتح من الـ Popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "OPEN_QURAN_MODAL") {
            initQuranModal();
        }
    });

    function initQuranModal() {
        // 1. إذا كان المودال موجوداً مسبقاً، فقط أظهره
        let backdrop = document.getElementById('quran-overlay-backdrop');
        if (backdrop) {
            showModal();
            return;
        }

        // 2. بناء HTML المودال
        const html = `
            <div id="quran-overlay-backdrop"></div>
            <div id="quran-main-modal">
                <div class="quran-modal-header">
                    <select id="quran-surah-picker" class="quran-surah-select">
                        <option>جاري تحميل الفهرس...</option>
                    </select>
                    <div style="font-weight:bold; color:#d4af37; font-size:18px; letter-spacing:1px;">
                        القرآن الكريم
                    </div>
                    <button id="btn-close-quran-modal" class="quran-close-btn">✕</button>
                </div>
                <div id="quran-text-body" class="quran-modal-body">
                    <div class="quran-loading">اختر سورة للقراءة...</div>
                </div>
            </div>
        `;

        // 3. حقن الكود في الصفحة
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div);

        // 4. تحميل الخط العربي (Amiri)
        if (!document.getElementById('quran-font-link')) {
            const link = document.createElement('link');
            link.id = 'quran-font-link';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap';
            document.head.appendChild(link);
        }

        // 5. ربط الأحداث (Events)
        document.getElementById('btn-close-quran-modal').onclick = hideModal;
        document.getElementById('quran-overlay-backdrop').onclick = hideModal;
        
        const select = document.getElementById('quran-surah-picker');
        select.onchange = (e) => loadSurahText(e.target.value);

        // 6. جلب قائمة السور
        fetchSurahsList();

        // 7. إظهار المودال
        showModal();
    }

    function showModal() {
        const backdrop = document.getElementById('quran-overlay-backdrop');
        const modal = document.getElementById('quran-main-modal');
        // تأخير بسيط لتفعيل الأنيميشن
        setTimeout(() => {
            backdrop.classList.add('active');
            modal.classList.add('active');
        }, 10);
        
        // تحميل الفاتحة تلقائياً أول مرة
        const body = document.getElementById('quran-text-body');
        if (body.innerText.includes('اختر سورة')) {
            // ننتظر قليلاً حتى تمتلئ القائمة ثم نختار الفاتحة
            setTimeout(() => {
                const select = document.getElementById('quran-surah-picker');
                if(select.options.length > 1) {
                    select.value = 1;
                    loadSurahText(1);
                }
            }, 1000);
        }
    }

    function hideModal() {
        const backdrop = document.getElementById('quran-overlay-backdrop');
        const modal = document.getElementById('quran-main-modal');
        backdrop.classList.remove('active');
        modal.classList.remove('active');
        // إخفاء الـ display بعد انتهاء الأنيميشن
        setTimeout(() => {
            // لا نحذف العناصر، بل نخفيها فقط لسهولة الفتح لاحقاً
        }, 300);
    }

    async function fetchSurahsList() {
        if (quranDataCache) {
            populateSelect(quranDataCache);
            return;
        }

        try {
            const res = await fetch(`${QURAN_API}/surah`);
            const data = await res.json();
            if (data.code === 200) {
                quranDataCache = data.data;
                populateSelect(quranDataCache);
            }
        } catch (e) {
            console.error("Error fetching surahs:", e);
        }
    }

    function populateSelect(list) {
        const select = document.getElementById('quran-surah-picker');
        select.innerHTML = '';
        list.forEach(surah => {
            const opt = document.createElement('option');
            opt.value = surah.number;
            opt.textContent = `${surah.number}. ${surah.name} (${surah.englishName})`;
            select.appendChild(opt);
        });
    }

    async function loadSurahText(number) {
        const body = document.getElementById('quran-text-body');
        body.innerHTML = '<div class="quran-loading">جاري تحميل الآيات...</div>';

        try {
            const res = await fetch(`${QURAN_API}/surah/${number}/quran-uthmani`);
            const data = await res.json();
            
            if (data.code === 200) {
                renderSurah(data.data);
            }
        } catch (e) {
            body.innerHTML = '<div style="color:red">فشل التحميل. تأكد من الإنترنت.</div>';
        }
    }

    function renderSurah(surah) {
        const body = document.getElementById('quran-text-body');
        
        let html = `<div class="quran-text-container">`;

        // عنوان السورة
        html += `<div style="text-align:center; margin-bottom:15px; color:#666; font-size:16px;">
            ۞ سورة ${surah.name} ۞
        </div>`;

        if (surah.number !== 9) {
            html += `<div class="quran-basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>`;
        }

        surah.ayahs.forEach(ayah => {
            let text = ayah.text;
            if (surah.number !== 1 && surah.number !== 9 && ayah.numberInSurah === 1) {
                text = text.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ", "");
            }
            
            // النص + رقم الآية في دائرة ذهبية
            html += `<span class="quran-ayah-text">${text}</span> 
                    <span class="quran-ayah-end">${ayah.numberInSurah}</span> `;
        });

        html += `</div>`; // إغلاق الكونتينر
        
        // مسافة سفلية
        html += `<div style="height: 60px; display:flex; justify-content:center; align-items:center; color:#444; margin-top:20px;">
            - صدق الله العظيم -
        </div>`;

        body.innerHTML = html;
        body.scrollTop = 0;
    }
}   