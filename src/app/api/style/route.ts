import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

const schema = z.object({
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    body: z.string()
  })),
  tone: z.enum(['plain','mi','polite']).default('mi')
});

async function verify(request: NextRequest) {
  const authz = request.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return null;
  try { return await adminAuth.verifyIdToken(token); } catch { return null; }
}

export async function POST(request: NextRequest) {
  const user = await verify(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad Request', details: parsed.error.flatten() }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini API key missing' }, { status: 500 });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const system = `
あなたはヘルスリテラシー配慮の文章校正者です。
入力は「監修済みの固定メッセージ」です。意味を変えずに、指定トーンに言い換えてください。
- 新しい助言や医療情報を追加しない
- 不確実な推測や診断をしない
- 出力は JSON のみ: [{"id","title","body"}]
- トーン: plain=平易, mi=MI風の共感・問いかけ, polite=ですます丁寧
`;
  const tone = parsed.data.tone;

  const input = JSON.stringify(parsed.data.items);
  const prompt = `${system}\nトーン:${tone}\n入力:${input}`;

  const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  const text = resp.response.text();

  // Try to parse JSON
  try {
    const json = JSON.parse(text);
    return NextResponse.json({ items: json });
  } catch {
    // Fallback: return original items
    return NextResponse.json({ items: parsed.data.items, note: 'LLM parse failed, returned original' });
  }
}
