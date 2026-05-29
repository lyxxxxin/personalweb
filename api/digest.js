// Daily AI digest: GitHub Trending + ArXiv latest papers
// Two fetches run independently — one failing won't break the other

// Fetch with explicit timeout
function fetchWithTimeout(url, opts = {}, ms = 8000) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  return fetch(url, { ...opts, signal: ac.signal }).finally(() => clearTimeout(id));
}

async function fetchGitHubTrending() {
  try {
    const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];
    const res = await fetchWithTimeout(
      `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=8`,
      { headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'personal-web-agent' } }
    );
    if (!res.ok) return [];
    const { items = [] } = await res.json();
    return items.map(r => ({
      name:        r.full_name,
      description: r.description?.slice(0, 100) || '',
      stars:       r.stargazers_count,
      language:    r.language || '',
      url:         r.html_url,
    }));
  } catch (e) {
    console.error('GitHub fetch failed:', e.message);
    return [];
  }
}

async function fetchArxivPapers() {
  try {
    // Use simple category query — faster and more reliable than full-text search
    const res = await fetchWithTimeout(
      'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=8'
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    if (!entries.length) return [];

    return entries.map(m => {
      const e       = m[1];
      const title   = (e.match(/<title>([\s\S]*?)<\/title>/)     || [])[1]?.replace(/\s+/g, ' ').trim() || '';
      const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/\s+/g, ' ').trim().slice(0, 180) + '…' || '';
      const url     = (e.match(/<id>\s*(.*?)\s*<\/id>/)         || [])[1]?.trim() || '';
      const date    = (e.match(/<published>(.*?)<\/published>/)  || [])[1]?.slice(0, 10) || '';
      const authors = [...e.matchAll(/<name>(.*?)<\/name>/g)].map(a => a[1]).slice(0, 2).join(', ');
      return { title, summary, url, date, authors };
    }).filter(p => p.title && p.url);   // drop any malformed entries
  } catch (e) {
    console.error('ArXiv fetch failed:', e.message);
    return [];
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Only cache successful responses; never cache for > 1h
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');

  // Run independently so one failure doesn't kill the other
  const [github, papers] = await Promise.all([
    fetchGitHubTrending(),
    fetchArxivPapers(),
  ]);

  res.status(200).json({
    github,
    papers,
    updatedAt: new Date().toISOString(),
    meta: { githubCount: github.length, papersCount: papers.length },
  });
};
