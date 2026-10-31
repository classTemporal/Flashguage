# Arquitectura

## Capas
- **src/pages/** — Next.js Pages Router (páginas, _app, _document)
- **src/components/** — UI primitivos + compuestos
- **src/lib/** — Lógica pura (sin React): algoritmos, IA, sync
- **src/hooks/** — React hooks + SW logic
- **src/server/** — API Routes + servicios
- **src/styles/** — Tailwind config + temas

## Datos
- `User` — auth, config, preferencias
- `Card` — front, back, tags, source (ai/manual), media
- `Review` — historial SM-2, ease factor, interval, due date
- `Deck` — colecciones de cards
- `ExampleSentence` — oraciones contextuales
- `AiGenerationLog` — tracking de uso IA + cache

## Sync Offline/Online
- IndexedDB local (Dexie.js)
- Cola de cambios pendientes
- Merge Last-Write-Wins + conflict detection
- Service Worker para cache de assets + API responses

## Convenciones de código
- Clean Code: funciones pequeñas, nombres descriptivos
- Modular: cada módulo en su carpeta, sin dependencias circulares
- Tipado estricto en TypeScript
- Componentes presentacionales vs contenedores separados
- Tests unitarios para lógica pura (`src/lib/`)

## Delegación con Antigravity CLI
- Todos los edits y patches los hace `agy-delegate`
- El agente sigue la estructura de carpetas definida acá
- No modificar archivos fuera de `src/` sin autorización
- Build y verificación local antes de cualquier push
