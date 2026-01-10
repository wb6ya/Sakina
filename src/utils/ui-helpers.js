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

/**
 * إظهار رسالة تنبيه مؤقتة (Toast)
 */
export function showToast(modalObj, title, message, icon = 'ℹ️') {
    if (!modalObj.overlay) return Promise.resolve();
    
    return new Promise(resolve => {
        // تعبئة البيانات
        modalObj.title.textContent = title;
        modalObj.message.textContent = message;
        modalObj.icon.textContent = icon;
        
        // إعداد الأزرار (إظهار زر OK فقط)
        modalObj.confirmBtns.classList.add('hidden');
        modalObj.alertBtns.classList.remove('hidden');
        
        // العرض
        modalObj.overlay.classList.remove('hidden');
        requestAnimationFrame(() => modalObj.overlay.classList.add('show'));
        
        // عند الضغط موافق
        modalObj.btnOk.onclick = () => {
            closeModal(modalObj);
            resolve();
        };
    });
}

/**
 * إظهار رسالة تأكيد (نعم/لا)
 */
export function showConfirm(modalObj, title, message, icon = '🤔') {
    if (!modalObj.overlay) return Promise.resolve(false);
    
    return new Promise(resolve => {
        modalObj.title.textContent = title;
        modalObj.message.innerHTML = message;
        modalObj.icon.textContent = icon;
        
        // إعداد الأزرار (إظهار نعم/لا)
        modalObj.alertBtns.classList.add('hidden');
        modalObj.confirmBtns.classList.remove('hidden');
        
        // العرض
        modalObj.overlay.classList.remove('hidden');
        requestAnimationFrame(() => modalObj.overlay.classList.add('show'));
        
        const close = (result) => {
            closeModal(modalObj);
            resolve(result);
        };
        
        modalObj.btnYes.onclick = () => close(true);
        modalObj.btnNo.onclick = () => close(false);
    });
}

// دالة داخلية مساعدة لإغلاق المودال
function closeModal(modalObj) {
    modalObj.overlay.classList.remove('show');
    setTimeout(() => modalObj.overlay.classList.add('hidden'), 200);
}