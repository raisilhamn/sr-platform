import { NextResponse } from 'next/server';
import { resetCard, getStats } from '@/lib/db';
import { getSessionId } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { id } = await req.json();
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }
  const sessionId = await getSessionId();
  await resetCard(sessionId, id);
  const stats = await getStats(sessionId);
  return NextResponse.json({ stats });
}
