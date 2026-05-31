// LangGraph-style Agent State Machine
// Flow: PLANNER → EXECUTOR → EVALUATOR → RESPONDER
//
// PLANNER  – decides which tools to call (or skips to RESPONDER)
// EXECUTOR – runs selected tools, emits tool events
// EVALUATOR – checks if we have enough context; may loop back to PLANNER
// RESPONDER – streams the final answer

const STATES = { PLAN: 'plan', EXEC: 'exec', EVAL: 'eval', RESPOND: 'respond', DONE: 'done' };
const MAX_ITERS = 8;

const PLANNER_PROMPT = `你是规划代理（Planner），职责是决定调用哪些工具收集信息，不生成最终答案。

工具调用规则：
- 询问龙雨欣的经历、项目、技术优化、工作成果、亮点 → 调用 search_resume
- 询问某个具体项目的详细信息 → 调用 get_project_details
- 询问技能栈、技术能力 → 调用 get_skills
- 询问联系方式、求职意向 → 调用 get_contact_info
- 询问 GitHub 热门/开源项目 → 调用 get_github_trending
- 询问论文、AI 研究动态 → 调用 get_ai_papers
- 纯问候或已有充足上下文 → 不调用工具

只调用最必要的 1-2 个工具，不重复调用同类工具。`;

const EVALUATOR_PROMPT = `你是评估代理（Evaluator），检查已有工具结果是否足以回答用户问题。
如果足够 → 不调用工具；如果需要补充 → 调用一个额外工具。
只做路由判断，不生成最终答案。`;

class AgentStateMachine {
  constructor(client, registry, systemPrompt) {
    this.client      = client;
    this.registry    = registry;
    this.sysPrompt   = systemPrompt;
  }

  async run(userMessages, onEvent) {
    let state    = STATES.PLAN;
    let messages = [...userMessages];
    let iters    = 0;

    while (state !== STATES.DONE && iters++ < MAX_ITERS) {
      switch (state) {
        case STATES.PLAN:
          state = await this._plan(messages, onEvent);
          break;
        case STATES.EXEC:
          state = await this._exec(messages, onEvent);
          break;
        case STATES.EVAL:
          state = await this._eval(messages, onEvent);
          break;
        case STATES.RESPOND:
          await this._respond(messages, onEvent);
          state = STATES.DONE;
          break;
      }
    }
  }

  // ── PLANNER: which tools do we need? ─────────────────────
  async _plan(messages, onEvent) {
    const resp = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: PLANNER_PROMPT }, ...messages],
      tools: this.registry.getTools(),
      tool_choice: 'auto',
      max_tokens: 300,
    });

    const msg = resp.choices[0].message;

    if (resp.choices[0].finish_reason === 'stop' || !msg.tool_calls?.length) {
      // No tools needed — hand off to RESPONDER (full system prompt + streaming)
      return STATES.RESPOND;
    }

    // Store planned tool calls on messages for EXEC to pick up
    messages.push(msg);
    return STATES.EXEC;
  }

  // ── EXECUTOR: run tools, emit progress events ─────────────
  async _exec(messages, onEvent) {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.tool_calls?.length) return STATES.EVAL;

    for (const tc of lastMsg.tool_calls) {
      onEvent({ type: 'tool', name: tc.function.name });

      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}

      const result = await this.registry.execute(tc.function.name, args);
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
    }

    return STATES.EVAL;
  }

  // ── EVALUATOR: enough info? or need more tools? ───────────
  async _eval(messages, onEvent) {
    const resp = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: EVALUATOR_PROMPT }, ...messages],
      tools: this.registry.getTools(),
      tool_choice: 'auto',
      max_tokens: 300,
    });

    const msg    = resp.choices[0].message;
    const reason = resp.choices[0].finish_reason;

    if (reason === 'tool_calls' && msg.tool_calls?.length) {
      // Evaluator decided we need more data → back to EXEC
      messages.push(msg);
      return STATES.EXEC;
    }

    // Evaluator decided we have enough info — hand off to RESPONDER
    return STATES.RESPOND;
  }

  // ── RESPONDER: stream the final answer ────────────────────
  async _respond(messages, onEvent) {
    const stream = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: this.sysPrompt }, ...messages],
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) onEvent({ type: 'text', content });
    }

    onEvent({ type: 'done' });
  }
}

module.exports = { AgentStateMachine };
