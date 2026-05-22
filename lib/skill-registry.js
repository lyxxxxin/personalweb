// Skill system: hot-pluggable tool modules

class Skill {
  constructor({ name, description, parameters = {}, execute, enabled = true }) {
    this.name        = name;
    this.description = description;
    this.parameters  = parameters;
    this.executeFn   = execute;
    this.enabled     = enabled;
  }

  toTool() {
    return {
      type: 'function',
      function: { name: this.name, description: this.description, parameters: this.parameters },
    };
  }

  async execute(args) {
    return this.executeFn(args);
  }
}

class SkillRegistry {
  constructor() { this.skills = new Map(); }

  // Register one or many skills
  register(...skills) {
    for (const s of skills.flat()) {
      this.skills.set(s.name, s instanceof Skill ? s : new Skill(s));
    }
    return this;
  }

  // OpenAI-format tool definitions (enabled skills only)
  getTools() {
    return [...this.skills.values()]
      .filter(s => s.enabled)
      .map(s => s.toTool());
  }

  // Execute a skill by name, with error isolation
  async execute(name, args) {
    const skill = this.skills.get(name);
    if (!skill) return { error: `Unknown skill: ${name}` };
    if (!skill.enabled) return { error: `Skill "${name}" is disabled` };
    try {
      return await skill.execute(args);
    } catch (e) {
      return { error: `Skill "${name}" failed: ${e.message}` };
    }
  }

  enable(name)  { this.skills.get(name) && (this.skills.get(name).enabled = true); }
  disable(name) { this.skills.get(name) && (this.skills.get(name).enabled = false); }
  list()        { return [...this.skills.values()].map(({ name, enabled }) => ({ name, enabled })); }
}

module.exports = { Skill, SkillRegistry };
