export function renderResourceMarkdown(text: string): string {
  // Parse :::callout and :::warn blocks first
  let html = text.replace(/:::callout ([^\n]+)\n([\s\S]*?):::/g, (_, title, content) =>
    `<div class="v2-callout"><b>${title.trim()}</b><p>${content.trim()}</p></div>`
  );
  html = html.replace(/:::warn ([^\n]+)\n([\s\S]*?):::/g, (_, title, content) =>
    `<div class="v2-warn"><b>${title.trim()}</b><p>${content.trim()}</p></div>`
  );
  // h2, h3
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  // bold, italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // ul/li — convert blocks of - lines to <ul>
  html = html.replace(/((?:^- .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  // paragraphs — blank-line separated
  const blocks = html.split(/\n\n+/);
  html = blocks.map(b => {
    b = b.trim();
    if (!b) return '';
    if (b.startsWith('<h') || b.startsWith('<ul') || b.startsWith('<div class="v2-')) return b;
    return `<p>${b.replace(/\n/g, ' ')}</p>`;
  }).filter(Boolean).join('\n');
  return html;
}
