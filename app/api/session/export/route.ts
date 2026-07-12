import { NextResponse } from 'next/server';
import { exportSession } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { sessionId } = await req.json();
  if (typeof sessionId !== 'string' || !sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  const cards = await exportSession(sessionId);
  return NextResponse.json({ sessionId, cards });
}
