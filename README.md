# Bun Task API — Portfolio Project

A small, real-world backend built with **Bun**, **SQLite** (better-sqlite3) and **OpenAI**.  
Demonstrates a fast Bun server that stores tasks and generates AI summaries.

---

## Features

- Create tasks (title).
- Stores tasks in SQLite.
- Asynchronously generates an AI summary for each task (OpenAI). Here we are    using Gemini AI.
- Simple client UI (static `public/index.html`).
- Two run modes: local (Bun) and Docker.
- Minimal dependencies; pure JavaScript/TypeScript with Bun.

---

## Prerequisites

- Bun installed (https://bun.sh)
- Node/npm not required (Bun replaces)
- OpenAI API key (for production summaries) — set `OPENAI_API_KEY` env var.
- Or Set Gemini AI API key in env GEMINI_API_KEY   
---

## Quickstart (macOS / Linux / Git Bash)

```bash
git clone <your-repo-url>
cd bun-task-api
bun install

# set your OpenAI key (optional)
export OPENAI_API_KEY="sk-..."
GEMINI_API_KEY=Your Gemini AI Key
# run
bun run src/server.ts
# open http://localhost:3000
