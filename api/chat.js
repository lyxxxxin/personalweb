const OpenAI = require('openai');

// ===== STATIC RESUME DATA =====
const RESUME = {
  basic: {
    name: '龙雨欣', nameEn: 'Long Yuxin', title: '后端开发工程师',
    experience: '2年', email: 'lyx8210@gmail.com', phone: '18452480832',
    status: '正在寻找后端开发 / AI Agent 相关岗位',
  },
  education: [
    { school: '四川大学', degree: '硕士', major: '计算机技术', period: '2021-2024',
      honors: ['GPA 3.4/4.0', '二等奖学金（前 10%）', '优秀助教'] },
    { school: '江苏大学', degree: '本科', major: '高分子材料与工程', period: '2016-2020',
      honors: ['三等奖学金', '优秀团干部'] },
  ],
  experience: [{
    company: '美团', dept: '搜索推荐技术部', role: '软件开发工程师', period: '2024.08—至今',
    highlights: [
      '主 R 闪购搜索产品需求，独立承担技术方案设计',
      '在兜底容灾、索引优化等方向有实质性贡献',
      '推动兜底降级机制落地，提升大促高压场景下服务可用性',
    ],
    techs: ['Java', 'Elasticsearch', 'Redis', 'Thrift', 'Kafka', '向量检索'],
  }],
  projects: {
    vector_index: {
      name: '向量索引稳定性建设与召回性能优化',
      highlights: [
        '新增 Thrift 协议，减少序列化开销',
        '定制 ES 插件将 IVF-PQ+REFINE 下沉服务端，消除跨机房往返损耗',
        '搭建 IVF-PQ 全生命周期保障体系（预热、质量校验、异常自动回滚）',
      ],
      techs: ['IVF-PQ', 'Elasticsearch', 'Thrift', 'Redis'],
    },
    suggest_stability: {
      name: '搜索 Suggest 稳定性建设',
      highlights: [
        'Redis 缓存 + FST 离线索引兜底方案，基于 Lucene 构建',
        '滑动窗口监控空结果率，分业务动态阈值 + 自动降级',
        '覆盖主搜、闪购、医药等全业务场景',
      ],
      metrics: { qps: '2000+ 单机极限 QPS', latency: '平均 3.2ms', tp999: 'TP999 7ms' },
      techs: ['FST', 'Lucene', 'Redis', '多级降级'],
    },
    hot_list: {
      name: '闪购热榜建设',
      highlights: [
        '多热源架构，接入 Hyper 多数据源',
        '跨数据源聚合融合 + 敏感词过滤 + 动态拦截',
        'Redis 按城市缓存热度快照，保障热度展示一致性',
      ],
      techs: ['Redis', '多源召回', '排序融合'],
    },
  },
  skills: {
    backend: ['Java', '微服务', 'Thrift/RPC', '多线程', 'JVM', 'Spring Boot'],
    storage: ['Redis', 'MySQL (InnoDB/索引/事务)', 'Kafka'],
    search: ['Elasticsearch', '向量检索', 'IVF/IVF-PQ', 'Lucene/FST', '离线索引'],
    ai: ['Python', 'PyTorch', 'LLM', 'Agent'],
  },
};

// ===== TOOLS =====
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_resume',
      description: '语义搜索简历内容，适合模糊问题如"你做过什么优化"、"有什么亮点"',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '用户问题关键词' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_project_details',
      description: '获取特定项目的详细信息',
      parameters: {
        type: 'object',
        properties: {
          project: {
            type: 'string',
            enum: ['vector_index', 'suggest_stability', 'hot_list'],
            description: 'vector_index/suggest_stability/hot_list',
          },
        },
        required: ['project'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_skills',
      description: '获取技能栈',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['backend', 'storage', 'search', 'ai', 'all'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_info',
      description: '获取联系方式和求职状态',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_github_trending',
      description: '获取当前 GitHub 上最热门的开源项目（实时数据）',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', description: '编程语言筛选，如 python, java，留空表示全部' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ai_papers',
      description: '获取 ArXiv 最新 AI/ML 论文（实时数据）',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: '搜索主题，如 llm agent, rag, vector search' },
        },
      },
    },
  },
];

// ===== TOOL NAMES FOR UI DISPLAY =====
const TOOL_DISPLAY = {
  search_resume:       '检索简历内容',
  get_project_details: '查询项目详情',
  get_skills:          '查询技能栈',
  get_contact_info:    '获取联系方式',
  get_github_trending: '拉取 GitHub Trending',
  get_ai_papers:       '搜索 ArXiv 论文',
};

// ===== TOOL EXECUTORS =====

