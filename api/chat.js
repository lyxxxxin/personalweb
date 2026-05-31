const OpenAI                       = require('openai');
const { AgentStateMachine }        = require('../lib/state-machine');
const { trimHistory }              = require('../lib/memory');
const { createRegistry, SKILL_DISPLAY } = require('../skills/index');

const SYSTEM_PROMPT = `你是龙雨欣的 AI 助手，帮助访客了解她的技术背景和工作经历。

【龙雨欣简介】
- 2 年后端工程经验，目前在美团搜索推荐技术部担任软件开发工程师
- 求职意向：后端开发 / Agent 开发
- 核心项目：
  1. ES 向量搜索引擎性能优化（端到端延迟 28ms→18ms ↓36%，查询延迟 ↓50%）
  2. 长期记忆 Agent 状态化记忆管理系统（状态链 F1 0.817→0.952，压力测试 ACC 0.817 vs 纯语义 ↑52%）
  3. 搜索 Suggest 稳定性建设（单机 QPS 2000+，平均 3.2ms，TP999 7ms）
  4. 闪购热榜建设（多源召回架构）

【回答规则】
- 语言跟随用户：中文问题用中文，英文问题用英文
- 以工具返回数据为准，不凭记忆捏造细节
- 具体指标必须引用并加粗，如 **28ms→18ms**、**QPS 2000+**
- 称呼用"龙雨欣"，不用"她"
- 格式要求：写对话式段落，不要嵌套子列表；每个项目/要点用一段话概括，段首可加 **粗体标题**；禁止使用 ### 标题
- 回答控制在 200 字内，最后可加一句引导追问
- 实时数据（GitHub、论文）注明"来自实时抓取"`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  if (!process.env.DEEPSEEK_API_KEY) {
    send({ type: 'text', content: '⚙️ 请在 Vercel 环境变量中配置 DEEPSEEK_API_KEY 后重新部署。' });
    send({ type: 'done' });
    return res.end();
  }

  const { message, history = [] } = req.body || {};
  if (!message) { res.status(400).end(); return; }

  const client   = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });
  const registry = createRegistry();
  const agent    = new AgentStateMachine(client, registry, SYSTEM_PROMPT);

  const trimmed  = trimHistory(history);
  const messages = [...trimmed, { role: 'user', content: message }];

  try {
    await agent.run(messages, (evt) => {
      // Enrich tool events with display name before forwarding
      if (evt.type === 'tool') {
        send({ ...evt, display: SKILL_DISPLAY[evt.name] || evt.name });
      } else {
        send(evt);
      }
    });
  } catch (err) {
    console.error('Agent error:', err);
    send({ type: 'text', content: `抱歉，出现了错误：${err.message}` });
    send({ type: 'done' });
  }

  res.end();
};
