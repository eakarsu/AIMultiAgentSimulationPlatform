'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeScenarioCoverage, authorizeTransition, buildDeterministicPlan, evaluateRuns, validateRunSpec, validateSandbox } = require('../domain/simulationPolicy');
const { adapterReadiness, requireAdapter } = require('../services/adapterBoundary');

function spec() {
  return {
    tenantId:'tenant-a',name:'negotiation-regression',scenarioVersion:'scenario-v3',configVersion:'config-v2',
    fixtureDigest:'a'.repeat(64),repository:'example/simulations',commitSha:'b'.repeat(40),seed:42,maxSteps:2,
    agents:[
      {id:'agent-b',role:'seller',policyVersion:'p2',tools:['quote.read']},
      {id:'agent-a',role:'buyer',policyVersion:'p1',tools:['offer.write','quote.read']},
    ],
    sandbox:{network:'none',filesystem:'ephemeral',readOnlyRepository:true,cpuMillis:5000,memoryMb:256,timeoutSeconds:30,secretAllowlist:[]},
  };
}

test('validates versioned run inputs and strict sandbox policy',()=>{
  const result=validateRunSpec(spec());
  assert.equal(result.ok,true);
  assert.match(result.inputDigest,/^[a-f0-9]{64}$/);
});

test('rejects network, mutable repository, unbounded resources, and implicit secrets',()=>{
  const sandbox={network:'open',filesystem:'host',readOnlyRepository:false,cpuMillis:1,memoryMb:99999,timeoutSeconds:0,secretAllowlist:['bad-secret']};
  const result=validateSandbox(sandbox);
  assert.equal(result.ok,false);
  assert.equal(result.errors.length,7);
});

test('rejects duplicate agents and non-versioned immutable inputs',()=>{
  const invalid=spec();
  invalid.commitSha='main';
  invalid.fixtureDigest='fixture';
  invalid.agents[1].id=invalid.agents[0].id;
  const result=validateRunSpec(invalid);
  assert.equal(result.ok,false);
  assert.equal(result.errors.some((error)=>error.includes('duplicated')),true);
});

test('builds reproducible ordered jobs with stable idempotency keys',()=>{
  const first=buildDeterministicPlan(spec());
  const second=buildDeterministicPlan(spec());
  assert.deepEqual(first,second);
  assert.equal(first.jobs.length,4);
  assert.deepEqual(first.jobs.map((job)=>job.agentId),['agent-a','agent-b','agent-a','agent-b']);
  assert.equal(new Set(first.jobs.map((job)=>job.idempotencyKey)).size,4);
});

test('benchmarks correctness reliability latency cost failure concurrency recovery and determinism',()=>{
  const metrics=evaluateRuns([
    {correct:true,recovered:true,latencyMs:100,costUsd:0.2,providerFailures:1,concurrency:2,outputDigest:'same'},
    {correct:false,recovered:false,latencyMs:250,costUsd:0.3,providerFailures:0,concurrency:4,outputDigest:'same'},
  ]);
  assert.equal(metrics.correctness,0.5);
  assert.equal(metrics.reliability,0.5);
  assert.equal(metrics.latencyP95Ms,250);
  assert.equal(metrics.totalCostUsd,0.5);
  assert.equal(metrics.providerFailureCount,1);
  assert.equal(metrics.maxConcurrency,4);
  assert.equal(metrics.recoveryRate,1);
  assert.equal(metrics.deterministic,true);
});

test('computes explicit regression deltas against a versioned baseline',()=>{
  const metrics=evaluateRuns([{correct:true,recovered:false,latencyMs:120,costUsd:1,providerFailures:0,concurrency:1,outputDigest:'x'}],{correctness:0.9,latencyP95Ms:100,totalCostUsd:0.8});
  assert.ok(Math.abs(metrics.regressions.correctness-0.1)<1e-9);
  assert.equal(metrics.regressions.latencyP95Ms,20);
  assert.ok(Math.abs(metrics.regressions.totalCostUsd-0.2)<1e-9);
});

test('durable scenario coverage analysis identifies evidence-linked gaps',()=>{
  const result=analyzeScenarioCoverage({requirements:['happy','provider-failure','recovery','concurrency'],scenarios:[{id:'s1',covers:['happy','provider-failure']},{id:'s2',covers:['recovery']}]});
  assert.equal(result.coverage,0.75);
  assert.deepEqual(result.gaps,['concurrency']);
  assert.match(result.evidenceDigest,/^[a-f0-9]{64}$/);
});

test('approval requires dual reviewers and queueing requires operator plus ready adapters',()=>{
  const approvals=[{actorId:1,decision:'approve'},{actorId:2,decision:'approve'}];
  assert.equal(authorizeTransition({current:'validated',next:'approved',actor:{role:'reviewer'},approvals}).ok,true);
  assert.equal(authorizeTransition({current:'validated',next:'approved',actor:{role:'reviewer'},approvals:approvals.slice(0,1)}).ok,false);
  assert.equal(authorizeTransition({current:'approved',next:'queued',actor:{role:'operator'},adaptersReady:false}).ok,false);
  assert.equal(authorizeTransition({current:'approved',next:'queued',actor:{role:'operator'},adaptersReady:true}).ok,true);
});

test('acceptance requires evaluator role and evidence',()=>{
  assert.equal(authorizeTransition({current:'evaluated',next:'accepted',actor:{role:'developer'},evaluation:{evidenceDigest:'x'}}).ok,false);
  assert.equal(authorizeTransition({current:'evaluated',next:'accepted',actor:{role:'evaluator'},evaluation:{evidenceDigest:'x'}}).ok,true);
});

test('typed adapters fail closed and require enablement endpoint and credential',()=>{
  assert.equal(adapterReadiness({}).ready,false);
  assert.throws(()=>requireAdapter('sandbox',{}),/not ready/);
  const env={};
  for(const name of ['REPOSITORY','CI','MODEL','TELEMETRY','SECRETS','ARTIFACTS','TICKETING','SANDBOX']){
    env[`${name}_ADAPTER_ENABLED`]='true';env[`${name}_ADAPTER_URL`]=`https://${name.toLowerCase()}.example.invalid`;env[`${name}_ADAPTER_TOKEN`]='runtime';
  }
  assert.equal(adapterReadiness(env).ready,true);
});
