# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeerFlow (Deep Exploration and Efficient Research Flow) is a full-stack AI super agent harness built on LangGraph and LangChain. It orchestrates sub-agents, memory, sandboxes, and extensible skills.

**Architecture** (4 services behind nginx on port 2026):
- **LangGraph Server** (port 2024): Agent runtime and workflow execution
- **Gateway API** (port 8001): FastAPI REST API for config, uploads, memory, skills, MCP
- **Frontend** (port 3000): Next.js 16 web interface
- **Nginx** (port 2026): Unified reverse proxy (`/api/langgraph/*` → LangGraph, `/api/*` → Gateway, `/` → Frontend)

## Commands

### Full Application (from project root)

```bash
make check      # Verify prerequisites (Node.js 22+, pnpm, uv, nginx)
make install    # Install all dependencies (backend + frontend)
make dev        # Start all services with hot-reload
make stop       # Stop all services
make config     # First-time config generation (aborts if config.yaml exists)
```

### Backend (from `backend/`)

```bash
make lint       # ruff check
make format     # ruff format
make test       # Run all tests (pytest)
make dev        # LangGraph server only
make gateway    # Gateway API only

# Run a single test file
PYTHONPATH=. uv run pytest tests/test_<feature>.py -v
```

### Frontend (from `frontend/`)

```bash
pnpm dev        # Dev server with Turbopack
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
BETTER_AUTH_SECRET=local-dev-secret pnpm build  # Production build (BETTER_AUTH_SECRET required)
```

**Note**: `pnpm check` is currently broken (invalid `next lint` invocation). Use `pnpm lint && pnpm typecheck` instead.

### Docker

```bash
make docker-init   # Pull sandbox image (once)
make docker-start  # Start dev services (mode-aware from config.yaml)
make docker-stop   # Stop dev services
make up            # Production build + start
make down          # Stop production containers
```

## Pre-Commit Validation

Backend CI runs on every PR (`.github/workflows/backend-unit-tests.yml`):
```bash
cd backend && make lint && make test
```

Frontend (if touched):
```bash
cd frontend && pnpm lint && pnpm typecheck
```

## Architecture

### Monorepo Structure

- **`backend/`** — Python 3.12+, split into harness package + app layer. See `backend/CLAUDE.md` for full architecture.
- **`frontend/`** — Next.js 16, React 19, TypeScript 5.8, Tailwind CSS 4, pnpm. See `frontend/CLAUDE.md` for details.
- **`skills/`** — Agent skills (`public/` committed, `custom/` gitignored)
- **`config.yaml`** — Main app config (models, tools, sandbox, memory, channels)
- **`extensions_config.json`** — MCP servers and skills enable/disable state

### Backend: Harness/App Split

Strict dependency boundary enforced by CI (`tests/test_harness_boundary.py`):
- **Harness** (`backend/packages/harness/deerflow/`): Publishable agent framework. Import: `deerflow.*`
- **App** (`backend/app/`): FastAPI gateway + IM channels. Import: `app.*`
- App may import deerflow; deerflow must NEVER import app.

### Key Backend Systems

- **Lead Agent** — LangGraph agent with 12-middleware chain, dynamic tool loading, skills injection
- **Sandbox** — Virtual path system (`/mnt/user-data/` ↔ `.deer-flow/threads/{id}/`), local or Docker providers
- **Subagents** — Background task delegation with 3-worker thread pools, 15-min timeout
- **Memory** — LLM-based fact extraction, debounced queue, atomic file I/O to `.deer-flow/memory.json`
- **MCP** — Multi-server tool integration with lazy init and mtime-based cache invalidation
- **Model Factory** — Reflection-based LLM instantiation with thinking/vision support

### Frontend Key Patterns

- Server Components by default, `"use client"` only for interactive components
- Thread hooks (`useThreadStream`, `useSubmitThread`, `useThreads`) are the primary API interface
- LangGraph client singleton via `getAPIClient()` in `core/api/`
- Path alias: `@/*` → `src/*`
- `ui/` and `ai-elements/` components are auto-generated from registries — don't manually edit

## Configuration

- `config.yaml` in project root — models, tools, sandbox, memory, channels. Values starting with `$` resolve as env vars.
- `extensions_config.json` in project root — MCP servers and skills state. Both are hot-reloaded on mtime change.
- `.env` in project root — API keys (`OPENAI_API_KEY`, `TAVILY_API_KEY`, etc.)
- `BETTER_AUTH_SECRET` env var required for frontend production builds.

## Code Style

- **Backend**: ruff linter/formatter, 240-char line length, Python 3.12+ type hints, double quotes
- **Frontend**: ESLint with enforced import ordering (builtin → external → internal), inline type imports (`import { type Foo }`), `cn()` for conditional Tailwind classes, unused vars prefixed with `_`

## Plan Rules
- When you are asked to work on a requirement with a numbering format like # 2026-03-07-01, please read the corresponding section from `docs/plans/my_plan.md` and do not involve content from other sections.

## Some Preference Notes
- We prefer Log.info over System.out.println

## Language Notes
- Please use Simplified Chinese and English to communicate, write, and output.
- Japanese and Korea are forbidden to use.

## GitHub Instructions
- When committing, if the fix addresses a previously submitted issue, add a comment to the issue explaining the fix details.
- When committing the modifications accoring to the specific section in my_plan.md, includes the description in that section in the commit message.