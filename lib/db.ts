import { createClient, type Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { parseCards } from './parse';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const TOPICS = ['1945', 'belanegara', 'pancasila', 'ringkasan', 'sejarah', 'tokoh'];

let client: Client | null = null;
let readyPromise: Promise<void> | null = null;

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

function readTopicMarkdown(): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const topic of TOPICS) {
    raw[topic] = fs.readFileSync(path.join(CONTENT_DIR, `${topic}.md`), 'utf-8');
  }
  return raw;
}

async function ensureReady(): Promise<Client> {
  const db = getClient();
  if (!readyPromise) {
    readyPromise = (async () => {
      await db.execute(`CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        topic TEXT, title TEXT, content TEXT,
        ef REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0,
        next_review TEXT DEFAULT '1970-01-01',
        last_review TEXT DEFAULT '',
        session_id TEXT
      )`);
      await db.execute(`CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at TEXT,
        updated_at TEXT
      )`);
      await db.execute(`CREATE TABLE IF NOT EXISTS review_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id TEXT,
        rating INTEGER,
        reviewed_at TEXT DEFAULT (datetime('now'))
      )`);
      await syncCards(db);
    })();
  }
  await readyPromise;
  return db;
}

async function syncCards(db: Client) {
  const raw = readTopicMarkdown();
  const all = Object.entries(raw).flatMap(([topic, md]) => parseCards(md, topic));

  const existingRows = await db.execute('SELECT id FROM cards');
  const existing = new Set(existingRows.rows.map((r) => r.id as string));

  const toInsert = all.filter((c) => !existing.has(c.id));
  for (const c of toInsert) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO cards (id, topic, title, content) VALUES (?, ?, ?, ?)',
      args: [c.id, c.topic, c.title, c.content],
    });
  }
}

export function loadTopics(): Record<string, string> {
  return readTopicMarkdown();
}

export async function getDueCards() {
  const db = await ensureReady();
  const today = new Date().toISOString().slice(0, 10);
  const res = await db.execute({
    sql: `SELECT id, topic, title, content, ef, interval, reps
      FROM cards WHERE next_review <= ? ORDER BY next_review ASC LIMIT 20`,
    args: [today],
  });
  return res.rows.map((r) => ({
    id: r.id as string,
    topic: r.topic as string,
    title: r.title as string,
    content: r.content as string,
    ef: r.ef as number,
    interval: r.interval as number,
    reps: r.reps as number,
  }));
}

export async function getStats() {
  const db = await ensureReady();
  const today = new Date().toISOString().slice(0, 10);
  const [due, newC, rev, total] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as c FROM cards WHERE next_review <= ?', args: [today] }),
    db.execute('SELECT COUNT(*) as c FROM cards WHERE reps = 0'),
    db.execute({ sql: 'SELECT COUNT(*) as c FROM cards WHERE last_review = ?', args: [today] }),
    db.execute('SELECT COUNT(*) as c FROM cards'),
  ]);
  return {
    due: due.rows[0].c as number,
    newC: newC.rows[0].c as number,
    reviewed: rev.rows[0].c as number,
    total: total.rows[0].c as number,
  };
}

export async function reviewCard(cardId: string, rating: number) {
  const db = await ensureReady();
  const { sm2 } = await import('./sm2');
  const res = await db.execute({
    sql: 'SELECT ef, interval, reps FROM cards WHERE id = ?',
    args: [cardId],
  });
  if (!res.rows.length) return;
  const row = res.rows[0];
  const r = sm2(row.ef as number, row.interval as number, row.reps as number, rating);
  const today = new Date().toISOString().slice(0, 10);
  const next = new Date();
  next.setDate(next.getDate() + r.interval);
  const nextStr = next.toISOString().slice(0, 10);
  await db.execute({
    sql: 'UPDATE cards SET ef=?, interval=?, reps=?, next_review=?, last_review=? WHERE id=?',
    args: [r.ef, r.interval, r.reps, nextStr, today, cardId],
  });
  await db.execute({
    sql: 'INSERT INTO review_log (card_id, rating, reviewed_at) VALUES (?, ?, ?)',
    args: [cardId, rating, new Date().toISOString()],
  });
}

