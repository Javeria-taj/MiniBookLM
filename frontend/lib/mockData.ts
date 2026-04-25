import type {
  LuminaDocument,
  Note,
  Citation,
  GraphNode,
  GraphEdge,
  QuizQuestion,
} from './types';

// ── Documents ────────────────────────────────────────────────────
export const MOCK_DOCS: LuminaDocument[] = [
  { id: '1', name: 'Research Paper on Neural Scaling Laws.pdf', type: 'pdf',  size: '2.3 MB', pages: 24, tokens: '18k', date: '2 hours ago', active: true  },
  { id: '2', name: 'Attention Is All You Need.pdf',              type: 'pdf',  size: '1.8 MB', pages: 15, tokens: '14k', date: 'Yesterday',  active: false },
  { id: '3', name: 'LLM Evaluation Benchmarks.docx',            type: 'docx', size: '0.9 MB', pages: 8,  tokens: '10k', date: '3 days ago', active: false },
];

// ── Notes ────────────────────────────────────────────────────────
export const MOCK_NOTES: Note[] = [
  { id: '1', tag: 'insight', text: 'Scaling laws suggest predictable performance improvements with compute, data, and model size increases.' },
  { id: '2', tag: 'tip',     text: 'The Transformer architecture eliminates recurrence entirely, relying solely on attention mechanisms.' },
  { id: '3', tag: 'insight', text: 'Benchmark saturation is a recurring challenge — models reach near-human performance, rendering tasks obsolete.' },
  { id: '4', tag: 'warning', text: 'Evaluation metrics may not capture real-world reasoning capabilities accurately.' },
];

// ── Citations ────────────────────────────────────────────────────
export const MOCK_CITATIONS: Citation[] = [
  { id: '1', doc: 'Neural Scaling Laws.pdf',          text: 'We observe that performance improves smoothly as we scale model size, dataset size, and the amount of compute used for training…', page: 'p. 3' },
  { id: '2', doc: 'Attention Is All You Need.pdf',    text: 'The Transformer follows an encoder-decoder structure using stacked self-attention and point-wise, fully connected layers for both…', page: 'p. 2' },
  { id: '3', doc: 'LLM Evaluation Benchmarks.docx',  text: 'The proliferation of benchmarks has created a fragmented evaluation landscape where leaderboard performance may not reflect downstream utility…', page: 'p. 5' },
];

// ── Graph ────────────────────────────────────────────────────────
export const MOCK_GRAPH_NODES: GraphNode[] = [
  { id: 'n1', label: 'Transformer',     type: 'concept',  x: 0.5,  y: 0.25 },
  { id: 'n2', label: 'Self-Attention',  type: 'concept',  x: 0.2,  y: 0.5  },
  { id: 'n3', label: 'Scaling Laws',   type: 'concept',  x: 0.8,  y: 0.5  },
  { id: 'n4', label: 'GPT',            type: 'entity',   x: 0.3,  y: 0.75 },
  { id: 'n5', label: 'BERT',           type: 'entity',   x: 0.65, y: 0.75 },
  { id: 'n6', label: 'Benchmarks',     type: 'relation', x: 0.85, y: 0.25 },
  { id: 'n7', label: 'Multi-Head Attn',type: 'concept',  x: 0.15, y: 0.3  },
  { id: 'n8', label: 'OpenAI',         type: 'entity',   x: 0.5,  y: 0.65 },
];

export const MOCK_GRAPH_EDGES: GraphEdge[] = [
  { source: 'n1', target: 'n2' }, { source: 'n1', target: 'n3' },
  { source: 'n1', target: 'n4' }, { source: 'n1', target: 'n5' },
  { source: 'n2', target: 'n7' }, { source: 'n3', target: 'n6' },
  { source: 'n4', target: 'n8' }, { source: 'n5', target: 'n8' },
  { source: 'n3', target: 'n8' }, { source: 'n7', target: 'n2' },
];

