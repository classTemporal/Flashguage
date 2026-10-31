# Sprint 4 — Mobile + Extras

## Objetivo
Convertir la app en PWA instalable, preparar wrapper para Android, y agregar sistema de plugins comunitario.

## Tareas

### Tarea 1: PWA + manifest
- Crear `public/manifest.json` — app manifest para instalación:
  - name, short_name, description
  - start_url, display: standalone
  - theme_color, background_color
  - icons: 192x192, 512x512 (placeholder SVG icons)
- Crear `public/sw.js` — Service Worker básico:
  - Cache de assets estáticos (CSS, JS, fonts)
  - Cache de páginas visitadas
  - Offline fallback para rutas principales
  - Estrategia: stale-while-revalidate
- Actualizar `src/pages/_app.tsx` — registrar SW en cliente
- Actualizar `next.config.js` — headers para PWA

### Tarea 2: Android wrapper prep
- Crear `android/` scaffold para Capacitor:
  - capacitor.config.ts
  - Configurar para dominio https://english.angel-hermes.duckdns.org
- Agregar scripts a package.json:
  - "android:build": "cap sync android && cap open android"
  - "pwa:build": "next build && next export"
- Documentar proceso de build en ANDROID.md

### Tarea 3: Plugin system
- Crear `src/lib/plugins.ts` — plugin registry:
  - interface Plugin { name, version, author, hooks }
  - hooks: onCardCreate, onCardReview, onDeckCreate, onStudyComplete
  - registerPlugin(), unregisterPlugin(), getPlugins()
- Crear `src/hooks/use-plugins.ts` — React hook para acceder a plugins
- Crear `src/components/plugin-manager.tsx` — UI para activar/desactivar plugins
- Ejemplo de plugin: "Example Counter" — cuenta cuántas veces se usa una card
- Guardar plugins activos en User settings

### Tarea 4: Export功能
- Crear `src/pages/export.tsx` — página de export:
  - Seleccionar deck
  - Formatos: CSV, JSON
  - Preview antes de descargar
- Crear `src/pages/api/export/route.ts` — GET endpoint:
  - ?deckId=X&format=csv|json
  - Retorna archivo con contenido de cards

### Tarea 5: Polish final
- Favicon dinámico
- Meta tags para redes sociales
- Error boundary global
- 404 page mejorada
- Loading skeletons en todas las páginas
- Smooth transitions entre páginas

## Convenciones
- Mismo patrón: src/lib/, src/pages/api/, src/components/
- Strict TypeScript
- Mobile-first
- Dark mode
- Build debe pasar
