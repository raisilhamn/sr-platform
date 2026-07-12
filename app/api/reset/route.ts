import { NextResponse } from 'next/server';
import { resetCard, getStats } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { id } = await req.json();
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  }
  await resetCard(id);
  const stats = await getStats();
  return NextResponse.json({ stats });
}
