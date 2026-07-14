import { NextResponse } from 'next/server';
import { getStreakData, getCardDistribution } from '@/lib/db';
import { getSessionId } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const sessionId = await getSessionId();
  const [streak, distribution] = await Promise.all([
    getStreakData(sessionId),
    getCardDistribution(sessionId),
  ]);
  return NextResponse.json({ ...streak, distribution });
}
