/* ══════════════════════════════════════════════════════════════
   LUMINA — AI Knowledge Workspace
   app.js — Core Application Logic
   ══════════════════════════════════════════════════════════════ */

'use strict';

/* ── STATE ──────────────────────────────────────────────────── */
const state = {
  theme: 'dark',
  level: 'student',
  messages: [],
  documents: [],
  notes: [],
  citations: [],
  isLoading: false,
  sidebarOpen: true,
  activeTab: 'notes',
  graphNodes: [],
  graphEdges: [],
};

/* ── MOCK DATA ──────────────────────────────────────────────── */
const MOCK_DOCS = [
  { id: 1, name: 'Research Paper on Neural Scaling Laws.pdf', type: 'pdf', size: '2.3 MB', pages: 24, tokens: '18k', date: '2 hours ago', active: true },
  { id: 2, name: 'Attention Is All You Need.pdf',              type: 'pdf', size: '1.8 MB', pages: 15, tokens: '14k', date: 'Yesterday', active: false },
  { id: 3, name: 'LLM Evaluation Benchmarks.docx',            type: 'docx', size: '0.9 MB', pages: 8,  tokens: '10k', date: '3 days ago', active: false },
];

const MOCK_NOTES = [
  { id: 1, tag: 'insight', text: 'Scaling laws suggest predictable performance improvements with compute, data, and model size increases.' },
  { id: 2, tag: 'tip',     text: 'The Transformer architecture eliminates recurrence entirely, relying solely on attention mechanisms.' },
  { id: 3, tag: 'insight', text: 'Benchmark saturation is a recurring challenge — models reach near-human performance, rendering tasks obsolete.' },
  { id: 4, tag: 'warning', text: 'Evaluation metrics may not capture real-world reasoning capabilities accurately.' },
];

const MOCK_CITATIONS = [
  { doc: 'Neural Scaling Laws.pdf', text: 'We observe that performance improves smoothly as we scale model size, dataset size, and the amount of compute used for training...', page: 'p. 3' },
  { doc: 'Attention Is All You Need.pdf', text: 'The Transformer follows an encoder-decoder structure using stacked self-attention and point-wise, fully connected layers for both...', page: 'p. 2' },
  { doc: 'LLM Evaluation Benchmarks.docx', text: 'The proliferation of benchmarks has created a fragmented evaluation landscape where leaderboard performance may not reflect downstream utility...', page: 'p. 5' },
];

const MOCK_GRAPH_NODES = [
  { id: 'n1',  label: 'Transformer',       type: 'concept',  x: 0.5,  y: 0.25 },
  { id: 'n2',  label: 'Self-Attention',    type: 'concept',  x: 0.2,  y: 0.5  },
  { id: 'n3',  label: 'Scaling Laws',      type: 'concept',  x: 0.8,  y: 0.5  },
  { id: 'n4',  label: 'GPT',               type: 'entity',   x: 0.3,  y: 0.75 },
  { id: 'n5',  label: 'BERT',              type: 'entity',   x: 0.65, y: 0.75 },
  { id: 'n6',  label: 'Benchmarks',        type: 'relation', x: 0.85, y: 0.25 },
  { id: 'n7',  label: 'Multi-Head Attn',   type: 'concept',  x: 0.15, y: 0.3  },
  { id: 'n8',  label: 'OpenAI',            type: 'entity',   x: 0.5,  y: 0.65 },
];

const MOCK_GRAPH_EDGES = [
  ['n1','n2'], ['n1','n3'], ['n1','n4'], ['n1','n5'],
  ['n2','n7'], ['n3','n6'], ['n4','n8'], ['n5','n8'],
  ['n3','n8'], ['n7','n2'],
];

