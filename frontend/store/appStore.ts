import { create } from 'zustand';
import type {
  MiniBookDocument,
  Message,
  Note,
  Citation,
  Theme,
  UserLevel,
} from '@/lib/types';
import { MOCK_DOCS, MOCK_NOTES, MOCK_CITATIONS } from '@/lib/mockData';

interface AppState {
  // Theme
  theme: Theme;
  setTheme: (t: Theme) => void;

  // User level
  level: UserLevel;
  setLevel: (l: UserLevel) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Active right panel tab
  activeTab: 'notes' | 'graph' | 'citations';
  setActiveTab: (tab: 'notes' | 'graph' | 'citations') => void;

  // Documents
  documents: MiniBookDocument[];
  setDocuments: (docs: MiniBookDocument[]) => void;
  addDocument: (doc: MiniBookDocument) => void;
  removeDocument: (id: string) => void;
  setActiveDocument: (id: string) => void;

  // Messages
  messages: Message[];
  addMessage: (msg: Message) => void;
  updateLastAIMessage: (token: string) => void;
  finalizeLastAIMessage: (sources: Message['sources']) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setLoading: (v: boolean) => void;

  // Notes
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;

  // Citations
  citations: Citation[];
  setCitations: (citations: Citation[]) => void;

  // Font size
  fontSize: 'sm' | 'md' | 'lg';
  setFontSize: (s: 'sm' | 'md' | 'lg') => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Theme — read from localStorage if available
  theme: 'dark',
  setTheme: (t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('minibook-theme', t);
    set({ theme: t });
  },

  // Level
  level: 'student',
  setLevel: (l) => set({ level: l }),

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Tabs
  activeTab: 'notes',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Documents
  documents: MOCK_DOCS,
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) =>
    set((s) => ({
      documents: [
        ...s.documents.map((d) => ({ ...d, active: false })),
        { ...doc, active: true },
      ],
    })),
  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
  setActiveDocument: (id) =>
    set((s) => ({
      documents: s.documents.map((d) => ({ ...d, active: d.id === id })),
    })),

  // Messages
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastAIMessage: (token) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'ai') {
        msgs[msgs.length - 1] = { ...last, content: last.content + token };
      }
      return { messages: msgs };
    }),
  finalizeLastAIMessage: (sources) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'ai') {
        msgs[msgs.length - 1] = { ...last, isStreaming: false, sources };
      }
      return { messages: msgs };
    }),
  clearMessages: () => set({ messages: [] }),
  isLoading: false,
  setLoading: (v) => set({ isLoading: v }),

  // Notes
  notes: MOCK_NOTES,
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),

  // Citations
  citations: MOCK_CITATIONS,
  setCitations: (citations) => set({ citations }),

  // Font size
  fontSize: 'md',
  setFontSize: (s) => set({ fontSize: s }),
}));
