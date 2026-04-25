# MiniBookLM — Frontend Structure

> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · Framer Motion 12 · Zustand 5 · Lucide React
> **Deploy target:** Vercel
> **Design system:** Cognitive Luxury

---

## Directory Tree

```
frontend/
├── app/                          ← Next.js App Router root
│   ├── layout.tsx                ← Root layout: fonts, theme attr, global providers
│   ├── page.tsx                  ← Entry page: renders the full workspace shell
│   ├── globals.css               ← Design token CSS variables + keyframe animations
│   └── favicon.ico
│
├── components/
│   ├── layout/                   ← Structural shell components
│   │   ├── Navbar.tsx            ← Topbar: logo, level toggle, theme toggle, avatar
│   │   ├── Sidebar.tsx           ← Left panel: document list, search, upload trigger
│   │   └── UploadModal.tsx       ← Drag-and-drop PDF upload modal with progress bar
│   │
│   ├── chat/                     ← Core interaction surface
│   │   └── ChatPanel.tsx         ← Message log, streaming input, action bar (Summarize / Explain / Quiz)
│   │
│   ├── panel/                    ← Right-side contextual panel
│   │   └── RightPanel.tsx        ← Tabbed panel: Notes · Graph · Citations
│   │
│   └── ui/                       ← Primitive / utility components
│       ├── SettingsModal.tsx      ← Font size, theme, level preferences modal
│       └── Toast.tsx              ← Slide-in toast notification (success / error / info)
│
├── lib/
│   ├── types.ts                  ← All TypeScript interfaces (shared API contract)
│   ├── api.ts                    ← API client: mock-first, real backend behind API_BASE flag
│   ├── mockData.ts               ← Static mock data: docs, messages, notes, citations, quiz
│   └── formatMessage.ts          ← Markdown/citation formatter for AI message rendering
│
├── store/
│   └── appStore.ts               ← Zustand global store (theme, level, docs, messages, notes)
│
├── public/                       ← Static assets
│
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── package.json
├── AGENTS.md                     ← Agent instructions for AI-assisted development
└── README.md
```

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Navbar (Topbar)                          │
│  Logo · Workspace pill · Level toggle · Theme · Avatar          │
├──────────────┬──────────────────────────────┬───────────────────┤
│   Sidebar    │         ChatPanel            │    RightPanel     │
│  (Left)      │         (Center)             │    (Right)        │
│              │                              │                   │
│ • Doc list   │  Message log                 │ Tabs:             │
│ • Search     │  ├─ User bubbles             │ • Notes           │
│ • Upload btn │  ├─ AI bubbles (streaming)   │ • Graph           │
│ • File badge │  ├─ Source highlights        │ • Citations       │
│ • Remove doc │  └─ Typing animation         │                   │
│              │                              │                   │
│              │  Action bar                  │                   │
│              │  [Summarize][Explain][Quiz]   │                   │
│              │                              │                   │
│              │  Input: textarea + Send btn  │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

Responsive breakpoints:
- `< 680px` — sidebar collapses to overlay drawer, right panel hidden
- `680–900px` — sidebar hidden by default, right panel accessible via tab
- `900–1100px` — sidebar visible, right panel collapsible
- `> 1100px` — full three-column layout

---

## Component Reference

### `components/layout/Navbar.tsx`
| Element | Description |
|---|---|
| Logo | "MiniBookLM" wordmark with amber accent dot |
| Workspace pill | Active notebook name / switcher |
| Level toggle | Segmented control: `Beginner · Student · Expert` — writes to `appStore.level`, passed to API as `audience_level` |
| Theme toggle | Sun/Moon icon — sets `data-theme` on `<html>` + persists to `localStorage` |
| Avatar | Static placeholder; settings icon opens `SettingsModal` |

---

### `components/layout/Sidebar.tsx`
| Element | Description |
|---|---|
| Document list | Renders `MiniBookDocument[]` from store; active doc highlighted |
| Search bar | Client-side filter on document name |
| File type badge | `pdf / docx / txt / md` color-coded pill |
| Document stats | Page count + token count per file |
| Remove button | Calls `removeDocument(id)` on store |
| Upload button | Opens `UploadModal` |

---

### `components/layout/UploadModal.tsx`
| Element | Description |
|---|---|
| Dropzone | `dragover` / `dragleave` / `drop` events; accepts PDF |
| File input fallback | `<input type="file" accept=".pdf">` for click-to-browse |
| Progress bar | Animated fill driven by `onProgress` callback from `api.uploadDocument` |
| Alt sources | UI stubs for URL and paste input (not yet wired) |

