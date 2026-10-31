# Roadmap

## Sprint 1 — Base testeable ✅
1. Proyecto Next.js + Tailwind + shadcn/ui
2. Auth básica (email/password)
3. CRUD de Flashcards manual
4. Motor SM-2 mínimo
5. Nginx + dominio + SSL

## Sprint 2 — IA + Context ✅
6. Integración OpenAI/Anthropic + fallback Ollama
7. Auto-generación de cards con IA
8. Context Picker en ejemplos
9. Import Anki (CSV/JSON)

## Sprint 3 — Polish + Offline ✅
10. Service Worker + IndexedDB ✅
11. Sync engine ✅
12. Stats + gamificación ✅
13. Modo oscuro + temas ✅

## Sprint 4 — Mobile + Extras ✅
14. PWA + manifest ✅
15. Android native wrapper (Capacitor) — preparado
16. Plugin system ✅
17. Multi-idioma (i18n) — pendiente

## Diseño UI/UX — Sprint 5

### Tarea 1: Unificar diseño global
- Aplicar sistema de diseño del README.md a todas las páginas
- Crear componentes base: Header, Footer, Card, Button, Input, Loading
- Todos los componentes deben soportar dark mode
- Mobile-first, responsive

### Tarea 2: Mejorar páginas principales
- Dashboard: stats cards, deck grid, offline banner
- Study: full-screen card, smooth flip animation, rate buttons
- Deck detail: header con acciones, card list con tags
- Settings: grouped sections, sticky save button

### Tarea 3: Estados y accesibilidad
- Loading skeletons en todas las páginas
- Error boundaries globales
- 404/500 mejoradas
- ARIA labels, focus states, navegación teclado

### Tarea 4: Páginas restantes
- Context Picker: diseño limpio, tooltips accesibles
- Import/Export: preview tablas, progreso
- Plugins: cards con toggle switches, logs

Ver README.md sección "Diseño UI/UX" para specs completas.

## Cómo usar este roadmap con Antigravity CLI

Cada tarea del sprint se delega a `agy-delegate`. El flujo:

1. Seleccionar una tarea del sprint actual
2. Ejecutar: `agy-delegate "descripción de la tarea"`
3. El agente implementa, hace build y verifica
4. Revisar el resultado, ajustar si es necesario
5. Cuando el sprint está completo, hacer push a `development`

Para tareas complejas que requieren investigación previa:
```bash
agy-delegate "investigar cómo implementar X en Next.js 14" --model gemini-3.8-flash-high
```
