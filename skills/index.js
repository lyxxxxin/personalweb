// Skill registry loader – register all skills here
// To add a new skill: create the file, import it, call registry.register()

const { SkillRegistry } = require('../lib/skill-registry');
const { RESUME }        = require('../data/resume');
const rag               = require('../lib/rag');

// ── Resume skills (static data + RAG) ────────────────────────────────

const searchResume = {
  name: 'search_resume',
  description: '语义搜索简历内容，适合模糊问题：优化、亮点、经历、技术等',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string', description: '用户问题或关键词' } },
    required: ['query'],
  },
  execute: ({ query }) => {
    const hits = rag.search(query, 3);
    if (!hits.length) return { message: '未找到相关内容' };
    return hits.map(({ id, tags, text, score }) => ({ id, relevance: score.toFixed(3), text }));
  },
};

const getProjectDetails = {
  name: 'get_project_details',
  description: '获取特定项目的详细信息',
  parameters: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        enum: ['es_vector_search', 'suggest_stability', 'hot_list', 'memory_agent'],
        description: 'es_vector_search / suggest_stability / hot_list / memory_agent',
      },
    },
    required: ['project'],
  },
  execute: ({ project }) => RESUME.projects[project] || { error: 'not found' },
};

const getSkills = {
  name: 'get_skills',
  description: '获取技能栈，可按分类查询',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['backend', 'storage', 'search', 'ai', 'all'],
      },
    },
  },
  execute: ({ category } = {}) =>
    !category || category === 'all' ? RESUME.skills : { [category]: RESUME.skills[category] },
};

const getContactInfo = {
  name: 'get_contact_info',
  description: '获取联系方式和求职状态',
  parameters: { type: 'object', properties: {} },
  execute: () => RESUME.basic,
};

// ── External API skills ───────────────────────────────────────────────

const getGithubTrending = {
  name: 'get_github_trending',
  description: '获取 GitHub 近期最热门的开源项目（实时）',
  parameters: {
    type: 'object',
    properties: {
      language: { type: 'string', description: '编程语言筛选，留空表示全部' },
    },
  },
  execute: async ({ language } = {}) => {
    const since     = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];
    const langPart  = language ? `+language:${language}` : '';
    const url       = `https://api.github.com/search/repositories?q=created:>${since}${langPart}&sort=stars&order=desc&per_page=6`;
    const res       = await fetch(url, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'personal-web-agent' },
    });
    if (!res.ok) return { error: `GitHub API ${res.status}` };
    const { items = [] } = await res.json();
    return items.map(r => ({
      name: r.full_name, description: r.description?.slice(0, 120),
      stars: r.stargazers_count, language: r.language, url: r.html_url,
    }));
  },
};

const getAiPapers = {
  name: 'get_ai_papers',
  description: '获取 ArXiv 最新 AI/ML 论文（实时）',
  parameters: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: '搜索主题，如 llm agent, rag, vector search' },
    },
  },
  execute: async ({ topic } = {}) => {
    const q   = encodeURIComponent(`(${topic || 'llm agent'}) AND (cat:cs.AI OR cat:cs.LG OR cat:cs.CL)`);
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=${q}&sortBy=submittedDate&sortOrder=descending&max_results=5`
    );
    if (!res.ok) return { error: 'ArXiv API error' };
    const xml = await res.text();
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
      const e = m[1];
      return {
        title:   (e.match(/<title>([\s\S]*?)<\/title>/)     || [])[1]?.replace(/\s+/g, ' ').trim(),
        summary: (e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/\s+/g, ' ').trim().slice(0, 200) + '…',
        url:     (e.match(/<id>(.*?)<\/id>/)               || [])[1]?.trim(),
        date:    (e.match(/<published>(.*?)<\/published>/)  || [])[1]?.slice(0, 10),
      };
    });
  },
};

// ── Build and export registry ─────────────────────────────────────────

function createRegistry() {
  const registry = new SkillRegistry();
  registry.register(
    searchResume,
    getProjectDetails,
    getSkills,
    getContactInfo,
    getGithubTrending,
    getAiPapers,
  );
  return registry;
}

// Display labels for the chat UI
const SKILL_DISPLAY = {
  search_resume:       '检索简历内容',
  get_project_details: '查询项目详情',
  get_skills:          '查询技能栈',
  get_contact_info:    '获取联系方式',
  get_github_trending: '拉取 GitHub Trending',
  get_ai_papers:       '搜索 ArXiv 论文',
};

module.exports = { createRegistry, SKILL_DISPLAY };