// ── Quiz Questions ───────────────────────────────────────────────
export const MOCK_QUIZ: QuizQuestion[] = [
  {
    q: 'According to the scaling laws paper, what three factors most influence model performance?',
    options: ['Architecture, Optimizer, Batch size', 'Model size, Dataset size, Compute', 'Attention heads, Layers, Width', 'Learning rate, Momentum, Weight decay'],
    correct: 1,
  },
  {
    q: 'What key architectural change did the Transformer introduce?',
    options: ['Replaced batch norm with layer norm', 'Eliminated recurrence in favor of attention', 'Added residual connections to CNNs', 'Used sparse attention exclusively'],
    correct: 1,
  },
  {
    q: 'What is "benchmark saturation" as described in the evaluation paper?',
    options: ['When a benchmark is too easy for humans', 'When models reach near-human performance, making the benchmark obsolete', 'When too many benchmarks exist for a single task', 'When benchmark data leaks into training'],
    correct: 1,
  },
];

// ── AI Responses by Level ────────────────────────────────────────
export const MOCK_RESPONSES: Record<string, Record<string, string[]> | string[]> = {
  beginner: [
    `Think of a **Transformer** like a super-smart reader who can look at all the words in a sentence at once, instead of reading one word at a time.\n\n<highlight>Scaling laws</highlight> basically mean: the bigger and smarter the AI, the better it gets — kind of like how practicing more makes you better at sports.\n\nWant me to explain any of this in a simpler way?`,
  ],
  student: [
    `Based on your documents, there are several key themes worth exploring.\n\n<highlight>Scaling laws</highlight> suggest that model performance improves predictably with increases in compute, data, and parameters — a finding consistently validated across multiple architectures.\n\nThe <highlight>Transformer architecture</highlight>, introduced in "Attention Is All You Need," represents a paradigm shift: by eliminating recurrence and relying entirely on attention mechanisms, it enabled massive parallelization during training.\n\nWould you like me to dive deeper into any of these areas?`,
    `Great question. Let me synthesize what your documents say about this.\n\nThe core insight across your sources is that **evaluation is fundamentally hard**. Benchmarks tend to get saturated as models improve, creating a treadmill effect.\n\nKey findings:\n- Models can achieve near-human performance while still failing at simple reasoning\n- <highlight>Few-shot prompting</highlight> dramatically changes evaluation dynamics\n- Capability ≠ reliability\n\nShall I generate a quiz to test your understanding?`,
  ],
  expert: [
    `The documents collectively argue that the field is entering a post-scaling phase. Rather than simply scaling compute, researchers are exploring **architectural innovations**, **better data curation**, and **alignment techniques**.\n\nOne particularly noteworthy passage discusses <highlight>emergent capabilities</highlight> — abilities that appear suddenly at certain model scales with no clear precedent at smaller parameter counts. The mechanism remains poorly understood: some attribute it to phase transitions in loss landscapes, others to evaluation methodology artifacts.\n\nThe implications for your research: if emergent capabilities are real rather than an artifact, then capability extrapolation from smaller models is fundamentally limited.`,
  ],
};

export const MOCK_SUMMARIZE = `## Summary\n\nYour three documents cover the theoretical and empirical foundations of large language models:\n\n**1. Neural Scaling Laws**\n- Performance scales as a power law with model size, data, and compute\n- Optimal allocation: if you double compute budget, scale model and data roughly equally\n- Emergent capabilities appear unpredictably at scale\n\n**2. Attention Is All You Need**\n- Introduced the Transformer: encoder-decoder with multi-head self-attention\n- Eliminated RNNs/convolutions, enabling full parallelization\n- Became the foundation for GPT, BERT, T5, and nearly every modern LLM\n\n**3. LLM Evaluation Benchmarks**\n- Benchmark saturation is a critical problem\n- Human-eval benchmarks are expensive and hard to standardize\n- A shift toward task-specific, long-horizon evaluations is underway`;

export const MOCK_EXPLAIN = `## Deep Explanation\n\n### What is self-attention?\n\nImagine you're reading: *"The cat sat on the mat because it was tired."* To understand what "it" refers to, your brain automatically weighs the relevance of every preceding word.\n\nSelf-attention formalizes this intuition mathematically. For each token, the model computes three vectors:\n- **Q** (Query): "What am I looking for?"\n- **K** (Key): "What do I contain?"\n- **V** (Value): "What do I actually output?"\n\nAttention scores = softmax(Q·Kᵀ / √dₖ) · V\n\n<highlight>Multi-head attention</highlight> runs this process in parallel with different learned projections, allowing the model to attend to information from different representation subspaces simultaneously.`;