/* ── MOCK AI RESPONSES ──────────────────────────────────────── */
const MOCK_RESPONSES = {
  default: [
    `Based on your documents, there are several key themes worth exploring.\n\n<highlight>Scaling laws</highlight> suggest that model performance improves predictably with increases in compute, data, and parameters — a finding consistently validated across multiple architectures.\n\nThe <highlight>Transformer architecture</highlight>, introduced in "Attention Is All You Need," represents a paradigm shift: by eliminating recurrence and relying entirely on attention mechanisms, it enabled massive parallelization during training.\n\nWould you like me to dive deeper into any of these areas?`,
    `Great question. Let me synthesize what your documents say about this.\n\nThe core insight across your sources is that **evaluation is fundamentally hard**. Benchmarks tend to get saturated as models improve, creating a treadmill effect where new, harder benchmarks must constantly be developed.\n\nKey findings from the papers:\n- Models can achieve near-human performance on many tasks while still failing at simple reasoning\n- <highlight>Few-shot prompting</highlight> dramatically changes evaluation dynamics\n- There is growing consensus that capability ≠ reliability\n\nShall I generate a quiz to test your understanding?`,
    `The documents collectively argue that the field is entering a new phase. Rather than simply scaling compute, researchers are exploring **architectural innovations**, **better data curation**, and **alignment techniques** to achieve more reliable and safe systems.\n\nOne particularly notable passage from the scaling laws paper discusses <highlight>emergent capabilities</highlight> — abilities that appear suddenly at certain model sizes, without any clear precedent at smaller scales. This remains one of the most actively debated phenomena in the field.`,
  ],
  summarize: `## Summary\n\nYour three documents cover the theoretical and empirical foundations of large language models:\n\n**1. Neural Scaling Laws**\n- Performance scales as a power law with model size, data, and compute\n- Optimal allocation: if you double compute budget, scale model and data roughly equally\n- Emergent capabilities appear unpredictably at scale\n\n**2. Attention Is All You Need**\n- Introduced the Transformer: encoder-decoder with multi-head self-attention\n- Eliminated RNNs/convolutions, enabling full parallelization\n- Became the foundation for GPT, BERT, T5, and nearly every modern LLM\n\n**3. LLM Evaluation Benchmarks**\n- Benchmark saturation is a critical problem\n- Human-eval benchmarks are expensive and hard to standardize\n- A shift toward task-specific, long-horizon evaluations is underway`,

  explain: `## Deep Explanation\n\n### What is self-attention?\n\nImagine you're reading: *"The cat sat on the mat because it was tired."* To understand what "it" refers to, your brain automatically weighs the relevance of every preceding word.\n\nSelf-attention formalizes this intuition mathematically. For each word (or token), the model computes three vectors:\n- **Q** (Query): "What am I looking for?"\n- **K** (Key): "What do I contain?"\n- **V** (Value): "What do I actually output?"\n\nAttention scores = softmax(Q·Kᵀ / √dₖ) · V\n\nThe result: every token can "look at" every other token, weighted by relevance. This is why Transformers capture long-range dependencies so much better than RNNs.\n\n<highlight>Multi-head attention</highlight> runs this process in parallel with different learned projections, allowing the model to attend to information from different representation subspaces simultaneously.`,

  quiz: 'QUIZ',

  mindmap: 'MINDMAP',
};

/* ── DOM REFERENCES ─────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const DOM = {
  html:             document.documentElement,
  chatMessages:     $('chatMessages'),
  chatInput:        $('chatInput'),
  sendBtn:          $('sendBtn'),
  chatWelcome:      $('chatWelcome'),
  sidebar:          $('sidebar'),
  sidebarToggle:    $('sidebarToggle'),
  sidebarDocs:      $('sidebarDocs'),
  docCount:         $('docCount'),
  tokenCount:       $('tokenCount'),
  notesList:        $('notesList'),
  citationsList:    $('citationsList'),
  rightPanel:       $('rightPanel'),
  settingsModal:    $('settingsModal'),
  uploadModal:      $('uploadModal'),
  openSettings:     $('openSettings'),
  closeSettings:    $('closeSettings'),
  openUpload:       $('openUpload'),
  closeUpload:      $('closeUpload'),
  themeToggleNav:   $('themeToggleNav'),
  darkThemeBtn:     $('darkThemeBtn'),
  lightThemeBtn:    $('lightThemeBtn'),
  dropzone:         $('dropzone'),
  fileInput:        $('fileInput'),
  browseFilesBtn:   $('browseFilesBtn'),
  uploadProgressList: $('uploadProgressList'),
  refreshNotes:     $('refreshNotes'),
  addNoteBtn:       $('addNoteBtn'),
  clearChatBtn:     $('clearChatBtn'),
  inputAttach:      $('inputAttach'),
  graphCanvas:      $('graphCanvas'),
  toastContainer:   $('toastContainer'),
  fontSizeSelect:   $('fontSizeSelect'),
};

/* ══════════════════════════════════════════════════════════════
   INITIALIZATION
══════════════════════════════════════════════════════════════ */
function init() {
  loadTheme();
  renderDocuments();
  renderNotes();
  renderCitations();
  bindEvents();
  autoResizeTextarea();
  // Short delay so the page paints before we draw the graph
  setTimeout(() => drawKnowledgeGraph(), 400);
}

/* ══════════════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════════════ */
function loadTheme() {
  const saved = localStorage.getItem('lumina-theme') || 'dark';
  setTheme(saved);
}

function setTheme(theme) {
  state.theme = theme;
  DOM.html.setAttribute('data-theme', theme);
  localStorage.setItem('lumina-theme', theme);

  // Sync settings modal buttons
  DOM.darkThemeBtn?.classList.toggle('active', theme === 'dark');
  DOM.lightThemeBtn?.classList.toggle('active', theme === 'light');

  // Redraw graph with new colours
  drawKnowledgeGraph();
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════ */
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  DOM.sidebar.classList.toggle('collapsed', !state.sidebarOpen);

  // Mobile backdrop
  const backdrop = document.querySelector('.sidebar-backdrop') || createBackdrop();
  backdrop.classList.toggle('visible', state.sidebarOpen && window.innerWidth < 680);
}

