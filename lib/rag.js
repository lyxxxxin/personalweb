// RAG: BM25-inspired semantic search over resume chunks
// Architecture: tokenize → TF scoring → tag boost → rank
// Swap-in point: replace score() with vector cosine similarity when an embedding API is available

const { CHUNKS } = require('../data/resume');

// Tokenize Chinese/English mixed text
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[，。！？、：；""''（）【】\s\n]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

// Term frequency in a document
function tf(term, tokens) {
  const count = tokens.filter(t => t.includes(term) || term.includes(t)).length;
  return count / (tokens.length || 1);
}

// BM25-style score between query and a chunk
function score(query, chunk) {
  const qTokens  = tokenize(query);
  const dTokens  = tokenize(chunk.text);
  const tagBoost = chunk.tags.some(tag =>
    qTokens.some(qt => tag.includes(qt) || qt.includes(tag))
  ) ? 1.5 : 1.0;

  const tfScore = qTokens.reduce((sum, qt) => sum + tf(qt, dTokens), 0);
  return tfScore * tagBoost;
}

// Return top-k relevant chunks for a query
function search(query, topK = 3) {
  return CHUNKS
    .map(chunk => ({ ...chunk, score: score(query, chunk) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { search };
