const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }
}

const TOPICS = ['1945', 'belanegara', 'pancasila', 'ringkasan', 'sejarah', 'tokoh'];
const CONTENT_DIR = path.join(__dirname, 'content');

function parseCards(md, topic) {
  const cards = [];
  const lines = md.split('\n');
  let currentTitle = topic;
  let buf = [];

  function flush() {
    const content = buf.join('\n').trim();
    if (content) {
      cards.push({
        id: `${topic}::${currentTitle}::${cards.length}`,
        topic,
        title: currentTitle,
        content,
      });
    }
    buf = [];
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      currentTitle = line.slice(3).trim();
    } else if (line.trim() === '---') {
      flush();
    } else {
      if (!line.startsWith('# ')) buf.push(line);
    }
  }
  flush();
  return cards;
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error('TURSO_DATABASE_URL is not set');
    process.exit(1);
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await db.execute(`CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY, topic TEXT, title TEXT, content TEXT,
    ef REAL DEFAULT 2.5, interval INTEGER DEFAULT 0, reps INTEGER DEFAULT 0,
    next_review TEXT DEFAULT '1970-01-01', last_review TEXT DEFAULT '', session_id TEXT
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, created_at TEXT, updated_at TEXT
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS review_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT, rating INTEGER,
    reviewed_at TEXT DEFAULT (datetime('now'))
  )`);

  const existing = new Set(
    (await db.execute('SELECT id FROM cards')).rows.map((r) => r.id)
  );

  const all = TOPICS.flatMap((t) =>
    parseCards(fs.readFileSync(path.join(CONTENT_DIR, `${t}.md`), 'utf-8'), t)
  );
  const toInsert = all.filter((c) => !existing.has(c.id));

  console.log(`Total cards: ${all.length}`);
  console.log(`Already in DB: ${existing.size}`);
  console.log(`To insert: ${toInsert.length}`);

  for (const c of toInsert) {
    await db.execute({
      sql: 'INSERT INTO cards (id, topic, title, content) VALUES (?, ?, ?, ?)',
      args: [c.id, c.topic, c.title, c.content],
    });
  }

  const count = await db.execute('SELECT COUNT(*) as c FROM cards');
  console.log(`Cards in DB after: ${count.rows[0].c}`);

  db.close();
}

main().catch(console.error);