---

### `components/chat/ChatPanel.tsx`
| Element | Description |
|---|---|
| Message log | Scrollable list of `Message` objects; auto-scrolls on new message |
| User bubble | Right-aligned, amber accent border |
| AI bubble | Left-aligned; renders formatted markdown with citation inline refs |
| Streaming | `updateLastAIMessage(token)` appended per SSE chunk; blinking cursor while `isStreaming` |
| Typing animation | `requestAnimationFrame`-based character reveal on AI messages |
| Source references | Expandable "Sources" section per AI message with page references |
| Highlight refs | `<highlight>` tags mapped to `.highlight-ref` CSS class for click-to-scroll |
| Action bar | Three buttons: **Summarize**, **Explain**, **Quiz** — call `generateContent()` |
| Input | `<textarea>` with auto-resize; Shift+Enter for newline, Enter to send |
| Abort | AbortController cancels in-flight streaming request on new send |

---

### `components/panel/RightPanel.tsx`
| Tab | Contents |
|---|---|
| **Notes** | Auto-generated notes list (`insight / tip / warning` tags); refresh + manual add button |
| **Graph** | Canvas-based knowledge graph with physics drift; renders `GraphNode[]` and `GraphEdge[]` |
| **Citations** | Paginated citation cards: doc name, page, excerpt |

> ⚠️ **Graph tab** currently uses placeholder node data. Real data from `GET /notebook/{id}/graph` is not yet wired.

---

### `components/ui/SettingsModal.tsx`
| Setting | Type |
|---|---|
| Theme | Radio: Dark / Light |
| Font size | Segmented: Small / Medium / Large — updates `fontSize` in store |
| User level | Mirror of navbar level toggle |

---

### `components/ui/Toast.tsx`
- Slide-in from right, auto-dismisses after 3 seconds
- Color-coded: `success` (green) · `error` (red) · `info` (amber)
- Triggered imperatively via a module-level `showToast(msg, type)` utility

---

## State Management — `store/appStore.ts`

Built with **Zustand v5** (single flat store, no slices).

| State slice | Type | Description |
|---|---|---|
| `theme` | `'dark' \| 'light'` | Synced to `data-theme` attribute + `localStorage` |
| `level` | `'beginner' \| 'student' \| 'expert'` | Passed as `audience_level` on every chat request |
| `sidebarOpen` | `boolean` | Toggled on mobile |
| `activeTab` | `'notes' \| 'graph' \| 'citations'` | Right panel active tab |
| `documents` | `MiniBookDocument[]` | Full document list; active doc flagged |
| `messages` | `Message[]` | Append-only chat log |
| `isLoading` | `boolean` | Disables input during streaming |
| `notes` | `Note[]` | Auto-generated + manual notes |
| `citations` | `Citation[]` | Extracted citations from last AI response |
| `fontSize` | `'sm' \| 'md' \| 'lg'` | Applied as CSS class on chat content |

Key streaming actions:
- `addMessage(msg)` — adds user or initial AI message
- `updateLastAIMessage(token)` — appends SSE token to last AI message
- `finalizeLastAIMessage(sources)` — marks streaming done, attaches sources

---

## API Layer — `lib/api.ts`

**Mock-first pattern:** every function checks `NEXT_PUBLIC_API_URL`. If set, hits real backend. If empty, returns mock data. The function signature and return type never change — only the internal branch.

| Function | Method | Endpoint | Status |
|---|---|---|---|
| `fetchDocuments()` | GET | `/documents` | Mock ✅ / Real 🔌 |
| `uploadDocument(file, onProgress)` | POST | `/ingest` | Mock ✅ / Real 🔌 |
| `streamQuery(req, signal)` | POST (SSE) | `/chat` | Mock ✅ / Real 🔌 |
| `generateContent(docId, type, level)` | POST | `/generate` | Mock ✅ / Stub 🔌 |

> **Note:** The real backend endpoint is `POST /ingest` (not `/upload`) and `POST /chat` (not `/query`). `api.ts` endpoint paths need updating when wiring to the live backend.

---

## Type System — `lib/types.ts`

All shared interfaces. These are the **API contract** between frontend and backend.

