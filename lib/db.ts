import { createClient, type Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { parseCards } from './parse';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const TOPICS = ['1945', 'belanegara', 'pancasila', 'ringkasan', 'sejarah', 'tokoh'];
const LEGACY_CARD_COLUMNS = ['ef', 'interval', 'reps', 'next_review', 'last_review', 'session_id'];

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

async function migrateLegacySchema(db: Client) {
  const cardsInfo = await db.execute('PRAGMA table_info(cards)');
  const cardColumns = new Set(cardsInfo.rows.map((r) => r.name as string));
  if (cardColumns.has('ef')) {
    for (const col of LEGACY_CARD_COLUMNS) {
      if (cardColumns.has(col)) {
        await db.execute(`ALTER TABLE cards DROP COLUMN ${col}`);
      }
    }
  }

  const logInfo = await db.execute('PRAGMA table_info(review_log)');
  const logColumns = new Set(logInfo.rows.map((r) => r.name as string));
  if (logColumns.size > 0 && !logColumns.has('session_id')) {
    await db.execute('ALTER TABLE review_log ADD COLUMN session_id TEXT');
  }
}

async function ensureReady(): Promise<Client> {
  const db = getClient();
  if (!readyPromise) {
    readyPromise = (async () => {
      await db.execute(`CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        topic TEXT, title TEXT, content TEXT
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
        reviewed_at TEXT DEFAULT (datetime('now')),
        session_id TEXT
      )`);
      await migrateLegacySchema(db);
      await db.execute(`CREATE TABLE IF NOT EXISTS card_progress (
        session_id TEXT,
        card_id TEXT,
        ef REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0,
        next_review TEXT DEFAULT '1970-01-01',
        last_review TEXT DEFAULT '',
        PRIMARY KEY (session_id, card_id)
      )`);
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_card_progress_session_next ON card_progress(session_id, next_review)'
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_review_log_session_date ON review_log(session_id, reviewed_at)'
      );
      await syncCards(db);
    })();
  }
  await readyPromise;
  return db;
}

async function syncCards(db: Client) {
  const raw = readTopicMarkdown();
  const all = Object.entries(raw).flatMap(([topic, md]) => parseCards(md, topic));

  const existingRows = await db.execute('SELECT id, content FROM cards');
  const existing = new Map(existingRows.rows.map((r) => [r.id as string, r.content as string]));

  let changed = 0;
  for (const c of all) {
    const oldContent = existing.get(c.id);
    if (oldContent === undefined) {
      await db.execute({
        sql: 'INSERT INTO cards (id, topic, title, content) VALUES (?, ?, ?, ?)',
        args: [c.id, c.topic, c.title, c.content],
      });
      changed++;
    } else if (oldContent !== c.content) {
      await db.execute({
        sql: 'UPDATE cards SET topic=?, title=?, content=? WHERE id=?',
        args: [c.topic, c.title, c.content, c.id],
      });
      changed++;
    }
  }

  if (changed > 0) {
    console.log(`syncCards: ${changed} cards added/updated`);
  }
}

export function loadTopics(): Record<string, string> {
  return readTopicMarkdown();
}

export async function syncFromContent(): Promise<void> {
  const db = await ensureReady();
  await syncCards(db);
}

