/**
 * طلب الموقع الجغرافي الحالي للمستخدم
 * @returns {Promise<{lat: number, lng: number}>}
 */
export const getGeolocation = () => {
    return new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }

        const options = {
            enableHighAccuracy: false, // تغيير مهم: لا نطلب دقة GPS لتجنب التعليق
            timeout: 30000,            // زيادة المهلة لـ 30 ثانية
            maximumAge: Infinity       // قبول موقع مخزن سابقاً لسرعة الاستجابة
        };

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
                console.error("[Location] Error Code:", error.code, "Message:", error.message);
                // توضيح نوع الخطأ للمطور
                let errorMsg = "حدث خطأ غير معروف";
                switch(error.code) {
                    case 1: errorMsg = "تم رفض صلاحية الموقع (Permission Denied)"; break;
                    case 2: errorMsg = "الموقع غير متاح (Position Unavailable)"; break;
                    case 3: errorMsg = "انتهت مهلة البحث (Timeout)"; break;
                }
                reject(new Error(errorMsg));
            },
            options
        );
    });
};