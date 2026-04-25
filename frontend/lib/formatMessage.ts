// Lightweight markdown → HTML formatter (matches original app.js logic)
export function formatMessage(text: string): string {
  if (!text) return '';
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // H2
    .replace(/^## (.*$)/gm, '<h3 style="font-family:var(--font-display);font-size:1rem;font-weight:600;margin:12px 0 6px;color:var(--text-primary)">$1</h3>')
    // H3
    .replace(/^### (.*$)/gm, '<h4 style="font-size:.88rem;font-weight:600;margin:10px 0 4px;color:var(--text-primary)">$1</h4>')
    // Highlight custom tags from AI
    .replace(/<highlight>(.*?)<\/highlight>/g, '<span class="highlight-ref">$1</span>')
    // List items
    .replace(/^- (.*$)/gm, '<li style="margin-left:16px;margin-bottom:3px">$1</li>')
    // Inline code
    .replace(/`(.*?)`/g, '<code style="font-family:var(--font-mono);font-size:.82em;background:var(--bg-overlay);padding:1px 5px;border-radius:3px;color:var(--accent)">$1</code>')
    // Double newline → paragraph
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    // Single newline
    .replace(/\n/g, '<br>');
}