export async function getDueCards(sessionId: string) {
  const db = await ensureReady();
  const today = new Date().toISOString().slice(0, 10);
  const res = await db.execute({
    sql: `SELECT c.id, c.topic, c.title, c.content,
      COALESCE(p.ef, 2.5) as ef, COALESCE(p.interval, 0) as interval, COALESCE(p.reps, 0) as reps
      FROM cards c
      LEFT JOIN card_progress p ON p.card_id = c.id AND p.session_id = ?
      WHERE COALESCE(p.next_review, '1970-01-01') <= ?
      ORDER BY COALESCE(p.next_review, '1970-01-01') ASC LIMIT 20`,
    args: [sessionId, today],
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

export async function getStats(sessionId: string) {
  const db = await ensureReady();
  const today = new Date().toISOString().slice(0, 10);
  const [due, newC, rev, total] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as c FROM cards c
        LEFT JOIN card_progress p ON p.card_id = c.id AND p.session_id = ?
        WHERE COALESCE(p.next_review, '1970-01-01') <= ?`,
      args: [sessionId, today],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as c FROM cards c
        LEFT JOIN card_progress p ON p.card_id = c.id AND p.session_id = ?
        WHERE COALESCE(p.reps, 0) = 0`,
      args: [sessionId],
    }),
    db.execute({
      sql: 'SELECT COUNT(*) as c FROM card_progress WHERE session_id = ? AND last_review = ?',
      args: [sessionId, today],
    }),
    db.execute('SELECT COUNT(*) as c FROM cards'),
  ]);
  return {
    due: due.rows[0].c as number,
    newC: newC.rows[0].c as number,
    reviewed: rev.rows[0].c as number,
    total: total.rows[0].c as number,
  };
}

// UI exposes a 1-4 rating scale, but sm2() expects the classic 0-5 SM-2 quality scale.
const RATING_TO_QUALITY: Record<number, number> = { 1: 1, 2: 3, 3: 4, 4: 5 };

export async function reviewCard(sessionId: string, cardId: string, rating: number) {
  const db = await ensureReady();
  const { sm2 } = await import('./sm2');
  const now = new Date().toISOString();

  const res = await db.execute({
    sql: 'SELECT ef, interval, reps FROM card_progress WHERE session_id = ? AND card_id = ?',
    args: [sessionId, cardId],
  });
  const row = res.rows[0] ?? { ef: 2.5, interval: 0, reps: 0 };

  const quality = RATING_TO_QUALITY[rating] ?? rating;
  const r = sm2(row.ef as number, row.interval as number, row.reps as number, quality);
  const today = new Date().toISOString().slice(0, 10);
  const next = new Date();
  next.setDate(next.getDate() + r.interval);
  const nextStr = next.toISOString().slice(0, 10);

  await db.execute({
    sql: `INSERT INTO card_progress (session_id, card_id, ef, interval, reps, next_review, last_review)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id, card_id) DO UPDATE SET
        ef=excluded.ef, interval=excluded.interval, reps=excluded.reps,
        next_review=excluded.next_review, last_review=excluded.last_review`,
    args: [sessionId, cardId, r.ef, r.interval, r.reps, nextStr, today],
  });
  await db.execute({
    sql: 'INSERT INTO review_log (session_id, card_id, rating, reviewed_at) VALUES (?, ?, ?, ?)',
    args: [sessionId, cardId, rating, now],
  });
  await db.execute({
    sql: `INSERT INTO sessions (id, created_at, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at`,
    args: [sessionId, now, now],
  });
}

export async function resetCard(sessionId: string, cardId: string) {
  const db = await ensureReady();
  await db.execute({
    sql: 'DELETE FROM card_progress WHERE session_id = ? AND card_id = ?',
    args: [sessionId, cardId],
  });
}

export async function resetAllCards(sessionId: string) {
  const db = await ensureReady();
  await db.execute({
    sql: 'DELETE FROM card_progress WHERE session_id = ?',
    args: [sessionId],
  });
}

export async function getBrowseTopics() {
  await ensureReady();
  return loadTopics();
}

