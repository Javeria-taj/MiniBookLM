// ═══════════════════════════════════════════════════════════════
//  LUMINA — API Layer
//  All functions here are mock-first. To connect to the real
//  backend, replace the mock logic inside each function body —
//  the function signatures and return types stay the same.
// ═══════════════════════════════════════════════════════════════

import type {
  QueryRequest,
  QueryResponse,
  UploadResponse,
  GenerateResponse,
  StreamChunk,
  UserLevel,
} from './types';
import {
  MOCK_DOCS,
  MOCK_RESPONSES,
  MOCK_SUMMARIZE,
  MOCK_EXPLAIN,
  MOCK_QUIZ,
  MOCK_NOTES,
} from './mockData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ── Helpers ──────────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── GET /documents ────────────────────────────────────────────────
export async function fetchDocuments() {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  }
  await delay(400);
  return MOCK_DOCS;
}

// ── POST /upload ─────────────────────────────────────────────────
// FormData stub — your teammate hooks `POST /upload` here.
export async function uploadDocument(
  file: File,
  onProgress: (pct: number) => void
): Promise<UploadResponse> {
  if (API_BASE) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  // Mock progress simulation
  return new Promise((resolve) => {
    let pct = 0;
    const tick = setInterval(() => {
      pct = Math.min(pct + 8 + Math.random() * 12, 100);
      onProgress(Math.round(pct));
      if (pct >= 100) {
        clearInterval(tick);
        resolve({
          doc_id: `doc_${Date.now()}`,
          name: file.name,
          pages: Math.floor(Math.random() * 20) + 5,
          tokens: `${Math.floor(Math.random() * 15 + 5)}k`,
        });
      }
    }, 80);
  });
}

// ── POST /query (SSE streaming) ──────────────────────────────────
// ReadableStream / SSE handler. When the real backend is ready,
// remove the mock branch and the real SSE parsing takes over.
export async function* streamQuery(
  req: QueryRequest,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
    if (!res.ok) throw new Error('Query failed');
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const chunk: StreamChunk = JSON.parse(line.slice(6));
            yield chunk;
          } catch {
            // malformed chunk — skip
          }
        }
      }
    }
    yield { done: true };
    return;
  }

  // ── Mock SSE simulation ──────────────────────────────────────
  await delay(700 + Math.random() * 500);

  const levelResponses = MOCK_RESPONSES[req.user_level] as string[];
  const fullText: string = Array.isArray(levelResponses)
    ? pickRandom(levelResponses)
    : (MOCK_RESPONSES.student as string[])[0];

  const chunkSize = 3;
  for (let i = 0; i < fullText.length; i += chunkSize) {
    if (signal?.aborted) return;
    yield { token: fullText.slice(i, i + chunkSize) };
    await delay(18);
  }
  yield {
    done: true,
    sources: [
      { text: 'Performance scales as a power law with model size…', page: 3, docName: 'Neural Scaling Laws.pdf' },
      { text: 'The Transformer follows an encoder-decoder structure…', page: 2, docName: 'Attention Is All You Need.pdf' },
    ],
  };
}

// ── POST /generate ────────────────────────────────────────────────
export async function generateContent(
  docId: string,
  type: QueryRequest['query'],
  level: UserLevel
): Promise<GenerateResponse> {
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, type, user_level: level }),
    });
    if (!res.ok) throw new Error('Generate failed');
    return res.json();
  }

  await delay(900 + Math.random() * 600);

  if (type === 'summarize') return { content: MOCK_SUMMARIZE };
  if (type === 'explain')   return { content: MOCK_EXPLAIN };
  if (type === 'quiz')      return { content: MOCK_QUIZ };
  return { content: MOCK_NOTES };
}
