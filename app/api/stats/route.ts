import { NextResponse } from 'next/server';
import { getStreakData, getCardDistribution } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const [streak, distribution] = await Promise.all([
    getStreakData(),
    getCardDistribution(),
  ]);
  return NextResponse.json({ ...streak, distribution });
}
