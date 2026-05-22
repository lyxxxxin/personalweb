const OpenAI                       = require('openai');
const { AgentStateMachine }        = require('../lib/state-machine');
const { trimHistory }              = require('../lib/memory');
const { createRegistry, SKILL_DISPLAY } = require('../skills/index');

const SYSTEM_PROMPT = `你是龙雨欣的 AI 助手。龙雨欣是有 2 年经验的后端工程师，在美团搜索推荐技术部工作，正在寻找后端开发或 AI Agent 岗位。

规则：
- 中文问题用中文答，英文问题用英文答
- 先调用工具获取准确信息，再合成回答
- 有具体数字时务必引用（QPS、延迟等）
- get_github_trending / get_ai_papers 返回的是实时数据，说明来源`;

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