function createBackdrop() {
  const el = document.createElement('div');
  el.className = 'sidebar-backdrop';
  el.addEventListener('click', toggleSidebar);
  document.body.appendChild(el);
  return el;
}

/* ══════════════════════════════════════════════════════════════
   DOCUMENTS
══════════════════════════════════════════════════════════════ */
function renderDocuments() {
  const docs = state.documents.length ? state.documents : MOCK_DOCS;
  DOM.sidebarDocs.innerHTML = '';

  docs.forEach((doc) => {
    const el = document.createElement('div');
    el.className = `doc-item${doc.active ? ' active' : ''}`;
    el.setAttribute('role', 'listitem');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', doc.name);
    el.innerHTML = `
      <div class="doc-icon ${doc.type}">${doc.type.toUpperCase()}</div>
      <div class="doc-meta">
        <div class="doc-name" title="${doc.name}">${doc.name}</div>
        <div class="doc-info">${doc.size} · ${doc.tokens} tokens · ${doc.date}</div>
      </div>
      <div class="doc-actions">
        <button class="doc-action-btn" title="View document" aria-label="View document">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="doc-action-btn" title="Remove document" aria-label="Remove document">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        </button>
      </div>
    `;

    // Activate on click
    el.addEventListener('click', () => {
      $$('.doc-item').forEach(d => d.classList.remove('active'));
      el.classList.add('active');
      doc.active = true;
      showToast(`Switched to: ${doc.name}`, 'info');
    });

    // Remove button
    el.querySelector('[title="Remove document"]').addEventListener('click', (e) => {
      e.stopPropagation();
      el.style.animation = 'fadeInUp .25s ease reverse forwards';
      setTimeout(() => {
        el.remove();
        showToast('Document removed', 'info');
        updateDocStats();
      }, 250);
    });

    DOM.sidebarDocs.appendChild(el);
  });

  updateDocStats();
}

function updateDocStats() {
  const count = DOM.sidebarDocs.querySelectorAll('.doc-item').length;
  DOM.docCount.textContent = count;
}

/* ══════════════════════════════════════════════════════════════
   NOTES
══════════════════════════════════════════════════════════════ */
function renderNotes(animate = false) {
  DOM.notesList.innerHTML = '';
  const notes = state.notes.length ? state.notes : MOCK_NOTES;

  notes.forEach((note, i) => {
    const el = document.createElement('div');
    el.className = `note-card ${note.tag}`;
    el.style.animationDelay = animate ? `${i * 60}ms` : '0ms';
    el.innerHTML = `
      <span class="note-tag ${note.tag}">${tagEmoji(note.tag)} ${note.tag}</span>
      <p class="note-text">${note.text}</p>
    `;
    DOM.notesList.appendChild(el);
  });
}

function tagEmoji(tag) {
  return { insight: '✦', warning: '⚠', tip: '→' }[tag] || '•';
}

/* ══════════════════════════════════════════════════════════════
   CITATIONS
══════════════════════════════════════════════════════════════ */
function renderCitations() {
  DOM.citationsList.innerHTML = '';
  MOCK_CITATIONS.forEach((c) => {
    const el = document.createElement('div');
    el.className = 'citation-card';
    el.innerHTML = `
      <div class="citation-doc">📄 ${c.doc}</div>
      <div class="citation-text">"${c.text}"</div>
      <div class="citation-page">${c.page}</div>
    `;
    el.addEventListener('click', () => showToast(`Opening ${c.doc}…`, 'info'));
    DOM.citationsList.appendChild(el);
  });
}

/* ══════════════════════════════════════════════════════════════
   CHAT
══════════════════════════════════════════════════════════════ */
function sendMessage(text) {
  if (!text.trim() || state.isLoading) return;

  hideWelcome();
  appendMessage('user', text);
  DOM.chatInput.value = '';
  DOM.chatInput.style.height = 'auto';
  updateSendBtn();

  showTypingIndicator();

  // Simulate AI response delay (mock)
  const delay = 900 + Math.random() * 800;
  setTimeout(() => {
    removeTypingIndicator();
    const response = pickResponse('default');
    appendAIMessage(response);
  }, delay);
}

