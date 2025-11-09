import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { DEFAULT_STAGE, getStageMetadata } from '@/lib/workChat';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

const payloadSchema = z.object({
  stage: z.enum(['PC', 'C', 'PR', 'A', 'M']).optional(),
  messages: z.array(messageSchema).min(1),
});

const defaultModelId = 'gemini-2.0-flash';

const toGeminiHistory = (messages: { role: 'user' | 'assistant'; content: string }[]) => {
  const trimmedHistory = [...messages];
  while (trimmedHistory.length > 0 && trimmedHistory[0].role !== 'user') {
    trimmedHistory.shift();
  }

  return trimmedHistory.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
  }

  let parsedBody: z.infer<typeof payloadSchema>;
  try {
    const json = await request.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.flatten() }, { status: 400 });
    }
    parsedBody = parsed.data;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const messages = parsedBody.messages;
  const stage = parsedBody.stage ?? DEFAULT_STAGE;
  const stageMetadata = getStageMetadata(stage);
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') {
    return NextResponse.json({ error: 'The last message must be from the user.' }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = process.env.GEMINI_MODEL_ID || process.env.MODEL_NAME || defaultModelId;

  const model = genAI.getGenerativeModel({ model: modelId });

  const history = toGeminiHistory(messages.slice(0, -1));

  const systemInstructionText = `
あなたは、多理論統合モデル（TTM）に特化した専門のストレスマネジメントコーチです。あなたの役割とルールは以下の通りです。

### 絶対的なルール
1.  **役割の厳守:** あなたの唯一の役割は、ユーザーの現在のTTMステージに合致した対話を行うことです。応答は、ユーザーが選択したテーマ（例：「自分のストレス反応のパターンを知る」）に厳密に基づいてください。
2.  **禁止事項:**
    -   一般的な健康アドバイス（睡眠、食事、運動、ダイエットなど）は、ユーザーから明確に求められない限り、**絶対にしないでください。**
    -   アスタリスク（*）、シャープ（#）、ハイフン（-）などの記号を使った箇条書きや、その他のマークダウン形式のテキストは**一切使用しないでください。**
3.  **対話スタイル:**
    -   全ての応答は、自然な会話形式の平易な文章にしてください。
    -   常に共感的で、ユーザーを励ます姿勢を保ってください。
    -   専門用語を避け、ユーザー自身の言葉で考えや感情を引き出すような、具体的な質問を投げかけてください。
4.  **具体例の提示:** 応答には必ず「例えば」という語を用いて、ユーザーが選びやすい少なくとも二つの具体的な行動案または問いかけを提示してください。それぞれの案は自然な文章の中で「、」や改行で区切り、ユーザーがすぐに選べる短いフレーズとして表現し、最後にその案についてどう感じるかを尋ねてください。

### ユーザー情報
-   **現在のTTMステージ:** ${stageMetadata.stageName}
-   **このステージの解説:** ${stageMetadata.systemDescription}

### ★コーチング戦略★
-   **今回の対話における戦略目標:** ${stageMetadata.coachingStrategy}

この戦略目標を念頭に置き、ルールに従ってユーザーのメッセージに応答してください。`; 

  try {
    const chat = model.startChat({
      history,
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: systemInstructionText,
          },
        ],
      },
      generationConfig: { temperature: 0.8, maxOutputTokens: 1000 },
    });
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    return NextResponse.json({
      reply: text,
    });
  } catch (error: any) {
    console.error('Failed to communicate with Gemini', error);
    return NextResponse.json({ error: error?.message ?? 'Gemini request failed' }, { status: 500 });
  }
}
