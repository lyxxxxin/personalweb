// Memory management: token budgeting + history trimming

// Rough estimate: ~1.5 chars per token for Chinese, ~4 for ASCII
function estimateTokens(messages) {
  return messages.reduce((sum, m) => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return sum + Math.ceil(text.length / 2.5);
  }, 0);
}

// Drop oldest user+assistant pairs until within budget
function trimHistory(history, budget = 3000) {
  let result = [...history];
  while (result.length > 2 && estimateTokens(result) > budget) {
    result.splice(0, 2);
  }
  return result;
}

module.exports = { estimateTokens, trimHistory };
