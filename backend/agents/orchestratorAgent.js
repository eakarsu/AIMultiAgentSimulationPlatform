const axios = require('axios');

const MODEL = 'anthropic/claude-3-5-sonnet-20241022';

function parseAIJson(raw) {
  try { return JSON.parse(raw); } catch {}
  const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blockMatch) { try { return JSON.parse(blockMatch[1].trim()); } catch {} }
  const objMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) { try { return JSON.parse(objMatch[1]); } catch {} }
  return { action: 'observe', reasoning: raw };
}

class OrchestratorAgent {
  constructor() {
    this.name = 'orchestrator';
  }

  async callAgentAI(agent, worldState) {
    const systemPrompt = `You are ${agent.name}, an AI agent with role: ${agent.role}. Your strategy: ${agent.strategy || 'adaptive'}. Current score: ${agent.score || 0}.`;
    const userPrompt = `World state: ${JSON.stringify(worldState)}

Choose your action for this round. Return JSON only: { "action": string, "target": string|null, "reasoning": string, "resource_change": number }`;

    try {
      const r = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 400,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const content = r.data.choices[0].message.content;
      const parsed = parseAIJson(content);
      return { agentId: agent.id, agentName: agent.name, ...parsed };
    } catch (e) {
      console.error(`[OrchestratorAgent] callAgentAI error for ${agent.name}:`, e.message);
      return { agentId: agent.id, agentName: agent.name, action: 'wait', reasoning: 'AI unavailable', resource_change: 0 };
    }
  }

  async runTick(simulation, agents, worldState) {
    // For each agent, call AI with its role system prompt
    const results = await Promise.all(agents.map(agent => this.callAgentAI(agent, worldState)));

    // Build interactions array
    const interactions = results.map(r => ({
      agent_from: r.agentId,
      agent_name: r.agentName,
      action: r.action || 'observe',
      target: r.target || null,
      reasoning: r.reasoning || '',
      resource_change: r.resource_change || 0,
    }));

    // Update world state
    const newWorldState = {
      ...worldState,
      round: (worldState.round || 0) + 1,
      agent_actions: results.map(r => ({
        agent: r.agentName,
        action: r.action,
        resource_change: r.resource_change || 0,
      })),
      events: interactions.map(i => `${i.agent_name} chose to ${i.action}`),
    };

    // Determine if round is complete
    const roundComplete = true;

    return { interactions, newWorldState, roundComplete };
  }

  // Legacy compatibility
  async execute(task, context) {
    console.log(`[OrchestratorAgent] Executing: ${task}`);
    return { agent: this.name, task, status: 'completed', timestamp: new Date().toISOString() };
  }
}

module.exports = new OrchestratorAgent();
