import { NextResponse } from 'next/server';
import { mergeSessionState } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { sessionId, cards } = await req.json();
  if (typeof sessionId !== 'string' || !sessionId || !Array.isArray(cards)) {
    return NextResponse.json({ error: 'sessionId and cards required' }, { status: 400 });
  }

  const MAX_CARDS = 1000;
  if (cards.length > MAX_CARDS) {
    return NextResponse.json({ error: 'too many cards' }, { status: 400 });
  }

  for (const c of cards) {
    if (typeof c.id !== 'string' || !c.id) {
      return NextResponse.json({ error: 'invalid card data' }, { status: 400 });
    }
  }

  await mergeSessionState(sessionId, cards);
  return NextResponse.json({ success: true });
}
