// ═══════════════════════════════════════════════════════════════
//  LUMINA — Shared TypeScript Interfaces
//  Share these with the backend team immediately — these are the
//  API contract types that both sides must agree on.
// ═══════════════════════════════════════════════════════════════

export type UserLevel = 'beginner' | 'student' | 'expert';
export type Theme = 'dark' | 'light';
export type NoteTag = 'insight' | 'tip' | 'warning';
export type MessageRole = 'user' | 'ai';
export type DocType = 'pdf' | 'docx' | 'txt' | 'md';
export type ActionType = 'summarize' | 'explain' | 'quiz' | 'mindmap';
export type ToastType = 'success' | 'error' | 'info';

// ── Document ────────────────────────────────────────────────────
export interface LuminaDocument {
  id: string;
  name: string;
  type: DocType;
  size: string;
  pages: number;
  tokens: string;
  date: string;
  active: boolean;
}

// ── Message ─────────────────────────────────────────────────────
export interface Source {
  text: string;
  page: number | string;
  docName: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  sources?: Source[];
  isStreaming?: boolean;
}

// ── Note ────────────────────────────────────────────────────────
export interface Note {
  id: string;
  tag: NoteTag;
  text: string;
  createdAt?: Date;
}

// ── Citation ─────────────────────────────────────────────────────
export interface Citation {
  id: string;
  doc: string;
  text: string;
  page: string;
}

// ── Quiz ────────────────────────────────────────────────────────
export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

// ── Graph ───────────────────────────────────────────────────────
export type NodeType = 'concept' | 'entity' | 'relation';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

// ══════════════════════════════════════════════════════════════
//  API REQUEST / RESPONSE CONTRACTS
//  These are the typed shapes your teammate's backend must match.
// ══════════════════════════════════════════════════════════════

/** POST /upload */
export interface UploadRequest {
  file: File;
}
export interface UploadResponse {
  doc_id: string;
  name: string;
  pages: number;
  tokens: string;
}

/** POST /query */
export interface QueryRequest {
  query: string;
  doc_id: string;
  user_level: UserLevel;
}
export interface QueryResponse {
  answer: string;
  sources: Source[];
}

/** POST /generate */
export interface GenerateRequest {
  doc_id: string;
  type: 'notes' | 'flashcards' | 'mcq' | 'summary';
}
export interface GenerateResponse {
  content: Note[] | QuizQuestion[] | string;
}

/** GET /documents */
export type DocumentsResponse = LuminaDocument[];

/** Generic API error */
export interface ApiError {
  error: string;
  code?: number;
}

/** Streaming chunk (SSE) */
export interface StreamChunk {
  token?: string;
  done?: boolean;
  sources?: Source[];
}
