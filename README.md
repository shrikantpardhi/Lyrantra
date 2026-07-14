# Lyranta

Lyranta is a multilingual lyrics publishing platform with artist and movie catalogs, translations,
transliterations, global search, categories, comments, official listening links, SEO controls, an
editorial studio, and human-reviewed AI metadata discovery.

## Included

- English editorial UI with multilingual lyrics, translations, transliterations, and language filters
- Song pages with multiple artists and lyric versions
- Human-reviewed song meanings with themes, section analysis, cultural context, sources, and disclaimers
- Artist pages with pagination and movie soundtrack pages
- Full-catalog search with category, genre, language, and year filters
- Moderated comments, sharing, About, Contact, and copyright pages
- Administrative song, lyric, artist, comment, and AI-provider workflows
- PostgreSQL schema, full-text index, demo data, Docker support, and database scripts
- Admin-initiated AI metadata research through Gemini, OpenAI, or compatible providers
- Canonicals, `hreflang`, sitemaps, robots rules, structured data, and security headers

AI discovery intentionally collects metadata only. It does not fetch or generate copyrighted lyrics,
and every candidate remains unpublished until editorial review.

## Local development

Requirements: Node.js 22 and npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Without `DATABASE_URL`, Lyranta uses a non-persistent demonstration
catalog. Local Studio credentials default to `admin@lyranta.local` / `lyranta-demo`; set explicit
credentials before sharing an environment.

## PostgreSQL

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

The example environment points to this local database. Managed production PostgreSQL should use SSL
and automated backups.

## Verification

```bash
npm run lint
npm run typecheck
npm test
NEXT_PUBLIC_SITE_URL=https://lyranta.example npm run build
```

## Production configuration

Set all values documented in `.env.example`. In particular:

- Use independent high-entropy values for `AUTH_SECRET` and `ENCRYPTION_KEY`.
- Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin before indexing.
- Replace demonstration content only with licensed, authorized, or public-domain lyrics.
- Have qualified counsel review territory-specific licenses, privacy terms, and takedown procedures.

AI research runs only when an authenticated administrator clicks **Run discovery** in Studio.
There is no scheduled or public ingestion endpoint.

Song interpretations have an independent draft, review, and published state. Publishing a song does
not expose its interpretation until an editor separately marks that analysis as published.

## Architecture

The Next.js application renders SEO-critical pages on the server. PostgreSQL is the source of truth;
JSONB stores versioned lyric and platform-link payloads while relational tables preserve song/artist
many-to-many relationships. In environments without PostgreSQL, the repository layer supplies safe
public-domain and original demonstration data.

Provider API keys are encrypted with AES-256-GCM before storage and are never returned to the browser.
Administrative sessions use signed HTTP-only cookies. Production deployments can run through the
included standalone Docker image or a compatible Node.js platform.

Build the container with its canonical origin:

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://lyranta.example -t lyranta .
```
