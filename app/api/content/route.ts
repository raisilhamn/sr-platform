import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { loadTopics, syncFromContent } from '@/lib/db';

export const runtime = 'nodejs';

const CONTENT_DIR = path.join(process.cwd(), 'content');

function localOnlyGuard(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Content editing is disabled in production' }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = localOnlyGuard();
  if (blocked) return blocked;

  const topic = req.nextUrl.searchParams.get('topic');
  const topics = loadTopics();
  if (!topic || !(topic in topics)) {
    return NextResponse.json({ error: 'Unknown topic' }, { status: 404 });
  }

  return NextResponse.json({ content: topics[topic] });
}

export async function POST(req: NextRequest) {
  const blocked = localOnlyGuard();
  if (blocked) return blocked;

  const body = await req.json();
  const { topic, content } = body as { topic?: string; content?: string };
  const topics = loadTopics();

  if (!topic || !(topic in topics)) {
    return NextResponse.json({ error: 'Unknown topic' }, { status: 404 });
  }
  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }

  fs.writeFileSync(path.join(CONTENT_DIR, `${topic}.md`), content, 'utf-8');
  await syncFromContent();

  return NextResponse.json({ ok: true });
}
