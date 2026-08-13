function validateKnowledgeDocument(body = {}) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!title) throw new Error('title is required');
  if (!content) throw new Error('content is required');
  if (title.length > 200) throw new Error('title must be 200 characters or fewer');
  if (content.length > 100000) throw new Error('content must be 100000 characters or fewer');
  return { title, content };
}

function chunkText(content, maxLength = 1000) {
  const sentences = content.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxLength) { chunks.push(current); current = ''; }
    current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [content];
}

function tokens(value) { return new Set(String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{3,}/g) || []); }

function searchChunks(chunks, query, limit = 3) {
  const queryTokens = tokens(query);
  return chunks.map((chunk) => {
    const score = [...tokens(chunk.content)].reduce((total, token) => total + (queryTokens.has(token) ? 1 : 0), 0);
    return { ...chunk, score };
  }).filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score || a.position - b.position).slice(0, limit);
}

module.exports = { validateKnowledgeDocument, chunkText, searchChunks };
