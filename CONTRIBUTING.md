# Contributing to Flashguage

Thank you for your interest in contributing to **Flashguage**! We welcome contributions from developers, language learners, designers, and documentation writers of all skill levels.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Pull Requests](#pull-requests)
- [Local Development Setup](#local-development-setup)
- [Branching & Commit Guidelines](#branching--commit-guidelines)
- [Coding Standards](#coding-standards)
- [Testing & Quality Assurance](#testing--quality-assurance)

---

## Code of Conduct

This project and everyone participating in it is governed by the [Flashguage Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior.

---

## How to Contribute

### Reporting Bugs

Before submitting a bug report, please check existing issues to ensure the problem has not already been reported. When creating a bug report, include:

1. **A clear, descriptive title**.
2. **Steps to reproduce** the bug.
3. **Expected vs actual behavior**.
4. **Screenshots or console logs** where applicable.
5. **Environment details** (Browser, OS, Node.js version).

### Suggesting Features

Feature requests are tracked as GitHub issues. When suggesting a feature:

- Clearly explain the problem it solves and why it is useful for language learners.
- Describe practical user scenarios or mockups if possible.
- Indicate if you are willing to implement the feature yourself.

### Pull Requests

1. **Fork** the repository and create your branch from `main`.
2. Ensure dependencies are installed and the database schema is up-to-date (`npx prisma db push`).
3. Make your changes in focused, well-documented commits.
4. Ensure the application compiles without errors:
   ```bash
   npm run build
   ```
5. Ensure linting passes:
   ```bash
   npm run lint
   ```
6. Submit your pull request with a detailed summary of changes.

---

## Local Development Setup

1. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/Flashguage.git
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

4. **Initialize SQLite database schema**:
   ```bash
   npx prisma db push
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Branching & Commit Guidelines

- **Branch naming**:
  - `feat/<feature-name>` for new capabilities.
  - `fix/<bug-name>` for bug fixes.
  - `docs/<doc-name>` for documentation improvements.
  - `refactor/<module-name>` for code restructurings.
- **Commit messages**:
  Follow conventional commit practices:
  - `feat: add audio pronunciation player to study screen`
  - `fix: resolve review limit counter in daily goal`
  - `docs: update setup and debugging instructions in README`

---

## Coding Standards

- **Language**: TypeScript with strict typing. Avoid `any` whenever possible.
- **Framework**: Next.js 14 Pages Router (`src/pages`).
- **Styling**: Tailwind CSS with standard design tokens and responsive classes (`sm:`, `md:`, `lg:`).
- **Internationalization & Copy**: All user-facing UI labels, descriptions, and error messages must be in clean, idiomatic English.
- **Components**: Functional React components with hooks. Keep components modular and single-purpose.

---

## License

By contributing to Flashguage, you agree that your contributions will be licensed under the [GNU General Public License v3.0](LICENSE).
