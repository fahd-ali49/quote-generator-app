// server.js - إضافة متطلبات JWT
// ... (تأكد من وجود bcrypt و jsonwebtoken في البداية)
const jwt = require('jsonwebtoken');

// مفتاح سري لتوقيع رموز JWT - يجب أن يكون قوياً ويُخزن في متغير بيئة
const JWT_SECRET = 'YOUR_SUPER_SECURE_SECRET_KEY'; 

// ----------------------------------------------------------------
// 1. الدالة الوسيطة للأمان (JWT Authentication Middleware)
// ----------------------------------------------------------------
const authenticateToken = (req, res, next) => {
    // قراءة الرمز من الترويسة (Header) Authorization: Bearer TOKEN
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        // الرمز غير موجود
        return res.status(401).json({ success: false, message: 'مطلوب تسجيل الدخول (رمز مصادقة مفقود).' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // الرمز غير صالح أو انتهت صلاحيته
            return res.status(403).json({ success: false, message: 'رمز المصادقة غير صالح. يرجى تسجيل الدخول مجدداً.' });
        }
        // الرمز صالح، إضافة بيانات المستخدم إلى الطلب
        req.user = user; 
        next(); // الانتقال إلى الدالة التالية (مثل generate-quote)
    });
};

// ...

// ----------------------------------------------------------------
// 2. تحديث مسار تسجيل الدخول (/api/login)
// ----------------------------------------------------------------
app.post('/api/login', async (req, res) => {
    // ... منطق مقارنة كلمة المرور (bcrypt.compare) ...

    // في حالة النجاح:
    // ... إنشاء رمز JWT ...
    
    // إرسال الرمز وبيانات الموظف للواجهة الأمامية
    res.json({ 
        success: true, 
        message: 'تم تسجيل الدخول بنجاح!', 
        token: token,
        // هذه البيانات ستستخدم لملء حقول البائع تلقائياً
        user: { fullName: mockUser.full_name, phone: mockUser.phone_number } 
    });
});

// ----------------------------------------------------------------
// 3. حماية مسار توليد العرض (/api/generate-quote)
// ----------------------------------------------------------------
// تطبيق الدالة الوسيطة authenticateToken قبل دالة توليد العرض
app.post('/api/generate-quote', authenticateToken, async (req, res) => {
    // الآن، يمكنك الوصول لبيانات الموظف المُسجل دخوله عبر req.user
    
    // إذا كنت تريد استخدام بيانات الموظف المُسجل دخوله تلقائياً:
    // quoteData.seller = req.user.full_name;
    // quoteData.phone = req.user.phone_number;
    
    // ... بقية منطق توليد PDF الذي جهزناه سابقاً ...
});

// ... (بقية الملف)