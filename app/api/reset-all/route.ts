import { NextResponse } from 'next/server';
import { resetAllCards, getStats } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST() {
  await resetAllCards();
  const stats = await getStats();
  return NextResponse.json({ stats });
}
