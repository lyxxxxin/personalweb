const OpenAI = require('openai');

// ===== RESUME DATA =====
const DATA = {
  basic: {
    name: '龙雨欣',
    nameEn: 'Long Yuxin',
    title: '后端开发工程师',
    experience: '2年',
    born: '1999-01',
    email: 'lyx8210@gmail.com',
    phone: '18452480832',
    status: '正在寻找后端开发 / AI Agent 相关岗位',
  },

  education: [
    {
      school: '四川大学',
      degree: '硕士研究生',
      major: '计算机技术',
      period: '2021.09 — 2024.06',
      honors: ['GPA 3.4/4.0', '二等奖学金（排名前 10%）', '优秀助教'],
    },
    {
      school: '江苏大学',
      degree: '本科',
      major: '高分子材料与工程',
      period: '2016.09 — 2020.06',
      honors: ['三等奖学金', '优秀共青团干部'],
    },
  ],

  experience: [
    {
      company: '美团',
      dept: '搜索推荐技术部',
      role: '软件开发工程师',
      period: '2024.08 — 至今',
      responsibilities: [
        '主 R 闪购搜索产品需求，深入理解业务场景与用户诉求，保质保量完成需求迭代',
        '对搜索离线及在线链路有系统性理解，能够独立承担技术方案设计',
        '积极参与组内技术建设，在兜底容灾、索引优化等方向有实质性贡献',
        '主动关注线上告警，具备快速定位和响应线上问题的能力；推动兜底降级机制落地，提升大促高压场景下的服务可用性',
      ],
      techs: ['Java', 'Elasticsearch', 'Redis', 'Thrift', 'Kafka', '向量检索'],
    },
  ],

  projects: {
    vector_index: {
      name: '向量索引稳定性建设与召回性能优化',
      desc: '深度参与外卖向量检索架构迭代优化，聚焦离线索引发布保障与在线召回性能优化',
      highlights: [
        '封装原生 HTTP 接口，新增 Thrift 协议调用支持，减少序列化开销',
        '定制 ES 服务端插件，将 IVF-PQ+REFINE 两阶段检索逻辑下沉服务端执行，消除跨机房重复网络往返与序列化损耗',
        '优化召回后置链路，将商品正排数据迁移至 Redis，缓解集群内存资源竞争',
        '自研 HTTP/Thrift 双协议流量录制模块，搭建 IVF-PQ 向量索引全生命周期保障体系（预热、质量校验、异常自动回滚）',
      ],
      techs: ['IVF-PQ', 'Elasticsearch', 'Thrift', 'Redis', '向量检索', 'ES Plugin'],
    },
    suggest_stability: {
      name: '搜索 Suggest 稳定性建设',
      desc: '从零搭建全场景兜底保障体系，覆盖主搜、闪购、医药等全业务场景',
      highlights: [
        '确定 Redis 缓存 + FST 离线索引兜底方案，基于 Lucene 框架实现索引构建，兼顾查询性能与内存占用',
        '设计多级兜底方案：API 层前置分流，服务层场景化兜底缓存与多维度检索 FST 离线索引',
        '基于滑动窗口监控空结果率，实现分业务动态阈值配置与精准自动降级',
      ],
      metrics: {
        qps: '2000+ 单机极限 QPS',
        avg_latency: '平均耗时 3.2ms',
        tp999: 'TP999 仅 7ms',
      },
      techs: ['FST', 'Lucene', 'Redis', '滑动窗口', '多级降级'],
    },
    hot_list: {
      name: '闪购热榜建设',
      desc: '负责热榜搜索链路整体方案设计与落地，重构榜单生产链路',
      highlights: [
        '将原有单一词库召回迭代为多热源架构，接入 Hyper 多数据源，强化实时热点挖掘',
        '实现跨数据源聚合融合，叠加敏感词过滤、商品供给动态拦截',
        '通过 Redis 按城市维度缓存热度快照，解决不同请求热度值不一致问题',
        '搭建运营实时干预模块，支持运营灵活调整榜单内容与上下线管控',
      ],
      techs: ['Redis', '多源召回', '排序融合', '实时计算'],
    },
  },

  skills: {
    backend: ['Java', '微服务架构', 'Thrift / RPC', '多线程', 'JVM 原理', 'Spring Boot'],
    storage: ['Redis（持久化、高可用架构）', 'MySQL（InnoDB、索引优化、事务机制）', 'Kafka'],
    search: ['Elasticsearch', '向量检索', 'IVF / IVF-PQ', 'Lucene / FST', '离线索引构建', '搜索业务架构'],
    ai: ['Python', 'PyTorch', 'LLM 基本原理', 'Agent 常见范式'],
  },
};

