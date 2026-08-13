const { chunkText, searchChunks, validateKnowledgeDocument } = require('../../src/services/blinkfy/knowledgeBaseService');

describe('Concierge knowledge base', () => {
  it('validates and chunks a source document', () => {
    expect(validateKnowledgeDocument({ title: 'Benefits', content: 'Remote work is available. ' })).toEqual({ title: 'Benefits', content: 'Remote work is available.' });
    expect(chunkText('Remote work is available. Benefits include health insurance.', 30)).toEqual(['Remote work is available.', 'Benefits include health insurance.']);
  });

  it('ranks matching chunks and returns no unsupported context', () => {
    const chunks = [{ content: 'Remote work is available.', position: 0 }, { content: 'The office is in Sao Paulo.', position: 1 }];
    expect(searchChunks(chunks, 'Is remote work available?')).toEqual([{ content: 'Remote work is available.', position: 0, score: 3 }]);
  });
});
