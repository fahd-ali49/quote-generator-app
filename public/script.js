// public/script.js

// ثابتات للحسابات
const VAT_RATE = 0.15; // 15% ضريبة القيمة المضافة

// عناصر الواجهة
const loginForm = document.getElementById('login-form');
const quoteForm = document.getElementById('quote-form');
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginMessage = document.getElementById('login-message');
const logoutBtn = document.getElementById('logout-btn');

const unitPriceInput = document.getElementById('unitPrice');
const vatInput = document.getElementById('vat');
const totalPriceInput = document.getElementById('totalPrice');
const totalTextInput = document.getElementById('totalText');

// حقول الموظف
const sellerInput = document.getElementById('seller');
const phoneInput = document.getElementById('phone');


// ----------------------------------------------------------------
// 1. وظائف إدارة حالة العرض (View Management)
// ----------------------------------------------------------------

function showView(viewId) {
    loginView.style.display = 'none';
    appView.style.display = 'none';
    document.getElementById(viewId).style.display = 'block';
}

function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    if (token) {
        showView('app-view');
        // ملء حقول الموظف
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) {
             sellerInput.value = userData.fullName || '';
             phoneInput.value = userData.phone || '';
        }
    } else {
        showView('login-view');
    }
}

// ----------------------------------------------------------------
// 2. منطق تسجيل الدخول (Login Logic)
// ----------------------------------------------------------------

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMessage.textContent = 'جاري تسجيل الدخول...';

    const formData = new FormData(loginForm);
    const loginData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData),
        });

        const result = await response.json();
        
        if (result.success) {
            // تخزين الرمز وبيانات الموظف
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            loginMessage.textContent = 'تم تسجيل الدخول بنجاح. يتم التحويل...';
            
            // التحويل إلى شاشة التطبيق
            checkAuthentication();
        } else {
            loginMessage.textContent = result.message || 'فشل تسجيل الدخول.';
        }
    } catch (error) {
        console.error('Login Error:', error);
        loginMessage.textContent = 'حدث خطأ في الاتصال بالخادم.';
    }
});

// ----------------------------------------------------------------
// 3. منطق تسجيل الخروج (Logout Logic)
// ----------------------------------------------------------------

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // مسح حقول الموظف
    sellerInput.value = ''; 
    phoneInput.value = ''; 
    checkAuthentication();
});

// ----------------------------------------------------------------
// 4. منطق الحسابات الآلية
// ----------------------------------------------------------------

function calculateTotals() {
    // التأكد من أن الإدخال رقمي
    const unitPrice = parseFloat(unitPriceInput.value) || 0;
    
    // حساب الضريبة
    const vatAmount = unitPrice * VAT_RATE;
    
    // حساب الإجمالي الكلي
    const totalPrice = unitPrice + vatAmount;

    // تحديث الحقول للقراءة فقط
    vatInput.value = vatAmount.toFixed(2);
    totalPriceInput.value = totalPrice.toFixed(2);
    
    // يتم توليد النص كتابة على الخادم، هنا فقط نعرض قيمة للـ Placeholder
    totalTextInput.value = `سيتم توليد المبلغ كتابة: ${totalPrice.toFixed(2)}`;
}

// تشغيل الحسابات عند تغيير حقل السعر
unitPriceInput.addEventListener('input', calculateTotals);


// ----------------------------------------------------------------
// 5. منطق توليد العرض (Generation Logic)
// ----------------------------------------------------------------
quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('يرجى تسجيل الدخول أولاً.');
        return checkAuthentication(); // إعادة المستخدم لصفحة الدخول
    }
    
    const formData = new FormData(quoteForm);
    const quoteData = Object.fromEntries(formData.entries());

    try {
        // إرسال الرمز في ترويسة الطلب (Header)
        const response = await fetch('/api/generate-quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // إضافة رمز JWT
            },
            body: JSON.stringify(quoteData),
        });

        if (response.status === 401 || response.status === 403) {
             alert('انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مجدداً.');
             return logoutBtn.click(); // تسجيل خروج وإعادة توجيه
        }
        
        // التعامل مع ملف PDF العائد
        const blob = await response.blob();
        
        if (response.ok) {
            // إنشاء رابط تنزيل وإطلاقه
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `عرض_سعر_${quoteData.entity}_${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('تم توليد عرض السعر بنجاح وبدء التنزيل! 🎉');
        } else {
            // محاولة قراءة رسالة الخطأ من الخادم
            const errorText = await blob.text();
            let errorMessage = 'خطأ غير معروف';
            try {
                errorMessage = JSON.parse(errorText).message;
            } catch (e) {
                errorMessage = 'حدث خطأ في الخادم (تحقق من LibreOffice)';
            }
            alert(`فشل التوليد: ${errorMessage}`);
        }
        
    } catch (error) {
        console.error('Generation Error:', error);
        alert('حدث خطأ أثناء التواصل مع الخادم.');
    }
});


// تشغيل فحص المصادقة عند تحميل الصفحة
checkAuthentication();