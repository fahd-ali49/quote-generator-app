// server.js
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

// 1. مكتبات تعبئة القالب والتحويل
const Docxtemplater = require('docxtemplater');
const libre = require('libreoffice-convert');
// يجب تعيين مسار LibreOffice هنا للتحويل إلى PDF
libre.convert.office = libre.convert.path; 

const app = express();
const port = 3000;

// هذا يسمح لـ Express بقراءة البيانات المرسلة بصيغة JSON
app.use(bodyParser.json());

// مسار ملف القالب
const templatePath = path.resolve(__dirname, 'عرض سعر فهد .docx');
// مسار مجلد الإخراج
const outputFolder = path.resolve(__dirname, 'output');

// التأكد من وجود مجلد الإخراج
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
}

app.post('/generate-quote', async (req, res) => {
    
    // 2. **** التعديل: تنظيف واستخلاص البيانات المطلوبة فقط ****
    // هذا يحل مشكلة "Unexpected properties: type" عن طريق تجاهل أي خصائص إضافية
    const cleanData = {
        entity: req.body.entity || 'اسم العميل الافتراضي',
        totalPrice: req.body.totalPrice || '0.00',
        vat: req.body.vat || '0.00',
        unitPrice: req.body.unitPrice || '0.00',
        boards: req.body.boards || 'غير متوفر',
        color: req.body.color || 'أبيض',
        specs: req.body.specs || 'غير محددة',
        totalText: req.body.totalText || 'صفر ريال سعودي',
        campaign: req.body.campaign || 'بدون حملة',
        warranty: req.body.warranty || 'ضمان سنتين',
        seller: req.body.seller || 'فهد',
        phone: req.body.phone || '05xxxxxxxx'
    };

    let docxContent;
    try {
        // 3. قراءة محتوى القالب
        docxContent = fs.readFileSync(templatePath, 'binary');
    } catch (readError) {
        console.error("Error reading template file:", readError);
        return res.status(500).send({ message: "فشل قراءة ملف القالب. تأكد من وجوده في المسار الصحيح.", error: readError.message });
    }

    const doc = new Docxtemplater(docxContent, { type: 'binary' });

    try {
        // 4. تعبئة القالب بالبيانات النظيفة
        doc.setData(cleanData); // نستخدم cleanData التي قمنا بتنظيفها
        doc.render();

        // 5. حفظ الملف بصيغة DOCX في Buffer
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE',
        });

        const docxFileName = `عرض_سعر_${cleanData.entity}_${Date.now()}.docx`;
        const docxFilePath = path.join(outputFolder, docxFileName);
        
        // 6. التحويل إلى PDF
        const pdfFileName = docxFileName.replace('.docx', '.pdf');
        const pdfFilePath = path.join(outputFolder, pdfFileName);

        libre.convert(buffer, '.pdf', undefined, (err, done) => {
            if (err) {
                console.error(`Conversion error for ${docxFileName}:`, err);
                // رسالة خطأ واضحة في حال فشل التحويل بسبب LibreOffice
                return res.status(500).send({ 
                    message: "فشل في تحويل الملف إلى PDF. تأكد من تثبيت LibreOffice على نظامك.", 
                    error: err.message 
                });
            }

            // 7. إرسال الملف الناتج كاستجابة
            fs.writeFileSync(pdfFilePath, done);
            
            res.download(pdfFilePath, pdfFileName, (downloadErr) => {
                if (downloadErr) {
                    console.error("Error sending PDF file to user:", downloadErr);
                    return res.status(200).send({ 
                        message: `تم إنشاء الملف بنجاح ولكن فشل الإرسال، يمكنك العثور عليه في مجلد output باسم: ${pdfFileName}`
                    });
                }
            });
        });


    } catch (templateError) {
        // 8. التعامل مع أخطاء القالب
        const error = {
            message: templateError.message,
            stack: templateError.stack,
            properties: templateError.properties,
            name: templateError.name
        };
        console.error("Template Error Details:", JSON.stringify(error, null, 2));
        return res.status(500).send({
            message: "فشل التوليد: هناك خطأ في تنسيق الأوسمة (Tags) داخل ملف الـ Word. يرجى التأكد من كتابتها جميعاً بالشكل الصحيح {{tag}}.",
            error: error
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Endpoint: http://localhost:${port}/generate-quote`);
});