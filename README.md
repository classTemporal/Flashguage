# English Flashcards — Plan General

Aprendé inglés con flashcards, repetición espaciada, ejemplos contextuales e IA.
Web responsivo + offline-first, luego app Android nativa.

## Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Prisma ORM
- **DB dev**: SQLite (`better-sqlite3`) — cero config
- **DB prod**: PostgreSQL (Supabase / self-hosted)
- **Auth**: NextAuth.js (email/password + Google OAuth)
- **IA**: OpenAI / Anthropic API + fallback local (Ollama)
- **Offline**: Service Worker + IndexedDB
- **Algoritmo**: SM-2 personalizado con factoring de dificultad

## Desarrollo con Antigravity CLI

Todas las tareas de código, edición, patch, build y verificación se delegan a Antigravity CLI (`agy`).

### Configuración previa
```bash
# El proyecto ya tiene configurado:
# - Modelo default: gemini-3.8-flash-low (low thinking)
# - Fallbacks por rate limit automáticos
# - Alias: agy="agy --effort low"

# Verificar que agy funcione
agy --print "test"
```

### Flujo de trabajo
1. Crear tareas en el kanban del proyecto
2. Delegar a agy: `agy-delegate "implementar X"` o usar kanban + agy
3. El agente hace edits, patches, build de verificación
4. NO push — el padre verifica y hace push a `development`
5. Si algo falla, dejar que el agente lo resuelva

### Comandos útiles
```bash
# Delegar tarea simple
agy-delegate "crear schema de Prisma para User y Card"

# Delegar con modelo específico
agy-delegate "refactorizar motor SM-2" --model gemini-3.8-flash-high

# Build de verificación
npm run build

# Servidor de desarrollo
npm run dev
```

## Módulos
1. **Auth & Users** — ✅ registro, login, perfiles, config por usuario
2. **Flashcards** — ✅ CRUD manual + auto-generadas con IA
3. **Repetición Espaciada** — ✅ motor SM-2, stats, pronóstico
4. **IA Module** — ✅ definiciones, ejemplos, imágenes, sugerencias
5. **Context Picker** — ✅ seleccionar palabra en ejemplo y crear card
6. **Sync Engine** — ✅ online/offline, merge, colisiones
7. **Plugin System** — ✅ Hooks + módulos community
8. **Import/Export** — ✅ Anki CSV/JSON
9. **PWA** — ✅ manifest + service worker
10. **i18n** — ⏳ multi-idioma pendiente

## Características clave
- Modo oscuro + temas custom
- Responsivo (mobile-first)
- Testeable local sin servidor (SQLite)
- Multi-idioma (i18n)
- Rate limiting + caching IA

## Diseño UI/UX

### Sistema de diseño
- **Framework**: Tailwind CSS 3.4 con CSS variables para temas
- **Colores primarios**: Indigo (#6366f1) como accent principal
- **Tipografía**: Inter (sans-serif) desde Google Fonts
- **Radius**: 0.5rem por defecto en botones, inputs, cards
- **Spacing**: Escala de 4px (4, 8, 12, 16, 24, 32, 48, 64)

### Componentes base
- **Header**: sticky top-0, backdrop-blur, logo + theme toggle
- **Cards**: rounded-lg border, shadow-sm, hover:shadow-md
- **Buttons**: 
  - Primary: bg-primary text-primary-foreground rounded-md
  - Secondary: border rounded-md hover:bg-accent
  - Sizes: h-9 (sm), h-10 (md), h-11 (lg)
- **Forms**: 
  - Labels: text-sm font-medium mb-1
  - Inputs: rounded-md border px-3 py-2 text-sm
  - Focus: ring-2 ring-primary/20 border-primary
- **Loading**: spinner con border-primary border-t-transparent
- **Empty states**: icon + text + CTA button

### Páginas
- **Home**: hero section, 3 feature cards, CTA buttons
- **Auth (login/register)**: centered card, max-w-md, logo arriba
- **Dashboard**: 
  - Stats row: streak, cards learned, daily goal
  - Decks grid: cards con nombre, card count, study button
  - Offline banner: dismissible, warning colors
- **Study**: full-screen card, tap-to-flip, rate buttons 0-5
- **Deck detail**: header with actions, card list with tags
- **Settings**: grouped sections, save button sticky bottom

### Responsive breakpoints
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

### Dark mode
- CSS variables para background, foreground, card, primary, border
- Clase `.dark` en `<html>`
- Soporta system preference + manual toggle
- Todos los componentes deben tener variantes dark:

```css
.dark { --background: 222.2 84% 4.9%; --foreground: 210 40% 98%; }
```

### Accesibilidad
- ARIA labels en botones de iconos
- Focus visible states
- Navegación por teclado
- Labels en todos los inputs
- Contraste WCAG AA mínimo
