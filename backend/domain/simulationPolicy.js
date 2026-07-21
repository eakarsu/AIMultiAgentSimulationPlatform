'use strict';

const crypto = require('crypto');

const TRANSITIONS = Object.freeze({
  draft: new Set(['validated', 'cancelled']),
  validated: new Set(['approved', 'draft', 'cancelled']),
  approved: new Set(['queued', 'cancelled']),
  queued: new Set(['running', 'failed', 'cancelled']),
  running: new Set(['evaluated', 'failed']),
  evaluated: new Set(['accepted', 'rejected']),
  accepted: new Set(), rejected: new Set(), failed: new Set(['queued']), cancelled: new Set(),
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function validateSandbox(sandbox = {}) {
  const errors = [];
  if (!['none', 'egress_allowlist'].includes(sandbox.network)) errors.push('sandbox network must be none or egress_allowlist');
  if (sandbox.filesystem !== 'ephemeral') errors.push('sandbox filesystem must be ephemeral');
  if (sandbox.readOnlyRepository !== true) errors.push('repository checkout must be read-only');
  if (!Number.isInteger(sandbox.cpuMillis) || sandbox.cpuMillis < 100 || sandbox.cpuMillis > 600000) errors.push('cpuMillis must be 100..600000');
  if (!Number.isInteger(sandbox.memoryMb) || sandbox.memoryMb < 64 || sandbox.memoryMb > 8192) errors.push('memoryMb must be 64..8192');
  if (!Number.isInteger(sandbox.timeoutSeconds) || sandbox.timeoutSeconds < 1 || sandbox.timeoutSeconds > 3600) errors.push('timeoutSeconds must be 1..3600');
  if (!Array.isArray(sandbox.secretAllowlist) || sandbox.secretAllowlist.some((name) => !/^[A-Z][A-Z0-9_]{1,80}$/.test(name))) errors.push('secretAllowlist must contain explicit environment names');
  return { ok: errors.length === 0, errors };
}

function validateRunSpec(spec) {
  const errors = [];
  for (const field of ['tenantId', 'name', 'scenarioVersion', 'configVersion', 'fixtureDigest', 'repository', 'commitSha']) {
    if (!String(spec?.[field] || '').trim()) errors.push(`${field} is required`);
  }
  if (spec?.fixtureDigest && !/^[a-f0-9]{64}$/.test(spec.fixtureDigest)) errors.push('fixtureDigest must be SHA-256');
  if (spec?.commitSha && !/^[a-f0-9]{40,64}$/.test(spec.commitSha)) errors.push('commitSha must be a full immutable revision');
  if (!Number.isInteger(spec?.seed) || spec.seed < 0) errors.push('non-negative integer seed is required');
  if (!Number.isInteger(spec?.maxSteps) || spec.maxSteps < 1 || spec.maxSteps > 10000) errors.push('maxSteps must be 1..10000');
  if (!Array.isArray(spec?.agents) || spec.agents.length < 2 || spec.agents.length > 100) errors.push('2..100 typed agents are required');
  else {
    const ids = new Set();
    spec.agents.forEach((agent, index) => {
      if (!String(agent?.id || '').trim() || !String(agent?.role || '').trim() || !String(agent?.policyVersion || '').trim()) errors.push(`agent ${index} requires id, role, and policyVersion`);
      if (ids.has(agent.id)) errors.push(`agent ${index} id is duplicated`);
      ids.add(agent.id);
      if (!Array.isArray(agent?.tools)) errors.push(`agent ${index} tools must be an allowlist`);
    });
  }
  const sandbox = validateSandbox(spec?.sandbox);
  errors.push(...sandbox.errors);
  const normalized = stable(spec || {});
  return { ok: errors.length === 0, errors, inputDigest: digest(normalized), normalized };
}

function buildDeterministicPlan(spec) {
  const validation = validateRunSpec(spec);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  const jobs = [];
  for (let step = 1; step <= spec.maxSteps; step++) {
    for (const agent of [...spec.agents].sort((a, b) => a.id.localeCompare(b.id))) {
      jobs.push({
        sequence: jobs.length + 1,
        step,
        agentId: agent.id,
        idempotencyKey: digest({ inputDigest: validation.inputDigest, step, agentId: agent.id }),
        allowedTools: [...agent.tools].sort(),
      });
    }
  }
  return { inputDigest: validation.inputDigest, seed: spec.seed, jobs };
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * pct) - 1)];
}

