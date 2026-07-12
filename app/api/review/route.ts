import { NextResponse } from 'next/server';
import { reviewCard, getStats } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { id, rating } = await req.json();
  if (typeof id !== 'string' || !id || typeof rating !== 'number' || rating < 1 || rating > 4) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }
  await reviewCard(id, rating);
  const stats = await getStats();
  return NextResponse.json({ stats });
}