function appendMessage(role, content) {
  const wrap = document.createElement('div');
  wrap.className = `message ${role}`;

  const initials = role === 'ai' ? '✦' : 'JV';
  const timeStr  = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  wrap.innerHTML = `
    <div class="message-avatar">${initials}</div>
    <div class="message-body">
      <div class="message-bubble">${formatMessage(content)}</div>
      <div class="message-meta">
        <span class="message-time">${timeStr}</span>
        ${role === 'ai' ? `
          <div class="message-actions">
            <button class="message-action" title="Copy" onclick="copyMessage(this)">Copy</button>
            <button class="message-action" title="Regenerate" onclick="regenerate()">Regenerate</button>
            <button class="message-action" title="Save note" onclick="saveAsNote(this)">Save note</button>
          </div>` : ''}
      </div>
    </div>
  `;

  // Add source chips for AI messages
  if (role === 'ai') {
    const chips = document.createElement('div');
    chips.className = 'source-chips';
    const sources = getRandomSources();
    sources.forEach(s => {
      const chip = document.createElement('button');
      chip.className = 'source-chip';
      chip.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>${s}`;
      chip.addEventListener('click', () => showToast(`Viewing source: ${s}`, 'info'));
      chips.appendChild(chip);
    });
    wrap.querySelector('.message-body').appendChild(chips);
  }

  state.messages.push({ role, content });
  DOM.chatMessages.appendChild(wrap);
  scrollToBottom();
}

function appendAIMessage(rawText) {
  const wrap = document.createElement('div');
  wrap.className = 'message ai';

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  wrap.innerHTML = `
    <div class="message-avatar">✦</div>
    <div class="message-body">
      <div class="message-bubble typing-cursor"></div>
      <div class="message-meta">
        <span class="message-time">${timeStr}</span>
        <div class="message-actions">
          <button class="message-action" onclick="copyMessage(this)">Copy</button>
          <button class="message-action" onclick="regenerate()">Regenerate</button>
          <button class="message-action" onclick="saveAsNote(this)">Save note</button>
        </div>
      </div>
    </div>
  `;

  DOM.chatMessages.appendChild(wrap);
  scrollToBottom();

  // Typewriter effect
  typewriterEffect(wrap.querySelector('.message-bubble'), rawText, () => {
    // Add source chips after typing
    const chips = document.createElement('div');
    chips.className = 'source-chips';
    getRandomSources().forEach(s => {
      const chip = document.createElement('button');
      chip.className = 'source-chip';
      chip.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>${s}`;
      chip.addEventListener('click', () => showToast(`Viewing: ${s}`, 'info'));
      chips.appendChild(chip);
    });
    wrap.querySelector('.message-body').appendChild(chips);
    state.isLoading = false;
  });

  state.messages.push({ role: 'ai', content: rawText });
}

/* Typewriter effect — renders markdown-ish incrementally */
function typewriterEffect(el, text, onDone) {
  state.isLoading = true;
  el.classList.add('typing-cursor');
  el.innerHTML = '';

  const charsPerFrame = 3;
  let idx = 0;
  const raw = text;

  function tick() {
    if (idx >= raw.length) {
      el.classList.remove('typing-cursor');
      el.innerHTML = formatMessage(raw);
      scrollToBottom();
      if (onDone) onDone();
      return;
    }
    idx = Math.min(idx + charsPerFrame, raw.length);
    el.textContent = raw.slice(0, idx);
    scrollToBottom();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* Lightweight markdown → HTML formatter */
function formatMessage(text) {
  if (!text) return '';

  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Headers
    .replace(/^## (.*$)/gm, '<h3 style="font-family:var(--font-display);font-size:1rem;font-weight:600;margin:12px 0 6px;color:var(--text-primary)">$1</h3>')
    .replace(/^### (.*$)/gm, '<h4 style="font-size:.88rem;font-weight:600;margin:10px 0 4px;color:var(--text-primary)">$1</h4>')
    // Highlight tags
    .replace(/<highlight>(.*?)<\/highlight>/g, '<span class="highlight-ref">$1</span>')
    // List items
    .replace(/^- (.*$)/gm, '<li style="margin-left:16px;margin-bottom:3px">$1</li>')
    // Code inline
    .replace(/`(.*?)`/g, `<code style="font-family:var(--font-mono);font-size:.82em;background:var(--bg-overlay);padding:1px 5px;border-radius:3px;color:var(--accent)">$1</code>`)
    // Line breaks
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br>');
}

/* ── SPECIAL ACTION MESSAGES ────────────────────────────────── */
function handleAction(action) {
  hideWelcome();

  const prompts = {
    summarize: 'Generate a comprehensive summary of all my documents.',
    explain:   'Give me a deep explanation of the core concepts in my documents.',
    quiz:      'Generate a quiz to test my understanding.',
    mindmap:   'Create a visual mind map of the key concepts.',
  };

  appendMessage('user', prompts[action]);
  showTypingIndicator();

  const delay = 1000 + Math.random() * 600;
  setTimeout(() => {
    removeTypingIndicator();

    if (action === 'quiz')    { appendQuizMessage();    return; }
    if (action === 'mindmap') { appendMindmapMessage(); return; }

    appendAIMessage(MOCK_RESPONSES[action] || pickResponse('default'));
  }, delay);
}

function appendQuizMessage() {
  const questions = [
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
  ];

  const wrap = document.createElement('div');
  wrap.className = 'message ai';
  wrap.innerHTML = `
    <div class="message-avatar">✦</div>
    <div class="message-body"></div>
  `;

  const body = wrap.querySelector('.message-body');
  questions.forEach((q, qi) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.style.marginBottom = '10px';
    card.innerHTML = `
      <div class="quiz-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        Question ${qi + 1} of ${questions.length}
      </div>
      <div class="quiz-body">
        <p class="quiz-question">${q.q}</p>
        ${q.options.map((opt, oi) => `
          <button class="quiz-option" data-index="${oi}" data-correct="${q.correct}">${String.fromCharCode(65 + oi)}. ${opt}</button>
        `).join('')}
      </div>
    `;

    // Option click handler
    card.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', function () {
        const idx     = parseInt(this.dataset.index);
        const correct = parseInt(this.dataset.correct);
        const opts    = card.querySelectorAll('.quiz-option');
        opts.forEach(o => o.disabled = true);
        opts[correct].classList.add('correct');
        if (idx !== correct) this.classList.add('wrong');
        const msg = idx === correct ? '✓ Correct!' : `✗ The correct answer was: ${q.options[correct]}`;
        showToast(msg, idx === correct ? 'success' : 'error');
      });
    });

    body.appendChild(card);
  });

  DOM.chatMessages.appendChild(wrap);
  scrollToBottom();
  state.messages.push({ role: 'ai', content: '[Quiz generated]' });
}

