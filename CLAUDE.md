# English Flashcards — Project Context for Antigravity CLI

## Project overview
Aprender inglés con flashcards, repetición espaciada e IA.
Web responsivo + offline-first, luego app Android nativa.

## Tech stack
- Next.js 14 (Pages Router) + TypeScript + Tailwind CSS
- Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- NextAuth.js para autenticación
- Dexie.js para IndexedDB offline
- SM-2 algoritmo para repetición espaciada

## Project structure
```
src/
  pages/          # Next.js Pages Router
    _app.tsx      # Entry point
    index.tsx     # Home page
  components/     # React components
    ui/           # Primitivas de UI (botones, inputs, etc.)
  lib/            # Lógica pura (sin React)
    sm2.ts        # Motor de repetición espaciada
    ai.ts         # Integración con APIs de IA
    sync.ts       # Sincronización offline/online
  hooks/          # Custom React hooks
  server/         # API Routes de Next.js
    auth/         # NextAuth handlers
    cards/        # CRUD de flashcards
    decks/        # Gestión de mazos
  styles/         # Tailwind + temas
```

## Coding conventions
- **Clean Code**: funciones pequeñas, nombres descriptivos
- **TypeScript estricto**: sin `any`, interfaces explícitas
- **Componentes**: presentacionales (solo UI) vs contenedores (lógica)
- **API Routes**: modularizadas por recurso (`/api/cards`, `/api/decks`)
- **Error handling**: try/catch con mensajes amigables
- **Responsive**: mobile-first con Tailwind

## Current state
- Proyecto Next.js inicializado en `/home/ubuntu/projects/english-flashcards/`
- Tailwind configurado
- Página home funcionando en http://localhost:4000
- Dominio https://english.angel-hermes.duckdns.org configurado
- Schema de DB: PENDIENTE
- Auth: PENDIENTE

## What NOT to do
- No usar `alert()` ni `console.log` en producción
- No modificar archivos fuera de `src/` sin consultar
- No hacer `git push` — el padre lo hace después de verificar
- No agregar dependencias sin justificación

## Verification
```bash
npm run build   # debe compilar sin errores
npm run dev     # servidor en http://localhost:4000
```