export async function getStreakData(sessionId: string) {
  const db = await ensureReady();
  const res = await db.execute({
    sql: `SELECT date(reviewed_at) as day, COUNT(*) as count
     FROM review_log
     WHERE session_id = ? AND reviewed_at >= date('now', '-90 days')
     GROUP BY day ORDER BY day`,
    args: [sessionId],
  });

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

export async function getMatureCards(sessionId: string, page: number, limit: number) {
  const db = await ensureReady();
  const offset = (page - 1) * limit;

  const [countRes, cardsRes] = await Promise.all([
    db.execute({
      sql: 'SELECT COUNT(*) as c FROM card_progress WHERE session_id = ? AND reps >= 2 AND interval > 7',
      args: [sessionId],
    }),
    db.execute({
      sql: `SELECT c.id, c.topic, c.title, c.content, p.ef, p.interval, p.reps,
        (SELECT COUNT(*) FROM review_log WHERE session_id = ? AND card_id = c.id) as review_count
        FROM card_progress p
        JOIN cards c ON c.id = p.card_id
        WHERE p.session_id = ? AND p.reps >= 2 AND p.interval > 7
        ORDER BY p.interval DESC
        LIMIT ? OFFSET ?`,
      args: [sessionId, sessionId, limit, offset],
    }),
  ]);

  return {
    cards: cardsRes.rows.map((r) => ({
      id: r.id as string,
      topic: r.topic as string,
      title: r.title as string,
      content: r.content as string,
      ef: r.ef as number,
      interval: r.interval as number,
      reps: r.reps as number,
      reviewCount: r.review_count as number,
    })),
    total: countRes.rows[0].c as number,
  };
}

export async function getReviewedCards(sessionId: string, page: number, limit: number) {
  const db = await ensureReady();
  const offset = (page - 1) * limit;

  const [countRes, cardsRes] = await Promise.all([
    db.execute({
      sql: 'SELECT COUNT(*) as c FROM card_progress WHERE session_id = ? AND reps >= 1 AND interval <= 7',
      args: [sessionId],
    }),
    db.execute({
      sql: `SELECT c.id, c.topic, c.title, c.content, p.ef, p.interval, p.reps,
        (SELECT COUNT(*) FROM review_log WHERE session_id = ? AND card_id = c.id) as review_count
        FROM card_progress p
        JOIN cards c ON c.id = p.card_id
        WHERE p.session_id = ? AND p.reps >= 1 AND p.interval <= 7
        ORDER BY p.interval DESC
        LIMIT ? OFFSET ?`,
      args: [sessionId, sessionId, limit, offset],
    }),
  ]);

  return {
    cards: cardsRes.rows.map((r) => ({
      id: r.id as string,
      topic: r.topic as string,
      title: r.title as string,
      content: r.content as string,
      ef: r.ef as number,
      interval: r.interval as number,
      reps: r.reps as number,
      reviewCount: r.review_count as number,
    })),
    total: countRes.rows[0].c as number,
  };
}

export async function getCardDistribution(sessionId: string) {
  const db = await ensureReady();

  const states = [
    { key: "learning", label: "Learning", sql: "reps = 1", color: "#196c2e" },
    { key: "reviewing", label: "Reviewing", sql: "reps >= 2 AND interval <= 7", color: "#2ea043" },
    { key: "mature", label: "Mature", sql: "reps >= 2 AND interval > 7", color: "#3fb950" },
  ];

  const [totalRes, ...stateResults] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM cards'),
    ...states.map((s) =>
      db.execute({
        sql: `SELECT COUNT(*) as c FROM card_progress WHERE session_id = ? AND ${s.sql}`,
        args: [sessionId],
      })
    ),
  ]);

  const total = totalRes.rows[0].c as number;
  const byState = states.map((s, i) => ({ ...s, count: stateResults[i].rows[0].c as number }));
  const newCount = total - byState.reduce((sum, s) => sum + s.count, 0);
  byState.unshift({ key: "new", label: "New", sql: "", color: "#1c1c1c", count: newCount });

  const topicRes = await db.execute(
    `SELECT topic, COUNT(*) as c FROM cards GROUP BY topic`
  );
  const byTopic: Record<string, number> = {};
  for (const r of topicRes.rows) {
    byTopic[r.topic as string] = r.c as number;
  }

  return { byState, byTopic, total };
}
