// Daily AI digest: GitHub Trending + ArXiv latest papers
// Cached at CDN edge for 1 hour

async function fetchGitHubTrending() {
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];
  const url = `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=8`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'personal-web-agent' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map(r => ({
    name: r.full_name,
    description: r.description?.slice(0, 100) || '',
    stars: r.stargazers_count,
    language: r.language || '',
    url: r.html_url,
  }));
}

async function fetchArxivPapers() {
  const q = encodeURIComponent('(llm OR agent OR rag OR diffusion) AND (cat:cs.AI OR cat:cs.LG OR cat:cs.CL)');
  const url = `https://export.arxiv.org/api/query?search_query=${q}&sortBy=submittedDate&sortOrder=descending&max_results=6`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1];
    const title   = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/\s+/g, ' ').trim() || '';
    const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/\s+/g, ' ').trim().slice(0, 160) || '';
    const url     = (e.match(/<id>(.*?)<\/id>/) || [])[1]?.trim() || '';
    const date    = (e.match(/<published>(.*?)<\/published>/) || [])[1]?.slice(0, 10) || '';
    const authors = [...e.matchAll(/<name>(.*?)<\/name>/g)].map(a => a[1]).slice(0, 2).join(', ');
    return { title, summary: summary + '…', url, date, authors };
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');

  try {
    const [github, papers] = await Promise.all([fetchGitHubTrending(), fetchArxivPapers()]);
    res.status(200).json({ github, papers, updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