function appendMindmapMessage() {
  const wrap = document.createElement('div');
  wrap.className = 'message ai';
  wrap.innerHTML = `
    <div class="message-avatar">✦</div>
    <div class="message-body">
      <div class="mindmap-card">
        <p style="font-weight:600;margin-bottom:10px;font-size:.88rem;color:var(--accent)">🗺 Mind Map — Core Concepts</p>
        <div class="mindmap-canvas-placeholder" id="mindmapPlaceholder">
          <svg width="100%" height="220" id="mindmapSVG" viewBox="0 0 400 220"></svg>
        </div>
      </div>
      <div class="message-meta" style="margin-top:8px">
        <span class="message-time">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
        <div class="message-actions">
          <button class="message-action">Export SVG</button>
          <button class="message-action">Expand</button>
        </div>
      </div>
    </div>
  `;
  DOM.chatMessages.appendChild(wrap);
  scrollToBottom();

  // Draw mini mind map
  setTimeout(() => drawMindmap(wrap.querySelector('#mindmapSVG')), 100);
  state.messages.push({ role: 'ai', content: '[Mind map generated]' });
}

/* Draw a simple SVG mindmap */
function drawMindmap(svg) {
  if (!svg) return;
  const cx = 200, cy = 110;
  const center = { label: 'LLMs', x: cx, y: cy };
  const branches = [
    { label: 'Transformers', x: 80,  y: 50,  color: '#E8A838' },
    { label: 'Scaling',      x: 320, y: 50,  color: '#60A5FA' },
    { label: 'Attention',    x: 60,  y: 160, color: '#A78BFA' },
    { label: 'Benchmarks',   x: 320, y: 160, color: '#4ADE80' },
    { label: 'GPT',          x: 185, y: 185, color: '#F87171' },
  ];

  let markup = ``;
  // Lines
  branches.forEach(b => {
    markup += `<line x1="${cx}" y1="${cy}" x2="${b.x}" y2="${b.y}" stroke="${b.color}" stroke-width="1.5" stroke-opacity=".5" stroke-dasharray="4 3"/>`;
  });
  // Center node
  markup += `<circle cx="${cx}" cy="${cy}" r="28" fill="var(--accent)" opacity=".15" stroke="var(--accent)" stroke-width="1.5"/>
  <text x="${cx}" y="${cy+4}" text-anchor="middle" font-family="var(--font-display)" font-size="11" fill="var(--accent)" font-weight="600">${center.label}</text>`;
  // Branch nodes
  branches.forEach(b => {
    const w = b.label.length * 6.5 + 16;
    markup += `<rect x="${b.x - w/2}" y="${b.y - 12}" width="${w}" height="24" rx="12" fill="${b.color}" opacity=".15" stroke="${b.color}" stroke-width="1.2"/>
    <text x="${b.x}" y="${b.y + 4}" text-anchor="middle" font-family="var(--font-body)" font-size="10" fill="${b.color}" font-weight="600">${b.label}</text>`;
  });

  svg.innerHTML = markup;
}

