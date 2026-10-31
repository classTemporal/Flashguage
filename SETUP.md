# Setup

## Variables de entorno
- `DATABASE_URL` — SQLite dev / PostgreSQL prod
- `NEXTAUTH_SECRET` — 32 bytes aleatorios
- `NEXTAUTH_URL` — http://localhost:3000 (dev) / https://english.angel-hermes.duckdns.org (prod)
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — IA online
- `OLLAMA_URL` — http://localhost:11434 — IA local
- `NEXT_PUBLIC_APP_URL` — dominio público

## Dev
```bash
pnpm install
pnpm db:migrate
pnpm dev
```

## Build prod
```bash
pnpm build
pnpm start
```

## Docker (opcional)
```bash
docker compose up -d
```
