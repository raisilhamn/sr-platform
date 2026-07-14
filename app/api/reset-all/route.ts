import { NextResponse } from 'next/server';
import { resetAllCards, getStats } from '@/lib/db';
import { getSessionId } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  const sessionId = await getSessionId();
  await resetAllCards(sessionId);
  const stats = await getStats(sessionId);
  return NextResponse.json({ stats });
}
