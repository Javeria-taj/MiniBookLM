You are a senior full-stack architect and product engineer.

Your task is to generate a production-ready Next.js monorepo project for a hackathon.

The product is an advanced AI knowledge platform inspired by NotebookLM but significantly better in usability, personalization, and actionability.

--------------------------------------

🎯 PRODUCT VISION:

Build an "AI Knowledge OS" where users can:
- Upload documents (PDF, text, notes)
- Chat with their documents using RAG
- Get explanations tailored to their level:
  - School
  - College
  - Masters
  - Professional (Engineer, Doctor, etc.)
- Convert knowledge into:
  - Notes
  - Flashcards
  - MCQs
  - Summaries
- Maintain context across sessions

This should feel like a premium product (Notion + ChatGPT + Perplexity combined).

--------------------------------------

🏗️ PROJECT STRUCTURE (MANDATORY):

Create a monorepo with 3 main folders:

/frontend  → Next.js (App Router)
/backend   → API server (Node.js / FastAPI)
/pipeline  → RAG pipeline (embeddings, chunking, retrieval)

--------------------------------------

📁 FRONTEND REQUIREMENTS (Next.js):

Tech:
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion

Structure:
- /app
  - /dashboard
  - /chat
  - /documents
- /components
- /lib
- /hooks

UI Layout:
- Left Sidebar:
  - Document list
  - Upload button
- Center:
  - Chat interface
- Right Sidebar:
  - Insights panel (summary, actions)

Topbar:
- User level selector
- Theme toggle
- Profile / settings

Features:
- Chat UI with streaming responses
- Highlight sources from documents
- Click → scroll to source
- Drag & drop file upload
- Tabs:
  - Chat
  - Notes
  - Flashcards
- Smooth animations
- Dark/light mode

--------------------------------------

🧠 BACKEND REQUIREMENTS:

Tech:
- Node.js (Express) OR FastAPI
- REST API

Endpoints:

POST /upload
- Accept file
- Return doc_id

POST /query
- Input: query, doc_id, user_level
- Output: answer + sources

POST /generate
- Input: doc_id, type (notes/flashcards/mcq)
- Output: structured content

GET /documents

--------------------------------------

🔍 PIPELINE (RAG SYSTEM):

Implement:

1. Document ingestion
2. Chunking (semantic chunks)
3. Embeddings (OpenAI / BGE)
4. Vector DB (FAISS / Pinecone / pgvector)
5. Retrieval
6. Prompt construction
7. LLM response

Structure:

/pipeline
- ingest.py / ingest.ts
- embed.py
- retrieve.py
- prompt_builder.py

--------------------------------------

🔗 FRONTEND ↔ BACKEND CONTRACT:

Define strict API schema:

Example:

POST /query

Request:
{
  "query": "Explain this topic",
  "doc_id": "abc123",
  "user_level": "college"
}

Response:
{
  "answer": "...",
  "sources": [
    { "text": "...", "page": 2 }
  ]
}

--------------------------------------

⚡ COLLABORATION STRATEGY (IMPORTANT):

This project is built by 2 developers:

Frontend Developer:
- Works on UI/UX
- Uses mocked API first
- Focus on experience

Backend Developer:
- Builds API + RAG pipeline
- Provides API contract early

Sync Rules:
- Define API schema BEFORE coding
- Use mock responses for frontend
- Daily sync:
  - What done
  - What next
  - Blockers

--------------------------------------

🌐 DEPLOYMENT:

Frontend:
- Deploy on Vercel

Backend:
- Deploy on Render

Environment variables:
- API keys
- Vector DB keys

--------------------------------------

💎 DIFFERENTIATION FEATURES:

1. Explain by level (dynamic prompt tuning)
2. Action mode (notes, flashcards, MCQs)
3. Context memory (store previous queries)

--------------------------------------

🎨 DESIGN SYSTEM:
-Name: "Cognitive Luxury"
Typography

Display/headings: Fraunces — an optical-size serif with italic elegance
Body/UI: DM Sans — clean, geometric, highly legible
Code/mono: DM Mono — for inline code and technical content

Color Palette
TokenDarkLightPurpose--accent#E8A838samePrimary amber gold — all CTAs, highlights--bg-base#0E0F11#F6F4EFPage background--bg-elevated#14161A#FDFCFANavbar, sidebar, panels--bg-surface#1C1F25#FFFFFFCards, inputs--text-primary#F0EDE8#1A1812Main readable text--text-secondary#9FA3AD#5A5650Supporting text--text-muted#5C6270#A09C96Labels, timestamps
Spacing & Shape

Border radii range from 6px (sm) → 10px (md) → 16px (lg) → 24px (xl) → 9999px (pill)
Consistent 8px spacing grid throughout

Motion

Standard transition: 200ms cubic-bezier(0.4, 0, 0.2, 1)
Slow transition: 400ms — used for theme switches and modal entrances
Keyframe animations: fadeInUp, orbPulse, typingBounce, shimmer, slideInRight

Component Patterns

Buttons: btn-primary (amber fill), btn-ghost (bordered), btn-sm, btn-xs
Modals: frosted glass overlay with backdrop-filter: blur(8px) + scale-in entrance
Toasts: slide-in from right, color-coded by success / error / info
Skeleton loaders: animated shimmer gradient for loading states

Theming is fully token-driven via CSS custom properties on [data-theme="dark"] and [data-theme="light"] — swapping the theme requires changing exactly one attribute on <html>.
--------------------------------------

📦 OUTPUT REQUIREMENTS:

Generate:
1. Full folder structure
2. Key files with code
3. Sample components
4. API implementation
5. RAG pipeline skeleton
6. Mock data for frontend

Code must be:
- Clean
- Modular
- Scalable
- Production-ready

--------------------------------------

🔥 IMPORTANT:

This should NOT look like a hackathon prototype.

It should look like:
"A startup product ready for funding"

Focus on:
- UX quality
- Clean architecture
- Developer experience