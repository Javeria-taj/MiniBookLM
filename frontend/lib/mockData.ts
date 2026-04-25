/**
 * mockData.ts — DEPRECATED
 *
 * All mock data has been removed. The app now uses real backend data only:
 *   - Documents   → POST /ingest → addDocument()
 *   - Notes       → "SAVE INSIGHT" button → addNote()
 *   - Citations   → POST /chat done chunk → setCitations()
 *   - Graph       → GET /notebook/{id}/graph
 *   - Mindmap     → GET /notebook/{id}/mindmap
 *   - Insights    → GET /notebook/{id}/insights
 *   - Video       → POST /notebook/{id}/video/generate
 *
 * This file is kept as an empty module to avoid breaking any
 * residual imports during cleanup. It can be deleted once all
 * imports referencing it are confirmed gone.
 */

export {};