/* ── TYPING INDICATOR ───────────────────────────────────────── */
function showTypingIndicator() {
  removeTypingIndicator();
  const el = document.createElement('div');
  el.id = 'typingIndicator';
  el.className = 'message ai';
  el.innerHTML = `
    <div class="message-avatar">✦</div>
    <div class="message-body">
      <div class="typing-indicator">
        <div class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
        <span class="typing-label">Thinking…</span>
      </div>
    </div>
  `;
  DOM.chatMessages.appendChild(el);
  scrollToBottom();
}

function removeTypingIndicator() {
  $('typingIndicator')?.remove();
}

/* ── UTILITY ────────────────────────────────────────────────── */
function hideWelcome() {
  const w = $('chatWelcome');
  if (w) {
    w.style.animation = 'fadeInUp .3s ease reverse forwards';
    setTimeout(() => w.remove(), 300);
  }
}

function scrollToBottom() {
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

function pickResponse(type) {
  const pool = MOCK_RESPONSES[type];
  if (Array.isArray(pool)) return pool[Math.floor(Math.random() * pool.length)];
  return pool || MOCK_RESPONSES.default[0];
}

function getRandomSources() {
  const all = MOCK_DOCS.map(d => d.name.replace(/\.(pdf|docx|txt|md)$/i, ''));
  return all.sort(() => 0.5 - Math.random()).slice(0, 2);
}

/* ── MESSAGE ACTIONS ────────────────────────────────────────── */
window.copyMessage = function (btn) {
  const bubble = btn.closest('.message-body').querySelector('.message-bubble');
  navigator.clipboard?.writeText(bubble.textContent).then(() => showToast('Copied to clipboard', 'success'));
};

window.regenerate = function () {
  const msgs = $$('.message.ai');
  if (!msgs.length) return;
  const last = msgs[msgs.length - 1];
  last.style.animation = 'fadeInUp .3s ease reverse forwards';
  setTimeout(() => {
    last.remove();
    showTypingIndicator();
    setTimeout(() => {
      removeTypingIndicator();
      appendAIMessage(pickResponse('default'));
    }, 900);
  }, 300);
};

window.saveAsNote = function (btn) {
  const bubble = btn.closest('.message-body').querySelector('.message-bubble');
  const text   = bubble.textContent.slice(0, 140) + (bubble.textContent.length > 140 ? '…' : '');
  const note   = { id: Date.now(), tag: 'insight', text };
  state.notes.unshift(note);
  renderNotes(true);
  // Switch to notes tab
  activateTab('notes');
  showToast('Saved to Notes ✦', 'success');
};

/* ── CLEAR CHAT ─────────────────────────────────────────────── */
function clearChat() {
  $$('.message', DOM.chatMessages).forEach(m => m.remove());
  removeTypingIndicator();
  state.messages = [];

  // Re-add welcome screen
  const welcome = document.createElement('div');
  welcome.id = 'chatWelcome';
  welcome.className = 'chat-welcome';
  welcome.innerHTML = `
    <div class="welcome-orb"></div>
    <h1 class="welcome-title">What would you like<br /><em>to understand?</em></h1>
    <p class="welcome-sub">Upload documents and ask anything. Lumina grounds every answer in your sources.</p>
    <div class="welcome-chips">
      <button class="chip">What are the key findings?</button>
      <button class="chip">Summarize in 3 bullets</button>
      <button class="chip">What's the methodology?</button>
      <button class="chip">Compare the arguments</button>
    </div>
  `;
  DOM.chatMessages.appendChild(welcome);
  bindChipClicks(welcome);
  showToast('Chat cleared', 'info');
}

/* ══════════════════════════════════════════════════════════════
   KNOWLEDGE GRAPH (Canvas)
══════════════════════════════════════════════════════════════ */
let graphAnim = null;
let graphTime = 0;

function drawKnowledgeGraph() {
  const canvas = DOM.graphCanvas;
  if (!canvas) return;

  const container = canvas.parentElement;
  if (!container) return;

  const W = container.clientWidth  || 280;
  const H = container.clientHeight || 300;
  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  const isDark = state.theme === 'dark';

  const colorMap = {
    concept:  '#E8A838',
    entity:   '#60A5FA',
    relation: '#A78BFA',
  };

  const nodes = MOCK_GRAPH_NODES.map(n => ({
    ...n,
    px: n.x * W,
    py: n.y * H,
    r: n.type === 'concept' ? 18 : 14,
  }));

  // Simple physics: tiny wobble
  let offsets = nodes.map(() => ({ vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, ox: 0, oy: 0 }));

  function frame() {
    graphTime += 0.01;
    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 28) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (let gy = 0; gy < H; gy += 28) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // Drift
    offsets.forEach((o, i) => {
      o.ox = Math.sin(graphTime + i * 1.3) * 3.5;
      o.oy = Math.cos(graphTime + i * 0.9) * 3.5;
    });

    // Edges
    MOCK_GRAPH_EDGES.forEach(([a, b]) => {
      const nA = nodes.find(n => n.id === a);
      const nB = nodes.find(n => n.id === b);
      if (!nA || !nB) return;
      const oi = nodes.indexOf(nA), oj = nodes.indexOf(nB);
      const x1 = nA.px + offsets[oi].ox, y1 = nA.py + offsets[oi].oy;
      const x2 = nB.px + offsets[oj].ox, y2 = nB.py + offsets[oj].oy;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, colorMap[nA.type] + '60');
      grad.addColorStop(1, colorMap[nB.type] + '60');
      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Nodes
    nodes.forEach((n, i) => {
      const x = n.px + offsets[i].ox;
      const y = n.py + offsets[i].oy;
      const color = colorMap[n.type];

      // Glow
      const glow = ctx.createRadialGradient(x, y, 0, x, y, n.r * 2.5);
      glow.addColorStop(0, color + '30');
      glow.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(x, y, n.r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();

      // Circle
      ctx.beginPath(); ctx.arc(x, y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(20,22,26,.9)' : 'rgba(255,255,255,.9)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Label
      ctx.fillStyle = isDark ? '#F0EDE8' : '#1A1812';
      ctx.font = `${n.type === 'concept' ? '600' : '400'} 8.5px "DM Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, x, y);
    });

    graphAnim = requestAnimationFrame(frame);
  }

  if (graphAnim) cancelAnimationFrame(graphAnim);
  frame();
}

/* ══════════════════════════════════════════════════════════════
   FILE UPLOAD
══════════════════════════════════════════════════════════════ */
function handleFiles(files) {
  DOM.uploadProgressList.innerHTML = '';
  const validTypes = ['.pdf', '.docx', '.txt', '.md'];

  Array.from(files).forEach((file, i) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(ext)) {
      showToast(`Unsupported: ${file.name}`, 'error');
      return;
    }

    const item = document.createElement('div');
    item.className = 'upload-item';
    item.innerHTML = `
      <div class="upload-item-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <span class="upload-item-name">${file.name}</span>
      <div class="upload-item-bar"><div class="upload-item-fill" id="fill_${i}" style="width:0%"></div></div>
      <span class="upload-item-status" id="status_${i}">0%</span>
    `;
    DOM.uploadProgressList.appendChild(item);

    // Simulate upload progress
    simulateUpload(i, file, ext.replace('.', ''));
  });
}

function simulateUpload(idx, file, type) {
  let pct = 0;
  const fill   = $(`fill_${idx}`);
  const status = $(`status_${idx}`);

  const interval = setInterval(() => {
    pct += 8 + Math.random() * 12;
    if (pct >= 100) {
      pct = 100;
      clearInterval(interval);
      if (fill)   fill.style.width = '100%';
      if (status) { status.textContent = 'Done'; status.classList.add('done'); }

      // Add to document list
      const newDoc = {
        id:     Date.now() + idx,
        name:   file.name,
        type:   type,
        size:   (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        pages:  Math.floor(Math.random() * 20) + 5,
        tokens: Math.floor(Math.random() * 15 + 5) + 'k',
        date:   'Just now',
        active: false,
      };
      state.documents = [...(state.documents.length ? state.documents : MOCK_DOCS), newDoc];
      renderDocuments();
      showToast(`Processed: ${file.name}`, 'success');

      // Close modal after last file
      if (idx === Array.from(DOM.fileInput.files).length - 1 || idx === 0) {
        setTimeout(() => closeModal('uploadModal'), 1200);
      }
    } else {
      if (fill)   fill.style.width = `${pct}%`;
      if (status) status.textContent = `${Math.round(pct)}%`;
    }
  }, 80);
}

/* ══════════════════════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════════════════════ */
function openModal(id) {
  $(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  $(id)?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════════════
   TABS (right panel)
══════════════════════════════════════════════════════════════ */
function activateTab(tabName) {
  $$('.panel-tab').forEach(t => {
    const active = t.dataset.tab === tabName;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active);
  });
  $$('.panel-content').forEach(c => {
    c.classList.toggle('active', c.id === tabName + 'Content');
  });
  state.activeTab = tabName;
  if (tabName === 'graph') drawKnowledgeGraph();
}

/* ══════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════════════ */
function showToast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = { success: '✓', error: '✕', info: '✦' }[type] || '●';
  el.innerHTML = `<span style="font-weight:700;color:${type==='success'?'#4ADE80':type==='error'?'#F87171':'var(--accent)'}">${icon}</span>${message}`;
  DOM.toastContainer.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'slideOutRight .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/* ══════════════════════════════════════════════════════════════
   AUTO-RESIZE TEXTAREA
══════════════════════════════════════════════════════════════ */
function autoResizeTextarea() {
  DOM.chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    updateSendBtn();
  });
}

function updateSendBtn() {
  DOM.sendBtn.disabled = !DOM.chatInput.value.trim();
}

/* ══════════════════════════════════════════════════════════════
   EVENT BINDING
══════════════════════════════════════════════════════════════ */
function bindEvents() {
  /* Send message */
  DOM.sendBtn.addEventListener('click', () => sendMessage(DOM.chatInput.value));
  DOM.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(DOM.chatInput.value);
    }
  });

  /* Sidebar toggle */
  DOM.sidebarToggle.addEventListener('click', toggleSidebar);

  /* Action bar */
  $$('.action-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action));
  });

  /* Clear chat */
  DOM.clearChatBtn.addEventListener('click', clearChat);

  /* Chips (welcome screen) */
  bindChipClicks(document);

  /* Level toggle */
  $$('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.level = btn.dataset.level;
      showToast(`Level: ${btn.textContent}`, 'info');
    });
  });

  /* Panel tabs */
  $$('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });

  /* Theme toggle (navbar) */
  DOM.themeToggleNav.addEventListener('click', () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  /* Theme buttons (settings) */
  DOM.darkThemeBtn.addEventListener('click', () => setTheme('dark'));
  DOM.lightThemeBtn.addEventListener('click', () => setTheme('light'));

  /* Font size */
  DOM.fontSizeSelect.addEventListener('change', function () {
    const sizes = { sm: '13px', md: '15px', lg: '17px' };
    document.documentElement.style.fontSize = sizes[this.value] || '15px';
  });

  /* Settings modal */
  DOM.openSettings.addEventListener('click', () => openModal('settingsModal'));
  DOM.closeSettings.addEventListener('click', () => closeModal('settingsModal'));
  DOM.settingsModal.addEventListener('click', (e) => { if (e.target === DOM.settingsModal) closeModal('settingsModal'); });

  /* Upload modal */
  DOM.openUpload.addEventListener('click', () => { DOM.uploadProgressList.innerHTML = ''; openModal('uploadModal'); });
  DOM.closeUpload.addEventListener('click', () => closeModal('uploadModal'));
  DOM.uploadModal.addEventListener('click', (e) => { if (e.target === DOM.uploadModal) closeModal('uploadModal'); });

  /* Dropzone */
  DOM.browseFilesBtn.addEventListener('click', (e) => { e.stopPropagation(); DOM.fileInput.click(); });
  DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());
  DOM.dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') DOM.fileInput.click(); });

  DOM.fileInput.addEventListener('change', () => {
    if (DOM.fileInput.files.length) handleFiles(DOM.fileInput.files);
  });

  DOM.dropzone.addEventListener('dragover', (e) => { e.preventDefault(); DOM.dropzone.classList.add('drag-over'); });
  DOM.dropzone.addEventListener('dragleave', () => DOM.dropzone.classList.remove('drag-over'));
  DOM.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.dropzone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  /* Attach button shortcut */
  DOM.inputAttach.addEventListener('click', () => { DOM.uploadProgressList.innerHTML = ''; openModal('uploadModal'); });

  /* Notes refresh */
  DOM.refreshNotes.addEventListener('click', () => {
    DOM.notesList.innerHTML = '';
    showSkeletonNotes();
    setTimeout(() => { renderNotes(true); }, 1200);
    showToast('Notes refreshed ✦', 'success');
  });

  /* Add manual note */
  DOM.addNoteBtn.addEventListener('click', () => {
    const text = prompt('Enter your note:');
    if (text?.trim()) {
      state.notes.unshift({ id: Date.now(), tag: 'insight', text: text.trim() });
      renderNotes(true);
      showToast('Note added', 'success');
    }
  });

  /* Keyboard shortcut: Escape closes modals */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal('settingsModal');
      closeModal('uploadModal');
    }
    // Ctrl/Cmd+K focuses input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      DOM.chatInput.focus();
    }
  });

  /* Resize: redraw graph */
  window.addEventListener('resize', debounce(() => {
    drawKnowledgeGraph();
    // Auto-collapse sidebar on small screens
    if (window.innerWidth < 680 && state.sidebarOpen) {
      state.sidebarOpen = false;
      DOM.sidebar.classList.add('collapsed');
    }
  }, 200));
}

/* Chip clicks helper */
function bindChipClicks(ctx) {
  $$(`.chip`, ctx === document ? document : ctx).forEach(chip => {
    chip.addEventListener('click', () => sendMessage(chip.textContent));
  });
}

/* Skeleton notes placeholder */
function showSkeletonNotes() {
  for (let i = 0; i < 3; i++) {
    const el = document.createElement('div');
    el.className = 'note-card';
    el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.gap = '6px';
    el.innerHTML = `
      <div class="skeleton-line w-60" style="height:10px"></div>
      <div class="skeleton-line w-90"></div>
      <div class="skeleton-line w-75"></div>
    `;
    DOM.notesList.appendChild(el);
  }
}

/* ── DEBOUNCE UTILITY ───────────────────────────────────────── */
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);
