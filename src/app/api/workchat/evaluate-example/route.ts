import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const requestSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

const userFriendlySchema = z.object({
  userFriendly: z.object({
    value: z.boolean(),
    reason: z.string().min(1).max(2000),
  }),
});

const alignmentSchema = z.object({
  ttmAligned: z.object({
    value: z.boolean(),
    reason: z.string().min(1).max(2000),
  }),
  stressManagementRelated: z.object({
    value: z.boolean(),
    reason: z.string().min(1).max(2000),
  }),
});

const defaultModelId = 'gemini-2.0-flash';

type Model = ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

const sanitizeJson = (value: string) => {
  const trimmed = value.replace(/```json|```/g, '').trim();
  if (!trimmed) {
    throw new Error('Gemini returned an empty evaluation response.');
  }
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw error;
  }
};

const callGeminiForJson = async <T>(
  model: Model,
  prompt: string,
  schema: z.ZodSchema<T>,
  context: string,
): Promise<T> => {
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const text = result.response.text();
  if (!text) {
    throw new Error(`Gemini returned an empty response for ${context}.`);
  }

  let parsed: unknown;
  try {
    parsed = sanitizeJson(text);
  } catch (error) {
    throw new Error(`Failed to parse Gemini response for ${context}.`);
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    throw new Error(`Gemini response for ${context} did not match the expected format.`);
  }

  return validation.data;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.flatten() }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = process.env.GEMINI_MODEL_ID || process.env.MODEL_NAME || defaultModelId;
  const model = genAI.getGenerativeModel({ model: modelId });

  const userFriendlyPrompt = `あなたはメンタルヘルス支援サービスの品質管理担当者です。以下のボタンラベルの文章が、専門的な知識がないユーザーにも分かりやすく親しみやすい表現になっているかを評価してください。結果は日本語で簡潔に説明し、以下のJSON形式のみで出力してください。\n\n出力フォーマット:\n{\n  "userFriendly": {\n    "value": true または false,\n    "reason": "評価の理由"\n  }\n}\n\n評価対象:\n"""${body.prompt}"""`;

  const alignmentPrompt = `あなたは多理論統合モデル(TTM)とストレスマネジメントの専門家です。以下のボタンラベルの文章がTTMの観点から適切か、そしてストレスマネジメントに明確に関連しているかを評価してください。それぞれの評価は「true」または「false」で返し、理由を日本語で簡潔に説明してください。出力は次のJSON形式のみで返してください。\n\n出力フォーマット:\n{\n  "ttmAligned": {\n    "value": true または false,\n    "reason": "TTMとの整合性に関する理由"\n  },\n  "stressManagementRelated": {\n    "value": true または false,\n    "reason": "ストレスマネジメントとの関連性に関する理由"\n  }\n}\n\n評価対象:\n"""${body.prompt}"""`;

  try {
    const userFriendly = await callGeminiForJson(model, userFriendlyPrompt, userFriendlySchema, 'user-friendliness evaluation');
    const alignment = await callGeminiForJson(model, alignmentPrompt, alignmentSchema, 'TTM/stress-management evaluation');

    return NextResponse.json({
      userFriendly: userFriendly.userFriendly,
      ttmAligned: alignment.ttmAligned,
      stressManagementRelated: alignment.stressManagementRelated,
    });
  } catch (error: any) {
    console.error('Failed to evaluate example prompt with Gemini', error);
    return NextResponse.json({ error: error?.message ?? 'Gemini evaluation failed' }, { status: 500 });
  }
}
