import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // السماح بالطلبات من الواجهة فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stage, grade, subject, prompt, imageBase64, mimeType } = req.body;

    // صياغة الـ System Prompt المتخصص للمنهج
    const systemInstruction = `
أنت معلم صبور، محترف، ومتخصص في المناهج التعليمية.
معلومات الطالب:
- المرحلة الدراسية: ${stage}
- الصف الدراسي: ${grade}
- المادة: ${subject}

تعليمات الشرح:
1. التزم بالمنهج والمستوى الذهني واللغوي المناسب للصف ${grade}.
2. إذا كانت المرحلة ابتدائية: استخدم أسلوباً مبسطاً جداً، أمثلة توضيحية قصيرة، ولغة مشجعة.
3. إذا كانت المرحلة متوسطة أو ثانوية: قدم شرحاً منظم مقسم لخطوات، وركز على المفاهيم الأساسية والقوانين.
4. استخدم التنسيق الواضح (نقاط، خط عريض) لتسهيل القراءة.
5. أجبت مباشرة على سؤال الطالب بأسلوب تربوي ممتع.
    `;

    // استخدام موديل gemini-1.5-flash للسرعة والدقة
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
    });

    let contents = [];

    // في حال وجود صورة مرفقة من الدرس/المسألة
    if (imageBase64 && mimeType) {
      contents.push({
        inlineData: {
          data: imageBase64.split(',')[1] || imageBase64,
          mimeType: mimeType
        }
      });
    }

    contents.push(prompt);

    const result = await model.generateContent(contents);
    const responseText = result.response.text();

    return res.status(200).json({ result: responseText });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب.' });
  }
}
