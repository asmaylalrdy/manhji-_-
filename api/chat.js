import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stage, grade, subject, prompt, imageBase64, mimeType } = req.body;
    const isEnglishSubject = (subject || '').includes('الإنجليزية') || (subject || '').toLowerCase().includes('english');

    const languageRule = isEnglishSubject
      ? `
تعليمات خاصة بمادة اللغة الإنجليزية لطلاب السودان:
- اكتب الشرح والقاعدة والترجمة والمعنى باللغة العربية الواضحة والمبسطة.
- اكتب الكلمات والجمل الإنجليزية المطلوبة بحروف إنجليزية واضحة، وضع بجانبها شرحها ومعناها باللغة العربية.
`
      : `
تعليمات إلزامية للغة الشرح:
- يجب أن يكون كامل الشرح والعناوين والأمثلة باللغة العربية الواضحة والمبسطة، ولا تجعل الشرح بلغة أجنبية.
- إذا ورد مصطلح علمي أو اسم في السؤال، اشرحه بالعربية أولاً.
`;

    const systemInstruction = `
أنت معلم صبور، محترف، ومتخصص في مساعدة طلاب السودان بمختلف المراحل الدراسية.
المرحلة: ${stage || 'غير محددة'} | الصف: ${grade || 'غير محدد'} | المادة: ${subject || 'عامة'}

${languageRule}

تعليمات المنهج والأسلوب:
1. التزم بالمستوى الذهني واللغوي المناسب للصف ${grade || 'الحالي'}.
2. إذا كانت المرحلة ابتدائية: استخدم أسلوباً مبسطاً جداً، وأمثلة توضيحية محببة.
3. إذا كانت المرحلة متوسطة أو ثانوية: قدم شرحاً منظماً ومقسماً إلى خطوات منطقية.
4. استخدم التنسيق الواضح (نقاط، خط عريض) لتسهيل القراءة والتعلم.
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: systemInstruction,
    });

    let parts = [];

    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          data: imageBase64.split(',')[1] || imageBase64,
          mimeType: mimeType
        }
      });
    }

    parts.push({ text: prompt });

    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const responseText = result.response.text();

    return res.status(200).json({ result: responseText });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: error.message || 'حدث خطأ أثناء معالجة الطلب.'
    });
  }
}
