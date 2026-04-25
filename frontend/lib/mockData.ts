/**
 * mockData.ts
 *
 * Provides static fallback / seed data used by:
 *   - /app/quiz/page.tsx       → MOCK_QUIZ
 *   - /app/mindmap/page.tsx    → MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES
 *
 * The main dashboard (RightPanel, ChatPanel) now uses real backend endpoints.
 * These mocks remain here for the standalone dedicated pages only.
 */

// ── Types (inlined to avoid circular imports) ─────────────────
export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

// ── Quiz data ─────────────────────────────────────────────────
export const MOCK_QUIZ: QuizQuestion[] = [
  {
    q: 'What is the primary architecture behind modern large language models?',
    options: ['Recurrent Neural Networks', 'Transformer', 'Convolutional Networks', 'Boltzmann Machines'],
    correct: 1,
  },
  {
    q: 'Which mechanism allows transformers to weigh the importance of different tokens?',
    options: ['Backpropagation', 'Gradient Descent', 'Self-Attention', 'Dropout'],
    correct: 2,
  },
  {
    q: 'What does "scaling law" refer to in the context of LLMs?',
    options: [
      'The number of layers in the model',
      'How performance improves predictably with more data, compute, and parameters',
      'The speed at which models are trained',
      'The size of the vocabulary used during tokenisation',
    ],
    correct: 1,
  },
  {
    q: 'GPT stands for:',
    options: [
      'General Processing Transformer',
      'Generative Pre-trained Transformer',
      'Graph-based Pre-training Technology',
      'Guided Probabilistic Training',
    ],
    correct: 1,
  },
  {
    q: 'BERT uses which training objective?',
    options: ['Next token prediction', 'Masked language modelling', 'Reward shaping', 'Contrastive learning'],
    correct: 1,
  },
];

// ── Knowledge graph nodes ─────────────────────────────────────
export const MOCK_GRAPH_NODES: GraphNode[] = [
  { id: 'n1', label: 'Transformer',       type: 'concept',  x: 0.50, y: 0.40 },
  { id: 'n2', label: 'Self-Attention',    type: 'concept',  x: 0.25, y: 0.25 },
  { id: 'n3', label: 'Scaling Laws',      type: 'concept',  x: 0.75, y: 0.25 },
  { id: 'n4', label: 'GPT',               type: 'entity',   x: 0.20, y: 0.65 },
  { id: 'n5', label: 'BERT',              type: 'entity',   x: 0.50, y: 0.72 },
  { id: 'n6', label: 'Benchmarks',        type: 'relation', x: 0.80, y: 0.65 },
  { id: 'n7', label: 'Multi-Head Attn',   type: 'concept',  x: 0.35, y: 0.10 },
  { id: 'n8', label: 'OpenAI',            type: 'entity',   x: 0.65, y: 0.10 },
];

// ── Knowledge graph edges ─────────────────────────────────────
export const MOCK_GRAPH_EDGES: GraphEdge[] = [
  { source: 'n1', target: 'n2' },
  { source: 'n1', target: 'n3' },
  { source: 'n1', target: 'n4' },
  { source: 'n1', target: 'n5' },
  { source: 'n2', target: 'n7' },
  { source: 'n4', target: 'n8' },
  { source: 'n3', target: 'n6' },
  { source: 'n5', target: 'n6' },
];
