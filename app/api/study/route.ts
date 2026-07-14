import { NextResponse } from 'next/server';
import { getDueCards, getStats } from '@/lib/db';
import { getSessionId } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const sessionId = await getSessionId();
  const [cards, stats] = await Promise.all([getDueCards(sessionId), getStats(sessionId)]);
  return NextResponse.json({ cards, stats });
}
