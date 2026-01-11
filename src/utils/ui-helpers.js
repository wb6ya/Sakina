/**
 * @file utils/ui-helpers.js
 * @description أدوات مساعدة للتحكم في العناصر المرئية (Modals, Toasts, Views)
 */

/**
 * تبديل الشاشات (Loading, Onboarding, Main, Settings)
 * @param {string} viewName - اسم الشاشة المراد عرضها
 * @param {Object} viewsObj - كائن يحتوي على عناصر DOM للشاشات
 */
export function switchView(viewName, viewsObj) {
    // إخفاء جميع الشاشات
    Object.values(viewsObj).forEach(v => { 
        if(v) v.classList.add('hidden'); 
    });
    // إظهار الشاشة المطلوبة
    if (viewsObj[viewName]) {
        viewsObj[viewName].classList.remove('hidden');
    }
}
/* =========================================
       (و) دوال المودال الداخلية (إصلاح الظهور)
       ========================================= */
    
   export function showConfirm(els, title, msg, icon = "ℹ️") {
        return new Promise(resolve => {
            const { overlay, title: t, message: m, icon: i, confirmBtns, alertBtns, btnYes, btnNo } = els;
            
            if(!overlay) {
                console.error("Modal overlay missing in HTML");
                // في حال عدم وجود المودال، نستخدم النافذة العادية كبديل للطوارئ
                return resolve(confirm(msg)); 
            }
            
            // تعبئة المحتوى
            if(t) t.textContent = title;
            if(m) m.innerHTML = msg;
            if(i) i.textContent = icon;
            
            // ضبط الأزرار
            if(confirmBtns) confirmBtns.classList.remove('hidden');
            if(alertBtns) alertBtns.classList.add('hidden');
            
            // 🔥 إجبار الظهور (Force Show)
            overlay.style.display = 'flex';
            // تأخير بسيط جداً لتفعيل الترانزيشن (opacity)
            requestAnimationFrame(() => overlay.classList.add('show'));

            const close = (res) => {
                overlay.classList.remove('show');
                // انتظار انتهاء الانيميشن ثم الإخفاء
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 200);
                
                if(btnYes) btnYes.onclick = null;
                if(btnNo) btnNo.onclick = null;
                resolve(res);
            };

            if(btnYes) btnYes.onclick = () => close(true);
            if(btnNo) btnNo.onclick = () => close(false);
            
            // إغلاق عند النقر في الخلفية
            overlay.onclick = (e) => { 
                if(e.target === overlay) close(false); 
            };
        });
    }

    export function showToast(els, title, msg, icon = "✅") {
        return new Promise(resolve => {
            const { overlay, title: t, message: m, icon: i, confirmBtns, alertBtns, btnOk } = els;
            if(!overlay) return resolve();

            if(t) t.textContent = title;
            if(m) m.innerHTML = msg;
            if(i) i.textContent = icon;

            if(confirmBtns) confirmBtns.classList.add('hidden');
            if(alertBtns) alertBtns.classList.remove('hidden');

            // 🔥 إجبار الظهور
            overlay.style.display = 'flex';
            requestAnimationFrame(() => overlay.classList.add('show'));

            const close = () => {
                overlay.classList.remove('show');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 200);
                if(btnOk) btnOk.onclick = null;
                resolve();
            };

            if(btnOk) btnOk.onclick = close;
            overlay.onclick = (e) => { if(e.target === overlay) close(); };

            // إغلاق تلقائي إذا لم يكن خطأ
            if(title !== "خطأ") {
                setTimeout(() => {
                    // نتأكد أنه ما زال توست (ولم يتحول لتأكيد)
                    if(overlay.classList.contains('show') && confirmBtns.classList.contains('hidden')) {
                        close();
                    }
                }, 2500);
            }
        });
    }

// دالة داخلية مساعدة لإغلاق المودال
function closeModal(modalObj) {
    modalObj.overlay.classList.remove('show');
    setTimeout(() => modalObj.overlay.classList.add('hidden'), 200);
}