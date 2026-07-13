import { NextRequest, NextResponse } from 'next/server';
import { getMatureCards } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '10');
  const data = await getMatureCards(Math.max(page, 1), Math.min(Math.max(limit, 1), 50));
  return NextResponse.json(data);
}