function searchResume(query) {
  const q = query.toLowerCase();
  const results = [];

  // Simple keyword match across all resume sections
  if (q.match(/工作|美团|经历|职|搜索推荐/))
    results.push({ section: 'experience', data: RESUME.experience });
  if (q.match(/项目|优化|稳定性|向量|suggest|热榜/))
    results.push({ section: 'projects', data: Object.values(RESUME.projects) });
  if (q.match(/技能|会|熟悉|java|redis|es|kafka|python/))
    results.push({ section: 'skills', data: RESUME.skills });
  if (q.match(/教育|学校|大学|学历|gpa/))
    results.push({ section: 'education', data: RESUME.education });

  return results.length > 0 ? results : { section: 'all', data: RESUME };
}

async function fetchGitHubTrending(language) {
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().split('T')[0];
  const langFilter = language ? `+language:${language}` : '';
  const url = `https://api.github.com/search/repositories?q=created:>${since}${langFilter}&sort=stars&order=desc&per_page=6`;

  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'personal-web-agent' },
  });

  if (!res.ok) return { error: `GitHub API error: ${res.status}` };

  const data = await res.json();
  return (data.items || []).map(r => ({
    name: r.full_name,
    description: r.description?.slice(0, 120),
    stars: r.stargazers_count,
    language: r.language,
    url: r.html_url,
  }));
}

async function fetchArxivPapers(topic) {
  const q = encodeURIComponent(`(${topic || 'llm agent'}) AND (cat:cs.AI OR cat:cs.LG OR cat:cs.CL)`);
  const url = `https://export.arxiv.org/api/query?search_query=${q}&sortBy=submittedDate&sortOrder=descending&max_results=5`;

  const res = await fetch(url);
  if (!res.ok) return { error: 'ArXiv API error' };

  const xml = await res.text();

  // Parse entries from XML without external lib
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const entry = m[1];
    const title   = (entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/\s+/g, ' ').trim();
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.replace(/\s+/g, ' ').trim().slice(0, 200);
    const id      = (entry.match(/<id>(.*?)<\/id>/) || [])[1]?.trim();
    const date    = (entry.match(/<published>(.*?)<\/published>/) || [])[1]?.slice(0, 10);
    return { title, summary: summary + '…', url: id, published: date };
  });

  return entries;
}

async function executeTool(name, args) {
  switch (name) {
    case 'search_resume':       return searchResume(args.query);
    case 'get_project_details': return RESUME.projects[args.project] || { error: 'not found' };
    case 'get_skills':          return args.category === 'all' || !args.category ? RESUME.skills : { [args.category]: RESUME.skills[args.category] };
    case 'get_contact_info':    return RESUME.basic;
    case 'get_github_trending': return await fetchGitHubTrending(args.language);
    case 'get_ai_papers':       return await fetchArxivPapers(args.topic);
    default:                    return { error: `unknown tool: ${name}` };
  }
}

// ===== MEMORY MANAGEMENT =====
// Rough token estimate: 1 token ≈ 1.5 Chinese chars or 4 ASCII chars
function estimateTokens(messages) {
  return messages.reduce((sum, m) => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return sum + Math.ceil(text.length / 3);
  }, 0);
}

function trimHistory(history, budget = 3000) {
  let trimmed = [...history];
  while (trimmed.length > 2 && estimateTokens(trimmed) > budget) {
    trimmed.splice(0, 2); // Remove oldest user+assistant pair
  }
  return trimmed;
}

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `你是龙雨欣的 AI 助手。龙雨欣是一名有 2 年经验的后端工程师，在美团搜索推荐技术部工作，目前寻找后端开发或 AI Agent 岗位。

规则：
- 中文提问用中文答，英文提问用英文答
- 先调用工具获取准确信息，再合成回答
- 回答简洁，有数据时引用具体数字
- get_github_trending 和 get_ai_papers 返回的是实时数据，说明来源是 GitHub/ArXiv`;

// ===== HANDLER =====
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.DEEPSEEK_API_KEY) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ type: 'text', content: '⚙️ 请在 Vercel 环境变量中配置 DEEPSEEK_API_KEY 后重新部署。' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    return res.end();
  }

  const { message, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });

  try {
    // Trim history to stay within token budget
    const trimmedHistory = trimHistory(history);
    let messages = [...trimmedHistory, { role: 'user', content: message }];

    // ── Phase 1: Tool resolution loop (non-streaming, fast) ──
    for (let i = 0; i < 6; i++) {
      const resp = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 512,
      });

      const msg = resp.choices[0].message;

      if (resp.choices[0].finish_reason === 'stop' || !msg.tool_calls?.length) {
        // No tools needed, stream this response directly
        const content = msg.content || '';
        for (const char of content) {
          send({ type: 'text', content: char });
        }
        send({ type: 'done' });
        return res.end();
      }

      // Execute tool calls
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        send({ type: 'tool', name: tc.function.name, display: TOOL_DISPLAY[tc.function.name] || tc.function.name });

        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}

        const result = await executeTool(tc.function.name, args);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    // ── Phase 2: Final streaming response (after tools resolved) ──
    const stream = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) send({ type: 'text', content });
    }

  } catch (err) {
    console.error(err);
    send({ type: 'text', content: `抱歉，遇到了错误：${err.message}` });
  }

  send({ type: 'done' });
  res.end();
};