export async function resetCard(cardId: string) {
  const db = await ensureReady();
  await db.execute({
    sql: "UPDATE cards SET ef=2.5, interval=0, reps=0, next_review='1970-01-01', last_review='' WHERE id=?",
    args: [cardId],
  });
}

export async function resetAllCards() {
  const db = await ensureReady();
  await db.execute(
    "UPDATE cards SET ef=2.5, interval=0, reps=0, next_review='1970-01-01', last_review=''"
  );
}

export async function getBrowseTopics() {
  await ensureReady();
  return loadTopics();
}

export async function exportSession(sessionId: string) {
  const db = await ensureReady();
  const now = new Date().toISOString();

  await db.execute({
    sql: 'INSERT OR IGNORE INTO sessions (id, created_at, updated_at) VALUES (?, ?, ?)',
    args: [sessionId, now, now],
  });

  const res = await db.execute('SELECT * FROM cards');
  const cards = res.rows.map((r) => ({
    id: r.id as string,
    topic: r.topic as string,
    title: r.title as string,
    content: r.content as string,
    ef: r.ef as number,
    interval: r.interval as number,
    reps: r.reps as number,
    next_review: r.next_review as string,
    last_review: r.last_review as string,
  }));

  await db.execute({
    sql: 'UPDATE sessions SET updated_at = ? WHERE id = ?',
    args: [now, sessionId],
  });

  return cards;
}

export async function importSession(sessionId: string) {
  const db = await ensureReady();
  const res = await db.execute({
    sql: 'SELECT * FROM cards WHERE session_id = ?',
    args: [sessionId],
  });

  return res.rows.map((r) => ({
    id: r.id as string,
    ef: r.ef as number,
    interval: r.interval as number,
    reps: r.reps as number,
    next_review: r.next_review as string,
    last_review: r.last_review as string,
  }));
}

export async function mergeSessionState(sessionId: string, cards: Array<{ id: string; ef: number; interval: number; reps: number; next_review: string; last_review: string }>) {
  const db = await ensureReady();
  const now = new Date().toISOString();

  for (const c of cards) {
    await db.execute({
      sql: 'UPDATE cards SET ef=?, interval=?, reps=?, next_review=?, last_review=?, session_id=? WHERE id=?',
      args: [c.ef, c.interval, c.reps, c.next_review, c.last_review, sessionId, c.id],
    });
  }

  await db.execute({
    sql: 'INSERT OR IGNORE INTO sessions (id, created_at, updated_at) VALUES (?, ?, ?)',
    args: [sessionId, now, now],
  });
}

export async function getStreakData() {
  const db = await ensureReady();
  const res = await db.execute(
    `SELECT date(reviewed_at) as day, COUNT(*) as count
     FROM review_log
     WHERE reviewed_at >= date('now', '-90 days')
     GROUP BY day ORDER BY day`
  );

  const daily: Record<string, number> = {};
  for (const r of res.rows) {
    daily[r.day as string] = r.count as number;
  }

  const total = res.rows.reduce((s, r) => s + (r.count as number), 0);

  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (daily[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }

  const maxCount = Math.max(...Object.values(daily), 1);

  return { daily, streak, total, maxCount };
}

export async function getCardDistribution() {
  const db = await ensureReady();

  const states = [
    { key: "new", label: "New", sql: "reps = 0", color: "#1c1c1c" },
    { key: "learning", label: "Learning", sql: "reps = 1", color: "#196c2e" },
    { key: "reviewing", label: "Reviewing", sql: "reps >= 2 AND interval <= 7", color: "#2ea043" },
    { key: "mature", label: "Mature", sql: "reps >= 2 AND interval > 7", color: "#3fb950" },
  ];

  const byState = [];
  for (const s of states) {
    const res = await db.execute({
      sql: `SELECT COUNT(*) as c FROM cards WHERE ${s.sql}`,
    });
    byState.push({ ...s, count: res.rows[0].c as number });
  }

  const topicRes = await db.execute(
    `SELECT topic, COUNT(*) as c FROM cards GROUP BY topic`
  );
  const byTopic: Record<string, number> = {};
  for (const r of topicRes.rows) {
    byTopic[r.topic as string] = r.count as number;
  }

  const total = byState.reduce((s, x) => s + x.count, 0);

  return { byState, byTopic, total };
}
