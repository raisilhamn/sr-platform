# SR App — CPNS Spaced Repetition

Spaced repetition study app for CPNS (Indonesian Civil Service) exam materials.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Defaults to a local SQLite file (`local.db`). To use a remote Turso database:

1. Copy `.env.example` to `.env.local`
2. Set your Turso credentials:

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token
```

### Seed

After setting up the database, run:

```bash
npm run seed
```

This reads markdown files from `content/` and inserts cards into the database.

## Content

Study materials are in `content/` as markdown files:

- `1945.md` — Pembukaan UUD 1945
- `belanegara.md` — Bela Negara
- `pancasila.md` — Pancasila
- `ringkasan.md` — Lembaga Pemerintahan
- `sejarah.md` — Sejarah Kebangsaan
- `tokoh.md` — Tokoh-Tokoh Penting

## Tech

- [Next.js](https://nextjs.org) (App Router)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Turso/libSQL](https://turso.tech) / SQLite
- [react-markdown](https://github.com/remarkjs/react-markdown)
