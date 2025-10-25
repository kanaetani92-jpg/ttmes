import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { adminAuth } from '@/lib/firebaseAdmin';

function verifySignature(bodyRaw: string, signature: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
  if (!secret || !signature) return false;
  const hmac = createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(bodyRaw).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const sig = request.headers.get('x-hub-signature-256');
  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Pull catalog from RAW URL
  const url = process.env.CATALOG_GITHUB_RAW_URL;
  if (!url) return NextResponse.json({ error: 'CATALOG_GITHUB_RAW_URL not set' }, { status: 500 });

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    const json = await res.json();

    // Write to local file on serverless FS is ephemeral; return content instead.
    // In real use, persist to Firestore or Storage. Here we just echo to confirm.
    return NextResponse.json({ ok: true, preview: json });
  } catch (e:any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