// ===== TOOLS (OpenAI function calling format) =====
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_work_experience',
      description: '获取在美团的工作经历详情，包括职责、技术方向、技术栈。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_project_details',
      description: '获取某个具体项目的详细介绍，包括背景、工作内容、技术选型和性能指标。',
      parameters: {
        type: 'object',
        properties: {
          project: {
            type: 'string',
            enum: ['vector_index', 'suggest_stability', 'hot_list'],
            description:
              'vector_index=向量索引稳定性与召回优化；suggest_stability=Suggest稳定性建设；hot_list=闪购热榜建设',
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
      description: '获取技能信息，可按分类查询。',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['backend', 'storage', 'search', 'ai', 'all'],
            description: 'backend=后端开发, storage=存储与中间件, search=搜索领域, ai=AI技术, all=全部',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_education',
      description: '获取教育背景信息。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_info',
      description: '获取联系方式和求职状态。',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ===== TOOL EXECUTOR =====
function executeTool(name, args) {
  switch (name) {
    case 'get_work_experience':
      return DATA.experience;
    case 'get_project_details':
      return DATA.projects[args.project] || { error: 'Project not found' };
    case 'get_skills': {
      const cat = args.category || 'all';
      return cat === 'all' ? DATA.skills : { [cat]: DATA.skills[cat] };
    }
    case 'get_education':
      return DATA.education;
    case 'get_contact_info':
      return { ...DATA.basic };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `你是龙雨欣的 AI 助手，负责向来访者介绍她的职业背景。

龙雨欣（Long Yuxin）是一名有 2 年经验的后端开发工程师，目前在美团搜索推荐技术部工作，专注于大规模搜索系统的稳定性建设与性能优化。她正在寻找后端开发或 AI Agent 相关岗位。

行为准则：
- 默认用中文回答；访客如果用英文提问，改用英文回答
- 语气专业但友好自然
- 在回答有关工作经历、项目、技能的问题前，优先调用工具获取准确信息
- 回答简洁，简单问题 2-3 句，复杂问题不超过 8 句；适当换行让内容清晰
- 如有性能指标（如 QPS、延迟），要具体引用数字
- 不要捏造信息，工具里没有的内容就说不清楚`;

// ===== HANDLER =====
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(200).json({
      response: '⚙️ Agent 暂未配置 API Key，请在 Vercel 项目设置 → Environment Variables 中添加 DEEPSEEK_API_KEY，重新部署后即可使用。',
    });
  }

  const { message, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });

    let messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: message },
    ];

    // Agent loop
    for (let i = 0; i < 10; i++) {
      const response = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 1024,
      });

      const msg = response.choices[0].message;
      const finishReason = response.choices[0].finish_reason;

      if (finishReason === 'stop' || !msg.tool_calls?.length) {
        return res.status(200).json({ response: msg.content || '' });
      }

      if (finishReason === 'tool_calls') {
        messages.push(msg);

        for (const toolCall of msg.tool_calls) {
          let args = {};
          try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch {}

          const result = executeTool(toolCall.function.name, args);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      break;
    }

    return res.status(200).json({ response: '抱歉，未能生成回答，请重试。' });
  } catch (err) {
    console.error('Agent error:', err);
    return res.status(500).json({ error: err.message });
  }
};
