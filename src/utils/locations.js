/**
 * @file locations.js
 * @description التعامل مع خدمات الموقع الجغرافي (Geolocation API)
 */

/**
 * طلب الموقع الجغرافي الحالي للمستخدم
 * @returns {Promise<{lat: number, lng: number}>} وعود بإرجاع الإحداثيات
 */
export const getGeolocation = () => {
    return new Promise((resolve, reject) => {
        // 1. التحقق من دعم المتصفح
        if (!navigator.geolocation) {
            reject(new Error("خدمة الموقع غير مدعومة في هذا المتصفح."));
            return;
        }

        // 2. إعدادات ذكية للسرعة وعدم التعليق
        const options = {
            enableHighAccuracy: false, // لا نطلب GPS دقيق لتجنب البطء
            timeout: 30000,            // مهلة 30 ثانية
            maximumAge: Infinity       // نقبل أي موقع مخزن سابقاً (كاش) للسرعة
        };

        // 3. طلب الموقع
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("[Location] Detected:", coords);
                resolve(coords);
            },
            (error) => {
                console.error("[Location] Error:", error.code, error.message);
                
                // تحويل رموز الخطأ إلى رسائل عربية مفهومة
                let errorMsg = "حدث خطأ غير معروف أثناء تحديد الموقع.";
                switch(error.code) {
                    case 1: // PERMISSION_DENIED
                        errorMsg = "تم رفض صلاحية الوصول للموقع. يرجى تفعيلها من إعدادات المتصفح.";
                        break;
                    case 2: // POSITION_UNAVAILABLE
                        errorMsg = "الموقع غير متاح حالياً. تأكد من اتصالك بالشبكة.";
                        break;
                    case 3: // TIMEOUT
                        errorMsg = "انتهت مهلة البحث عن الموقع. يرجى المحاولة مرة أخرى.";
                        break;
                }
                reject(new Error(errorMsg));
            },
            options
        );
    });
};