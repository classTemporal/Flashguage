<div align="center">

# 🧠 Flashguage

**Intelligent, Multi-Language Spaced Repetition Flashcard Platform with AI Assistance & Offline Sync.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-purple)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Algorithm](https://img.shields.io/badge/Algorithm-SM--2-emerald)](https://en.wikipedia.org/wiki/SuperMemo#SM-2)

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-supported-languages">Supported Languages</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Configuration</a> •
  <a href="#-debugging--developer-tools">Debugging</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license">License</a>
</p>

</div>

---

## 🌟 Overview

**Flashguage** is an open-source, mobile-first progressive web application built for language learners who want to build a deep, lasting vocabulary across multiple languages without cognitive fatigue.

Unlike traditional flashcard apps that blend all topics into a single stream, Flashguage introduces **isolated language learning tracks** (English, Spanish, French, German, Japanese, Chinese, and more). Each language has its own independent dashboard, daily study target, deck collection, vocabulary mastery progression, and spaced repetition review schedule.

By combining the battle-tested **SuperMemo SM-2** spaced repetition algorithm with **smart session batching**, **cooldown brain breaks**, **instant AI card generation**, and **offline-first local database synchronization**, Flashguage ensures that your practice sessions are focused, effective, and scientifically sound.

---

## ✨ Key Features

### 🧠 Scientific Spaced Repetition (SM-2)
- **Cognitive Session Batching**: Study sessions automatically respect your configured **Review Limit** per batch (default 20 cards), preventing cognitive overload.
- **Brain Break Cooldown & Live Countdown**: Upon completing a batch, Flashguage enters a rest cooldown (configurable in Settings) with a live countdown timer (`⏳ Next batch in mm:ss`) displayed on both the completion screen and the dashboard, with a 1-click **Skip Break** option.
- **Intelligent Interval Adjustment**: Cards adapt their repetition intervals and ease factors based on your recall rating (**Again**, **Hard**, **Mastered**).
- **Time Simulation (+1 Day)**: Built-in simulation tool to advance time by 1 day and test scheduled review triggers instantly.

### 🌐 Multi-Language Learning Tracks
- **Track Selection & Quick Switch**: Select your active language track from the dedicated Learning Tracks hub.
- **100% Track Isolation**: Switching between tracks completely isolates dashboards, card due counters, deck creation, and dictionaries.
- **Per-Track Statistics**: Individual streaks, card mastery levels (Level 1 to 5), XP calculation, and daily goal tracking per language.

### ✍️ Interactive Practice Modes
- **Standard Recall**: Tap-to-flip cards with phonetic audio, contextual cloze hints, and Unsplash visual reference images.
- **Spelling Challenge**: Active recall mode where you type the target word from memory with real-time correctness verification.
- **Mixed Practice**: Combines recall and typing challenges for comprehensive reinforcement.
- **Free Practice (Cram Mode)**: Review any deck without altering its spaced repetition intervals or due dates.

### 🤖 AI-Powered Flashcard Generation
- **Automated Card Creation**: Enter any target word or phrase and let AI instantly fetch definitions, phonetic transcriptions (IPA), parts of speech, and bilingual example sentences.
- **Multi-Provider AI Engine**: Built-in support for **OpenAI** (GPT-4o, GPT-3.5) and **local LLMs via Ollama** (e.g. Llama 3, Mistral) with runtime model autodetection and automatic fallback handling.
- **Context Picker**: Paste authentic reading passages or articles; Flashguage scans the text and helps you generate flashcards from unknown vocabulary on the fly.

### 📖 Integrated Dictionary & Audio Pronunciation
- **Native Pronunciation**: Audio speech synthesis via the Web Speech API and native phonetic sound assets.
- **Quick Dictionary Lookup**: Search definitions, synonyms, and parts of speech in any supported language with a 1-click **+ Create Flashcard** button.

### 📱 Offline-First PWA Architecture
- **IndexedDB via Dexie.js**: All user decks, cards, and pending reviews are cached locally in your browser.
- **Background Sync Queue**: Perform reviews, create decks, or edit cards while offline; changes automatically sync with the server once connectivity resumes.
- **Installable PWA**: Installable as a standalone app on iOS, Android, macOS, Windows, and Linux with full offline support.

### 📊 Progress Analytics & Deck Management
- **Mastery Level Breakdown**: Track words across 4 mastery stages: *New*, *In Progress (1-99%)*, *Due for Review*, and *100% Mastered*.
- **Favorite Deck Pinning**: Pin your most frequently practiced decks to the top of your library.
- **Activity Visualizer**: 7-day weekly practice bar chart showing cards reviewed each day.
- **Anki Import / Export**: Import your existing collections via CSV or JSON, or export your Flashguage decks to standard Anki formats.

---

## 🌍 Supported Languages

Flashguage comes preconfigured with dedicated learning tracks, UI localization, flag badges, and preset starter decks for:

| Language | Code | Native Name | Script / Writing System |
| :--- | :--- | :--- | :--- |
| **English** | `en` | English | Latin |
| **Spanish** | `es` | Español | Latin |
| **French** | `fr` | Français | Latin |
| **German** | `de` | Deutsch | Latin |
| **Italian** | `it` | Italiano | Latin |
| **Portuguese** | `pt` | Português | Latin |
| **Japanese** | `ja` | 日本語 | Kanji, Hiragana, Katakana |
| **Chinese** | `zh` | 中文 | Simplified / Traditional Hanzi |
| **Russian** | `ru` | Русский | Cyrillic |
| **Arabic** | `ar` | العربية | Arabic (RTL) |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (Pages Router)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict typing)
- **Styling & UI**: [Tailwind CSS 3.4](https://tailwindcss.com/) + CSS variables for Light/Dark themes
- **Database & ORM**: [Prisma ORM 5.22](https://www.prisma.io/) with **SQLite** (`dev.db`) for zero-config local dev and PostgreSQL compatibility for production
- **Authentication**: [NextAuth.js 4](https://next-auth.js.org/) (JWT session tokens, Credentials provider)
- **State & Data Fetching**: [SWR 2.5](https://swr.vercel.app/) (Stale-While-Revalidate) + [Zustand](https://github.com/pmndrs/zustand)
- **Client Database & Offline Sync**: [Dexie.js 4](https://dexie.org/) (IndexedDB wrapper) + Service Workers
- **AI Integrations**: [OpenAI SDK](https://github.com/openai/openai-node) + [Ollama](https://ollama.ai/) local REST API
- **Audio & Media**: Web Speech API (`speechSynthesis`) + Unsplash Image API

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `18.17.0` or higher (Node 20 LTS recommended)
- **npm**: `9.x` or higher (or `pnpm` / `yarn`)
- **Git**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/classTemporal/Flashguage.git
   cd Flashguage
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *(Review the [Configuration](#-environment-variables) section below for key details).*

4. **Initialize the database schema**:
   ```bash
   npx prisma db push
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open Flashguage in your browser**:
   Navigate to [http://localhost:4000](http://localhost:4000) (or the port specified in your console).

---

## ⚙️ Environment Variables

Create a `.env` (or `.env.local`) file in the root directory. Below are the supported environment variables:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | `file:./dev.db` | Database connection string. SQLite path for local dev or PostgreSQL URI for production. |
| `NEXTAUTH_URL` | **Yes** | `http://localhost:4000` | Canonical URL of your deployment (used for redirect callbacks and cookie security). |
| `NEXTAUTH_SECRET` | **Yes** | `change-me-32-bytes-random` | 32-character random string used to encrypt JWT session tokens. |
| `OPENAI_API_KEY` | Optional | `""` | OpenAI API key for AI card generation and dictionary completions. |
| `OPENAI_BASE_URL` | Optional | `https://api.openai.com/v1` | Custom proxy or compatible OpenAI endpoint. |
| `OLLAMA_URL` | Optional | `http://localhost:11434` | Endpoint for local offline LLMs (e.g. Llama 3 running via Ollama). |
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:4000` | Public base URL accessed by clients. |

> **Tip**: Generate a secure `NEXTAUTH_SECRET` using OpenSSL:
> ```bash
> openssl rand -base64 32
> ```

---

## 🐞 Debugging & Developer Tools

### 1. Prisma Studio (Database GUI)
Inspect, edit, and debug your users, decks, flashcards, reviews, and settings with an interactive browser interface:
```bash
npx prisma studio
```
Access the studio at [http://localhost:5555](http://localhost:5555).

### 2. Time Travel & Review Simulator
To test the spaced repetition algorithm without waiting days for cards to become due:
- Open any study session (`/study/all`).
- Rate your cards to complete the batch.
- On the completion screen, click **⏩ Simulate Time (+1 Day)** to advance user review timestamps and test next-day due queues.

### 3. Debugging Offline Sync & IndexedDB
- Open **Google Chrome Developer Tools** (`F12`).
- Navigate to **Application** → **Storage** → **IndexedDB** → `FlashguageLocalDB`.
- Inspect cached decks, offline reviews, and sync queue items in real-time.
- Toggle **Network** → **Offline** to test offline study and automatic resynchronization.

### 4. Testing AI Providers (Ollama / Local LLMs)
If you prefer running 100% private and offline AI:
1. Install [Ollama](https://ollama.ai/):
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama run llama3
   ```
2. In Flashguage, open **Settings** → **AI Model Provider** → select **Ollama (Local)**.
3. Click **Detect Available Models** to automatically load installed models.

---

## 📁 Architecture & Directory Structure

```text
Flashguage/
├── prisma/
│   ├── schema.prisma        # Prisma data models (User, Deck, Card, Review, etc.)
│   └── dev.db               # SQLite database file (local development)
├── public/
│   ├── favicon.ico
│   └── manifest.json        # PWA configuration manifest
├── src/
│   ├── components/
│   │   ├── deck/            # Deck creation, card list, modals, import/export
│   │   ├── layout/          # Header, footer, navigation bar, track switcher
│   │   └── ui/              # Buttons, cards, modals, loading spinners, toasts
│   ├── hooks/
│   │   ├── use-offline.ts   # Offline detection hook
│   │   └── use-sync.ts      # IndexedDB and background synchronization queue
│   ├── lib/
│   │   ├── dexie.ts         # Dexie.js IndexedDB schema & tables
│   │   ├── languages.ts     # Multi-language definitions, tracks, flag metadata
│   │   ├── prisma.ts        # Prisma client singleton
│   │   └── sm2.ts           # SuperMemo SM-2 interval & mastery calculation logic
│   ├── pages/
│   │   ├── api/             # Next.js backend API routes (REST)
│   │   │   ├── ai/          # AI generation & model discovery endpoints
│   │   │   ├── auth/        # Authentication & user registration
│   │   │   ├── cards/       # Flashcard CRUD & mastery updates
│   │   │   ├── decks/       # Deck CRUD & favorite pinning
│   │   │   ├── reviews/     # SM-2 due card queries & review submission
│   │   │   └── settings/    # User settings (Daily Goal, Review Limit, Break duration)
│   │   ├── dashboard.tsx    # Main language dashboard & daily goal tracker
│   │   ├── dictionaries.tsx # Integrated dictionary lookup tool
│   │   ├── progress.tsx     # Card mastery visualizer & interval counters
│   │   ├── settings.tsx     # User preferences & study limits
│   │   ├── study/
│   │   │   └── [deckId].tsx # Core study screen (SM-2, spelling challenge, cooldown)
│   │   └── tracks.tsx       # Language track selection & management hub
│   ├── server/              # Server-side business logic and NextAuth handlers
│   └── styles/
│       └── globals.css      # Tailwind directives and theme variables
├── CONTRIBUTING.md          # Contribution guidelines
├── CODE_OF_CONDUCT.md       # Contributor Covenant Code of Conduct
├── LICENSE                  # GNU General Public License v3.0
└── package.json             # Scripts & dependencies
```

---

## 📦 Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Launches Next.js development server on port 4000 with hot reloading. |
| **Production Build** | `npm run build` | Compiles optimized production bundle and runs typecheck/linting. |
| **Production Start** | `npm run start` | Starts the production server using the compiled `.next` build. |
| **Lint** | `npm run lint` | Runs Next.js ESLint rules across the codebase. |
| **Prisma Push** | `npx prisma db push` | Syncs schema changes directly to the SQLite/Postgres database. |
| **Prisma Studio** | `npx prisma studio` | Opens the local database browser on port 5555. |

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please read our [Contributing Guidelines](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests or opening issues.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for complete details.

---

<div align="center">
  <sub>Built with ❤️ for passionate language learners worldwide.</sub>
</div>