function evaluateRuns(samples, baseline = {}) {
  if (!Array.isArray(samples) || !samples.length) throw new Error('versioned evaluation samples are required');
  const number = (value, name) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be non-negative`);
    return parsed;
  };
  const rows = samples.map((sample) => ({
    correct: sample.correct === true,
    recovered: sample.recovered === true,
    latencyMs: number(sample.latencyMs, 'latencyMs'),
    costUsd: number(sample.costUsd, 'costUsd'),
    providerFailures: number(sample.providerFailures || 0, 'providerFailures'),
    concurrency: number(sample.concurrency || 1, 'concurrency'),
    deterministicDigest: String(sample.outputDigest || ''),
  }));
  const correctness = rows.filter((row) => row.correct).length / rows.length;
  const recoveryRate = rows.filter((row) => row.providerFailures > 0).length
    ? rows.filter((row) => row.providerFailures > 0 && row.recovered).length / rows.filter((row) => row.providerFailures > 0).length : 1;
  const repeatDigests = new Set(rows.map((row) => row.deterministicDigest).filter(Boolean));
  const result = {
    sampleCount: rows.length,
    correctness,
    reliability: rows.filter((row) => row.correct || row.recovered).length / rows.length,
    latencyP95Ms: percentile(rows.map((row) => row.latencyMs), 0.95),
    totalCostUsd: rows.reduce((sum, row) => sum + row.costUsd, 0),
    providerFailureCount: rows.reduce((sum, row) => sum + row.providerFailures, 0),
    maxConcurrency: Math.max(...rows.map((row) => row.concurrency)),
    recoveryRate,
    deterministic: repeatDigests.size <= 1,
  };
  result.regressions = {
    correctness: baseline.correctness == null ? null : result.correctness - Number(baseline.correctness),
    latencyP95Ms: baseline.latencyP95Ms == null ? null : result.latencyP95Ms - Number(baseline.latencyP95Ms),
    totalCostUsd: baseline.totalCostUsd == null ? null : result.totalCostUsd - Number(baseline.totalCostUsd),
  };
  return result;
}

function analyzeScenarioCoverage({ scenarios = [], requirements = [] }) {
  const covered = new Set();
  for (const scenario of scenarios) {
    for (const item of scenario.covers || []) covered.add(item);
  }
  const gaps = requirements.filter((requirement) => !covered.has(requirement));
  return {
    requirementCount: requirements.length,
    coveredCount: requirements.length - gaps.length,
    coverage: requirements.length ? (requirements.length - gaps.length) / requirements.length : 0,
    gaps,
    evidenceDigest: digest({ scenarios, requirements }),
  };
}

function authorizeTransition({ current, next, actor, approvals = [], adaptersReady = false, evaluation }) {
  const errors = [];
  if (!TRANSITIONS[current]?.has(next)) errors.push(`transition ${current} -> ${next} is not allowed`);
  const role = actor?.role;
  if (!['developer', 'reviewer', 'operator', 'evaluator', 'admin'].includes(role)) errors.push('recognized platform role is required');
  if (next === 'approved') {
    if (!['reviewer', 'admin'].includes(role)) errors.push('reviewer role is required');
    const distinct = new Set(approvals.filter((item) => item.decision === 'approve').map((item) => item.actorId));
    if (distinct.size < 2) errors.push('two distinct approvals are required');
  }
  if (next === 'queued' && (!['operator', 'admin'].includes(role) || !adaptersReady)) errors.push('operator and ready typed adapters are required');
  if (next === 'running' && !['operator', 'admin'].includes(role)) errors.push('worker operator role is required');
  if (['accepted', 'rejected'].includes(next) && (!['evaluator', 'admin'].includes(role) || !evaluation?.evidenceDigest)) errors.push('evaluator role and evaluation evidence are required');
  return { ok: errors.length === 0, errors, evidenceDigest: evaluation ? digest(evaluation) : null };
}

module.exports = { TRANSITIONS, analyzeScenarioCoverage, authorizeTransition, buildDeterministicPlan, digest, evaluateRuns, validateRunSpec, validateSandbox };
