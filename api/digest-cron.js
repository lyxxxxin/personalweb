// Vercel Cron Job – runs daily at 9:00 AM (UTC+8 = 01:00 UTC)
// Schedule set in vercel.json: "0 1 * * *"
//
// Required env vars:
//   RESEND_API_KEY   – from resend.com (free: 3k emails/month)
//   DIGEST_EMAIL     – recipient address
//   CRON_SECRET      – any random string, set in Vercel + vercel.json CRON_SECRET

async function fetchGitHubTrending() {
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];
  const res = await fetch(
    `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=8`,
    { headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'personal-web-agent' } }
  );
  if (!res.ok) return [];
  const { items = [] } = await res.json();
  return items.map(r => ({
    name: r.full_name,
    description: r.description?.slice(0, 100) || '',
    stars: r.stargazers_count,
    language: r.language || '',
    url: r.html_url,
  }));
}

async function fetchArxivPapers() {
  const q = encodeURIComponent('(llm OR agent OR rag OR diffusion) AND (cat:cs.AI OR cat:cs.LG OR cat:cs.CL)');
  const res = await fetch(
    `https://export.arxiv.org/api/query?search_query=${q}&sortBy=submittedDate&sortOrder=descending&max_results=6`
  );
  if (!res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1];
    return {
      title:   (e.match(/<title>([\s\S]*?)<\/title>/)    || [])[1]?.replace(/\s+/g, ' ').trim() || '',
      summary: (e.match(/<summary>([\s\S]*?)<\/summary>/)|| [])[1]?.replace(/\s+/g, ' ').trim().slice(0, 200) + '…' || '',
      url:     (e.match(/<id>(.*?)<\/id>/)               || [])[1]?.trim() || '',
      date:    (e.match(/<published>(.*?)<\/published>/)  || [])[1]?.slice(0, 10) || '',
    };
  });
}

function buildEmailHTML(github, papers) {
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const ghRows = github.slice(0, 6).map(r => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #1e1e2e;">
        <a href="${r.url}" style="color:#a78bfa;font-weight:600;text-decoration:none;">${r.name}</a>
        ${r.language ? `<span style="margin-left:8px;font-size:11px;color:#64748b;background:#1e1e2e;padding:2px 6px;border-radius:4px;">${r.language}</span>` : ''}
        <br>
        <span style="color:#94a3b8;font-size:13px;">${r.description}</span>
        <br>
        <span style="color:#fbbf24;font-size:12px;">★ ${r.stars >= 1000 ? (r.stars/1000).toFixed(1)+'k' : r.stars}</span>
      </td>
    </tr>`).join('');

  const paperRows = papers.slice(0, 5).map(p => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #1e1e2e;">
        <span style="color:#64748b;font-size:11px;font-family:monospace;">${p.date}</span><br>
        <a href="${p.url}" style="color:#67e8f9;font-weight:500;text-decoration:none;">${p.title}</a><br>
        <span style="color:#94a3b8;font-size:13px;">${p.summary}</span>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="background:#06060f;color:#f1f5f9;font-family:system-ui,sans-serif;padding:32px;max-width:680px;margin:0 auto;">
  <h1 style="font-size:22px;margin-bottom:4px;">今日 AI 动态 🤖</h1>
  <p style="color:#64748b;font-size:13px;margin-bottom:32px;">${today} · 由 Agent 自动抓取</p>

  <h2 style="font-size:15px;color:#a78bfa;margin-bottom:12px;">🐙 GitHub Trending</h2>
  <table width="100%" cellpadding="0" cellspacing="0">${ghRows}</table>

  <h2 style="font-size:15px;color:#67e8f9;margin-top:32px;margin-bottom:12px;">📄 ArXiv 最新论文</h2>
  <table width="100%" cellpadding="0" cellspacing="0">${paperRows}</table>

  <p style="color:#334155;font-size:11px;margin-top:32px;border-top:1px solid #1e1e2e;padding-top:16px;">
    由 <a href="https://personalweb-eight-mocha.vercel.app" style="color:#475569;">龙雨欣个人网站</a> Agent 系统自动生成
  </p>
</body></html>`;
}

module.exports = async function handler(req, res) {
  // Vercel passes Authorization: Bearer <CRON_SECRET> for cron requests
  const auth = req.headers['authorization'];
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ skipped: true, reason: 'RESEND_API_KEY not set' });
  }

  try {
    const [github, papers] = await Promise.all([fetchGitHubTrending(), fetchArxivPapers()]);
    const html = buildEmailHTML(github, papers);

    // Send via Resend REST API (no SDK needed, lighter bundle)
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'digest@resend.dev',                         // Resend sandbox sender
        to:      [process.env.DIGEST_EMAIL || 'lyx8210@gmail.com'],
        subject: `今日 AI 动态 · ${new Date().toLocaleDateString('zh-CN')}`,
        html,
      }),
    });

    const result = await emailRes.json();
    res.status(200).json({ ok: true, github: github.length, papers: papers.length, email: result });
  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: err.message });
  }
};
