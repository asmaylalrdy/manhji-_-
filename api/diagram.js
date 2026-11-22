import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { stage, grade, subject, prompt, explanation } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY غير مضبوط في Vercel." });
    }

    // صياغة وصف تعليمي واضح للرسم التوضيحي بالاعتماد على نموذج gemini-3.6-flash
    const helperModel = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction:
        "أنت مصمم رسوم تعليمية مبسطة لطلاب السودان. اكتب وصفاً دقيقاً وواضحاً لرسم توضيحي تعليمي يخدم الدرس المطلوب دون إطالة."
    });

    const descPrompt = `
المرحلة: ${stage || "غير محددة"} | الصف: ${grade || "غير محدد"} | المادة: ${subject || "عامة"}
السؤال أو الدرس: ${prompt || ""}
ملخص الشرح: ${(explanation || "").slice(0, 600)}

اكتب وصفاً موجزاً باللغة الإنجليزية لرسم توضيحي تعليمي واضح ومبسط يوضح الفكرة العلمية أو الهندسية بأسلوب نظيف ومناسب للطلاب.
    `;

    const descResult = await helperModel.generateContent(descPrompt);
    const visualPrompt = descResult.response.text().trim();

    // محاولة توليد الصورة عبر endpoint التوليد المتاح على Gemini API
    const imageEndpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=" +
      encodeURIComponent(apiKey);

    const imgResponse = await fetch(imageEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [
          {
            prompt: `Clean educational textbook diagram for students: ${visualPrompt}. High contrast, clear shapes, uncluttered white/light background.`
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "4:3"
        }
      })
    });

    if (imgResponse.ok) {
      const imgData = await imgResponse.json();
      const base64Img = imgData?.predictions?.[0]?.bytesBase64Encoded;
      const mimeType = imgData?.predictions?.[0]?.mimeType || "image/png";

      if (base64Img) {
        return res.status(200).json({
          imageUrl: `data:${mimeType};base64,${base64Img}`,
          caption: `رسم توضيحي مبسط — ${subject || "الدرس"}`
        });
      }
    }

    // بديل تعليمي منظم إذا لم يكن توليد الصور مفعّلاً على هذا المفتاح
    const textDiagramModel = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction:
        "اكتب مخططاً توضيحياً نصياً أو جدول مقارنة مبسطاً يوضح الفكرة للطالب خطوة بخطوة بوضوح."
    });

    const fallbackResult = await textDiagramModel.generateContent(
      `صمّم مخططاً توضيحياً مبسطاً لدرس (${prompt}) في مادة (${subject}) للصف (${grade}).`
    );

    return res.status(200).json({
      diagramText: fallbackResult.response.text(),
      caption: `مخطط توضيحي — ${subject || "الدرس"}`
    });
  } catch (error) {
    console.error("Diagram API Error:", error);
    return res.status(500).json({
      error: error.message || "تعذر إنشاء الرسم التوضيحي حالياً."
    });
  }
}
