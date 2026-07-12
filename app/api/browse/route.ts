import { NextResponse } from 'next/server';
import { getBrowseTopics } from '@/lib/db';
import { parseSections } from '@/lib/parse';

export const runtime = 'nodejs';

const TOPIC_ORDER = ['1945', 'belanegara', 'pancasila', 'ringkasan', 'sejarah', 'tokoh'];

export async function GET() {
  const raw = await getBrowseTopics();
  const topics = TOPIC_ORDER.map((topic) => {
    const md = raw[topic];
    const h1Line = md.split('\n').find((l) => l.startsWith('# '));
    const label = h1Line ? h1Line.slice(2).trim() : topic;
    return { topic, label, sections: parseSections(md) };
  });
  return NextResponse.json({ topics });
}
