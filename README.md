# Gantt Timelines

A self-saving project Gantt timeline, built with **Next.js (App Router) +
TypeScript + React + Tailwind CSS**. Click any bar, task, or project to edit it,
or **drag a bar to reschedule** it; changes persist automatically to the
browser's local storage.

This started life as a single static `project-timeline.html` prototype (kept for
reference under [`reference/`](./reference/project-timeline.html)) and has been
ported to a maintainable Next.js app.

## Features

- Month / week axis with a live **TODAY** marker
- Projects with a colour, a deadline milestone, and any number of tasks
- **Drag a task bar to move it; drag either edge to resize** (snaps to whole days)
- Add / edit / delete projects and tasks via a modal
- Move a task between projects
- Auto-save to `localStorage` (with a "saved ✓" indicator)
- Reset back to the bundled default schedule
- AI assistant (Gemini) — uses `GEMINI_API_KEY` from the server environment
- Styled with **Tailwind CSS v4** (design tokens live in `app/globals.css`)

## Requirements

- **Node.js 20.9+** (required by Next.js 16; built/tested on Node 20.17).
  Your default `node` may be older — if so, run `nvm use 20` first.

## AI assistant

Set `GEMINI_API_KEY` in `.env.local` (get a free key at
[Google AI Studio](https://aistudio.google.com/apikey)).

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then set GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the dev server              |
| `npm run build` | Production build                  |
| `npm run start` | Serve the production build        |

## Project structure

```
app/                 Next.js App Router (layout, page, global styles)
  api/ai/            AI assistant endpoint
components/
  Timeline.tsx       Main client component — axis, grid, rows, today line
  EditModal.tsx      Add/edit modal for projects and tasks
  AIAssistant.tsx    AI prompt panel
lib/
  types.ts           Project / Task / TimelineData types
  date.ts            Date helpers (toDays, fmt, etc.)
  defaultData.ts     Default schedule + colour palette
  storage.ts         IndexedDB persistence
reference/           Original static HTML prototype
```
