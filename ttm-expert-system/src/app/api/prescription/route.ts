import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { selectMessages } from '@/lib/engine';

const payloadSchema = z.object({
  scores: z.object({
    stage: z.enum(['PC','C','PR','A','M']),
    pssm: z.object({ self_efficacy: z.number().int() }),
    pdsm: z.object({ pros: z.number().int(), cons: z.number().int() }),
    ppsm: z.object({ experiential: z.number().int(), behavioral: z.number().int() }),
    risci: z.object({ stress: z.number().int(), coping: z.number().int() }),
    sma: z.object({ planning: z.number().int(), reframing: z.number().int(), healthy_activity: z.number().int() }),
  }),
  useGemini: z.boolean().optional()
});

async function verify(request: NextRequest) {
  const authz = request.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await verify(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad Request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { scores, useGemini } = parsed.data;
  const result = selectMessages(scores, { useGemini });

  // Persist
  const now = new Date();
  const doc = {
    uid: user.uid,
    createdAt: now.toISOString(),
    scores,
    bands: result.bands,
    messages: result.items
  };
  const ref = await adminDb.collection('users').doc(user.uid)
    .collection('prescriptions').add(doc);

  return NextResponse.json({ id: ref.id, ...doc });
}
