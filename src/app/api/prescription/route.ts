import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';
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

type VerifiedUser = DecodedIdToken | { uid: string };

async function verify(request: NextRequest): Promise<VerifiedUser | null> {
  const authz = request.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {}

  const apiKey = process.env.FIREBASE_CLIENT_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return { uid: user.localId };
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
