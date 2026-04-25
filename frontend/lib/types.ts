// ═══════════════════════════════════════════════════════════════
//  MINIBOOK LM — Shared TypeScript Interfaces
//  Single source of truth for the API contract.
//  Never remove existing interfaces — only add.
// ═══════════════════════════════════════════════════════════════

export type UserLevel = 'beginner' | 'student' | 'expert';
export type Theme = 'dark' | 'light';
export type NoteTag = 'insight' | 'tip' | 'warning';
export type MessageRole = 'user' | 'ai';
export type DocType = 'pdf' | 'docx' | 'txt' | 'md';
export type ActionType = 'summarize' | 'explain' | 'quiz' | 'mindmap';
export type ToastType = 'success' | 'error' | 'info';

// ── Document ────────────────────────────────────────────────────
export interface MiniBookDocument {
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

export interface QuizResponse {
  questions: QuizQuestion[];
  notebook_id: string;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
}

export interface FlashcardResponse {
  flashcards: Flashcard[];
  notebook_id: string;
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
  relationship?: string;
}

// ══════════════════════════════════════════════════════════════
//  API REQUEST / RESPONSE CONTRACTS
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
export type DocumentsResponse = MiniBookDocument[];

/** Generic API error */
export interface ApiError {
  error: string;
  code?: number;
}

/** Streaming chunk (SSE / simulated) */
export interface RetrievedChunk {
  text: string;
  source: string;
  page: number;
  similarity_score: number;
  used_in_answer: boolean;
}

export interface StreamChunk {
  token?: string;
  done?: boolean;
  sources?: Source[];
  retrieved_chunks?: RetrievedChunk[];
}

// ── Insights ─────────────────────────────────────────────────────
/** GET /notebook/{id}/insights */
export interface InsightsResponse {
  summary: string;
  key_topics: string[];
  suggested_questions: string[];
}

// ── Knowledge Graph ───────────────────────────────────────────────
/** GET /notebook/{id}/graph */
export interface GraphResponse {
  nodes: Omit<GraphNode, 'x' | 'y'>[];   // backend doesn't return coords; canvas assigns them
  edges: GraphEdge[];
  notebook_id: string;
}

// ── Mindmap ───────────────────────────────────────────────────────
/** GET /notebook/{id}/mindmap */
export interface MindmapNode {
  id: string;
  label: string;
  children: MindmapNode[];
}

export interface MindmapResponse {
  root: MindmapNode;
  notebook_id: string;
}

// ── Video Generation ──────────────────────────────────────────────
/** POST /notebook/{id}/video/generate */
export interface VideoGenerateRequest {
  audience_level: UserLevel;
}

export interface VideoGenerateResponse {
  job_id: string;
  topic:  string;
  status: string; // "processing"
}

/** GET /notebook/{id}/video/status/{job_id} */
export interface VideoStatusResponse {
  job_id:     string;
  status:     'processing' | 'completed' | 'failed';
  iframe_url: string | null;
}
