import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stage, grade, subject, prompt, imageBase64, mimeType } = req.body;

    const systemInstruction = `
أنت معلم صبور، محترف، ومتخصص في المناهج التعليمية.
المرحلة: ${stage} | الصف: ${grade} | المادة: ${subject}

تعليمات الشرح:
1. التزم بالمنهج والمستوى الذهني واللغوي المناسب للصف ${grade}.
2. إذا كانت المرحلة ابتدائية: استخدم أسلوباً مبسطاً جداً، وأمثلة توضيحية.
3. إذا كانت المرحلة متوسطة أو ثانوية: قدم شرحاً المنظم مقسماً لخطوات.
4. استخدم التنسيق الواضح (نقاط، خط عريض) لتسهيل القراءة.
    `;

    // استخدام الموديل المستقر المحدث
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
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
    return res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب.' });
  }
}
