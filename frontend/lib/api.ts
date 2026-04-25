// ═══════════════════════════════════════════════════════════════
//  MINIBOOK LM — API Layer
//  All functions talk directly to the real FastAPI backend.
//  Base URL: process.env.NEXT_PUBLIC_API_URL
// ═══════════════════════════════════════════════════════════════

import type {
  QueryRequest,
  QueryResponse,
  UploadResponse,
  GenerateResponse,
  StreamChunk,
  UserLevel,
  MiniBookDocument,
  DocType,
  InsightsResponse,
  GraphResponse,
  MindmapResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

if (!API_BASE && typeof window !== 'undefined') {
  console.warn('[api] NEXT_PUBLIC_API_URL is not set — all requests will fail.');
}

// ── Internal helper ───────────────────────────────────────────────
async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.clone().json();
      if (body?.detail) detail = body.detail;
      else if (body?.error?.message) detail = body.error.message;
    } catch { /* non-JSON error body — use status string */ }
    throw new Error(`${label} failed: ${detail}`);
  }
}

// ── GET /notebook/{notebookId}/documents ─────────────────────────
export async function fetchDocuments(
  notebookId: string = 'default',
): Promise<MiniBookDocument[]> {
  const res = await fetch(`${API_BASE}/notebook/${notebookId}/documents`);
  await assertOk(res, 'fetchDocuments');
  const data = await res.json();

  // Map backend DocumentInfo → MiniBookDocument
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.documents ?? data).map((d: any): MiniBookDocument => ({
    id:     d.doc_id ?? d.id,
    name:   d.filename ?? d.name,
    type:   ((d.filename ?? d.name ?? '').split('.').pop()?.toLowerCase() ?? 'pdf') as DocType,
    size:   d.size ?? '—',
    pages:  d.pages ?? 0,
    tokens: d.chunk_count != null ? String(d.chunk_count) : (d.tokens ?? '—'),
    date:   d.uploaded_at ?? d.date ?? 'Unknown',
    active: false,
  }));
}

// ── POST /ingest ──────────────────────────────────────────────────
// Uses XMLHttpRequest so onProgress fires via xhr.upload.onprogress.
export function uploadDocument(
  file: File,
  onProgress?: (pct: number) => void,
  notebookId: string = 'default',
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('notebook_id', notebookId);

    xhr.open('POST', `${API_BASE}/ingest`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          // Map IngestResponse { doc_id, chunk_count, filename } → UploadResponse
          resolve({
            doc_id: data.doc_id,
            name:   data.filename ?? file.name,
            pages:  0,
            tokens: String(data.chunk_count ?? 0),
          });
        } catch {
          reject(new Error('uploadDocument: invalid JSON response'));
        }
      } else {
        let msg = `${xhr.status} ${xhr.statusText}`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.detail) msg = body.detail;
        } catch { /* ignore */ }
        reject(new Error(`uploadDocument failed: ${msg}`));
      }
    };

    xhr.onerror = () => reject(new Error('uploadDocument: network error'));
    xhr.onabort = () => reject(new Error('uploadDocument: aborted'));

    xhr.send(formData);
  });
}

// ── POST /chat ────────────────────────────────────────────────────
// Backend returns full JSON (no SSE). We yield two chunks to
// preserve the AsyncGenerator interface the store depends on.
export async function* streamQuery(
  req: QueryRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const body = {
    notebook_id:    req.doc_id,         // doc_id field used as notebook_id
    query:          req.query,
    history:        [],
    audience_level: req.user_level,     // maps user_level → audience_level
    doc_id:         null,
  };

  const res = await fetch(`${API_BASE}/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal,
  });
  await assertOk(res, 'streamQuery');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();

  // Yield the answer text as a single token so the typewriter effect still works
  yield { token: data.answer ?? '', done: false };

  // Map backend citations → Source[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sources = (data.citations ?? []).map((c: any) => ({
    text:    c.text ?? '',
    page:    c.page ?? 0,
    docName: c.source ?? '',
  }));

  yield {
    done:             true,
    sources,
    retrieved_chunks: data.retrieved_chunks ?? [],
  };
}

// ── POST /generate ────────────────────────────────────────────────
// Not yet implemented in the backend — kept for type compatibility.
export async function generateContent(
  docId: string,
  type: QueryRequest['query'],
  level: UserLevel,
): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ doc_id: docId, type, user_level: level }),
  });
  await assertOk(res, 'generateContent');
  return res.json();
}

// ── GET /notebook/{notebookId}/insights ──────────────────────────
export async function fetchInsights(
  notebookId: string,
): Promise<InsightsResponse> {
  const res = await fetch(`${API_BASE}/notebook/${notebookId}/insights`);
  await assertOk(res, 'fetchInsights');
  return res.json();
}

// ── GET /notebook/{notebookId}/graph ─────────────────────────────
export async function fetchGraph(
  notebookId: string,
): Promise<GraphResponse> {
  const res = await fetch(`${API_BASE}/notebook/${notebookId}/graph`);
  await assertOk(res, 'fetchGraph');
  return res.json();
}

// ── GET /notebook/{notebookId}/mindmap ───────────────────────────
export async function fetchMindmap(
  notebookId: string,
): Promise<MindmapResponse> {
  const res = await fetch(`${API_BASE}/notebook/${notebookId}/mindmap`);
  await assertOk(res, 'fetchMindmap');
  return res.json();
}
