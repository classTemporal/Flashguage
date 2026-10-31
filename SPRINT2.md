# Sprint 2 — IA + Context Picker

## Objetivo
Agregar capacidades de IA para generar flashcards automáticamente y un Context Picker que permita seleccionar palabras dentro de ejemplos para crear cards.

## Tareas

### Tarea 1: Integración IA básica
- Crear `src/lib/ai.ts` con funciones para:
  - `generateDefinition(word, lang)` — definición + ejemplo
  - `generateExample(word, context)` — oración de ejemplo
  - `suggestRelatedWords(word)` — palabras relacionadas
- Soportar OpenAI y Anthropic APIs
- Fallback a Ollama si no hay API key
- Cache de resultados en IndexedDB (Dexie)
- Endpoint `/api/ai/generate` para invocar desde el frontend
- Variables de entorno: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_URL`

### Tarea 2: Auto-generación de flashcards
- Botón "Generate with AI" en `/deck/[id]`
- Input: palabra o frase
- Output: flashcard con front/back generados + ejemplo + imagen opcional
- Permitir editar antes de guardar
- Rate limiting para no abusar de la API

### Tarea 3: Context Picker
- Modal o página con texto de ejemplo
- Usuario puede seleccionar cualquier palabra del texto
- Al seleccionar, aparece tooltip con opción "Create flashcard"
- Si acepta, abre modal de creación con la palabra preseleccionada
- Usar `window.getSelection()` +Range APIs

### Tarea 4: Import Anki
- Endpoint `/api/import/anki` (CSV/JSON)
- Formato CSV: front,back,tags
- Validar duplicados antes de importar
- Mostrar preview antes de confirmar import
- Página `/import` con formulario de subida

## Stack
- IA: OpenAI SDK + Anthropic SDK + fetch para Ollama
- Cache: Dexie.js (IndexedDB)
- UI: modales con Tailwind, responsive mobile-first
- API Routes: Next.js serverless en `/src/pages/api/`

## Convenciones
- Mismo patrón que Sprint 1: src/server/*, src/pages/api/*
- Strict TypeScript
- Dark mode con dark: prefix
- Build debe pasar sin errores