```
UserLevel       'beginner' | 'student' | 'expert'
Theme           'dark' | 'light'
NoteTag         'insight' | 'tip' | 'warning'
MessageRole     'user' | 'ai'
DocType         'pdf' | 'docx' | 'txt' | 'md'
ActionType      'summarize' | 'explain' | 'quiz' | 'mindmap'

MiniBookDocument  { id, name, type, size, pages, tokens, date, active }
Message           { id, role, content, timestamp, sources?, isStreaming? }
Source            { text, page, docName }
Note              { id, tag, text, createdAt? }
Citation          { id, doc, text, page }
QuizQuestion      { q, options[], correct }
GraphNode         { id, label, type, x, y }
GraphEdge         { source, target }

UploadResponse    { doc_id, name, pages, tokens }
QueryRequest      { query, doc_id, user_level }
QueryResponse     { answer, sources[] }
StreamChunk       { token?, done?, sources? }
GenerateResponse  { content: Note[] | QuizQuestion[] | string }
```

---

## Design System — "Cognitive Luxury"

### Typography
| Role | Font | Usage |
|---|---|---|
| Display / Headings | **Fraunces** (optical serif) | Titles, branding |
| Body / UI | **DM Sans** | All readable UI text |
| Code / Mono | **DM Mono** | Inline code, citations, IDs |

### Color Tokens
| Token | Dark | Light | Purpose |
|---|---|---|---|
| `--accent` | `#E8A838` | `#E8A838` | CTAs, highlights, borders |
| `--bg-base` | `#0E0F11` | `#F6F4EF` | Page background |
| `--bg-elevated` | `#14161A` | `#FDFCFA` | Navbar, sidebar, panels |
| `--bg-surface` | `#1C1F25` | `#FFFFFF` | Cards, inputs |
| `--text-primary` | `#F0EDE8` | `#1A1812` | Main text |
| `--text-secondary` | `#9FA3AD` | `#5A5650` | Supporting text |
| `--text-muted` | `#5C6270` | `#A09C96` | Labels, timestamps |

### Motion
| Name | Duration | Easing | Used for |
|---|---|---|---|
| Standard | `200ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | All interactive transitions |
| Slow | `400ms` | same | Theme switch, modal entrance |
| `fadeInUp` | `300ms` | ease-out | New messages, panels |
| `orbPulse` | `3s` | ease-in-out | Background orbs (decorative) |
| `typingBounce` | `1.4s` | ease-in-out | Loading dots |
| `shimmer` | `1.5s` | linear | Skeleton loaders |
| `slideInRight` | `250ms` | ease-out | Toast notifications |

### Shape & Spacing
- 8px grid throughout
- Border radii: `6px (sm)` · `10px (md)` · `16px (lg)` · `24px (xl)` · `9999px (pill)`

---

## Backend API Wiring Checklist

To connect the live FastAPI backend, update `lib/api.ts` and set `NEXT_PUBLIC_API_URL`:

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

| Frontend call | Current mock path | Real backend path | Notes |
|---|---|---|---|
| `fetchDocuments()` | `/documents` | `GET /notebook/{id}/documents` | Needs `notebook_id` param |
| `uploadDocument()` | `/upload` | `POST /ingest` | FormData: `file` + `notebook_id` |
| `streamQuery()` | `/query` | `POST /chat` | Add `notebook_id`, rename `user_level` → `audience_level` |
| `generateContent()` | `/generate` | _(not yet built)_ | Planned for Notes/Flashcards/MCQ |
| — | — | `GET /notebook/{id}/insights` | Wire to RightPanel Notes tab |
| — | — | `GET /notebook/{id}/graph` | Wire to RightPanel Graph tab |
| — | — | `GET /notebook/{id}/mindmap` | New — not yet in frontend |

---

## Known Gaps (from Production Readiness Report — 74%)

| Gap | Priority | Fix |
|---|---|---|
| No real streaming (typewriter runs on full string) | 🔴 High | Replace mock with `ReadableStream` / SSE consumer |
| Graph tab uses placeholder data | 🔴 High | Wire `GET /notebook/{id}/graph` → Canvas renderer |
| File upload sends no real `FormData` | 🔴 High | Update `uploadDocument()` to call `POST /ingest` |
| Canvas animation runs when tab inactive | 🟡 Medium | Add `visibilitychange` listener to pause loop |
| No virtual list for chat messages | 🟡 Medium | Add `react-window` or custom virtualization |
| No error boundaries | 🟡 Medium | Wrap each major panel in `<ErrorBoundary>` |
| Fonts loaded synchronously | 🟢 Low | Migrate to `next/font/google` |
| No accessibility audit | 🟢 Low | Run `axe-core`; fix modal focus traps |
