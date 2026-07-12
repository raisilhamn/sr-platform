import { NextResponse } from 'next/server';
import { getDueCards, getStats } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const [cards, stats] = await Promise.all([getDueCards(), getStats()]);
  return NextResponse.json({ cards, stats });
}
