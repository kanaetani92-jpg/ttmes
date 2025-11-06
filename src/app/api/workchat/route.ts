import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { buildWorkSkeleton, WORK_SYSTEM_PROMPT } from '@/lib/workSkeleton';
import { normalizeAssessmentData, type AssessmentData } from '@/lib/assessment';
import { getStageGuide } from '@/data/stageGuides';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

const payloadSchema = z.object({
  messages: z.array(messageSchema).min(1),
  assessment: z.any(),
});

const defaultModelId = 'gemini-2.0-flash';

const buildContextPayload = (assessment: AssessmentData) => {
  const { skeleton, bandLabels, scores, stageName } = buildWorkSkeleton(assessment);

  const context = {
    stage: stageName,
    bands: {
      RISCI: bandLabels.RISCI,
      SMA: {
        plan: bandLabels.SMA.planning,
        reframing: bandLabels.SMA.reframing,
        healthy_activity: bandLabels.SMA.healthy_activity,
      },
      PSSM: bandLabels.PSSM.self_efficacy,
      PDSM: bandLabels.PDSM,
      PPSM: bandLabels.PPSM,
    },
    scores,
    skeleton,
  };

  return { context, skeleton, bandLabels, scores, stageName };
};

const toGeminiHistory = (messages: { role: 'user' | 'assistant'; content: string }[]) =>
  messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

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

  const normalizedAssessment = normalizeAssessmentData(parsedBody.assessment);
  const { context, skeleton, bandLabels, scores, stageName } = buildContextPayload(normalizedAssessment);

  const guide = getStageGuide(scores.stage);
  if (guide) {
    return NextResponse.json({
      reply: JSON.stringify(guide, null, 2),
      skeleton,
      bands: bandLabels,
      scores,
      stage: stageName,
      guide,
    });
  }

  const messages = parsedBody.messages;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') {
    return NextResponse.json({ error: 'The last message must be from the user.' }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = process.env.GEMINI_MODEL_ID || process.env.MODEL_NAME || defaultModelId;

  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: WORK_SYSTEM_PROMPT,
  });

  const history = [
    {
      role: 'user' as const,
      parts: [
        {
          text: `以下は本日のコンテキストです。必ず参照してください。\n${JSON.stringify(context)}`,
        },
      ],
    },
    ...toGeminiHistory(messages.slice(0, -1)),
  ];

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    return NextResponse.json({
      reply: text,
      skeleton,
      bands: bandLabels,
      scores,
      stage: stageName,
    });
  } catch (error: any) {
    console.error('Failed to communicate with Gemini', error);
    return NextResponse.json({ error: error?.message ?? 'Gemini request failed' }, { status: 500 });
  }
}
