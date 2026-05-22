// LangGraph-style Agent State Machine
// Flow: PLANNER → EXECUTOR → EVALUATOR → RESPONDER
//
// PLANNER  – decides which tools to call (or skips to RESPONDER)
// EXECUTOR – runs selected tools, emits tool events
// EVALUATOR – checks if we have enough context; may loop back to PLANNER
// RESPONDER – streams the final answer

const STATES = { PLAN: 'plan', EXEC: 'exec', EVAL: 'eval', RESPOND: 'respond', DONE: 'done' };
const MAX_ITERS = 8;

const PLANNER_PROMPT = `你是一个规划代理（Planner）。根据用户问题，决定需要调用哪些工具来收集信息。
只调用必要的工具，不要重复调用同类工具。如果问题可以直接回答则不调用工具。`;

const EVALUATOR_PROMPT = `你是一个评估代理（Evaluator）。查看已收集的工具结果，判断信息是否足够回答用户问题。
如果足够，直接回答。如果还需要更多信息，调用额外工具（最多再调用一次）。`;

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
      // No tools needed → answer directly
      if (msg.content) {
        onEvent({ type: 'text', content: msg.content });
        onEvent({ type: 'done' });
        return STATES.DONE;
      }
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

    // Evaluator produced a direct answer
    if (msg.content) {
      onEvent({ type: 'text', content: msg.content });
      onEvent({ type: 'done' });
      return STATES.DONE;
    }

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
