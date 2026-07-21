'use strict';
const express = require('express');
const pool = require('../models/db');
const { analyzeScenarioCoverage, authorizeTransition, buildDeterministicPlan, digest, evaluateRuns, validateRunSpec } = require('../domain/simulationPolicy');
const { adapterReadiness } = require('../services/adapterBoundary');

function buildRouter(auth) {
  const router = express.Router();
  router.use(auth);
  const tenant = (req) => String(req.user?.tenantId || '');
  const role = (...allowed) => (req, res, next) => allowed.includes(req.user?.role) ? next() : res.status(403).json({ error: 'insufficient platform role' });
  async function transaction(work) {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  function sendError(res, error, fallback) {
    if (error.code === '23505') return res.status(409).json({ error: 'idempotency or immutable evidence conflict' });
    const status = error.status || (/required|must|allowed|recognized|missing/.test(error.message) ? 422 : 500);
    res.status(status).json({ error: status === 500 ? fallback : error.message });
  }

  router.get('/adapters/readiness', (_req, res) => {
    const readiness = adapterReadiness();
    res.status(readiness.ready ? 200 : 503).json(readiness);
  });

  router.post('/specs', role('developer', 'admin'), async (req, res) => {
    try {
      const tenantId = tenant(req);
      if (!tenantId) return res.status(403).json({ error: 'active tenant membership is required' });
      const key = String(req.get('Idempotency-Key') || '').trim();
      if (!key) return res.status(400).json({ error: 'Idempotency-Key is required' });
      const spec = { ...req.body, tenantId };
      const validation = validateRunSpec(spec);
      if (!validation.ok) return res.status(422).json({ error: 'run spec rejected', details: validation.errors });
      const result = await transaction(async (client) => {
        const replay = await client.query('SELECT * FROM simulation_run_specs WHERE tenant_id=$1 AND idempotency_key=$2', [tenantId, key]);
        if (replay.rows[0]) return { runSpec: replay.rows[0], replayed: true };
        const inserted = await client.query(
          `INSERT INTO simulation_run_specs
           (tenant_id,idempotency_key,name,scenario_version,config_version,fixture_digest,repository,commit_sha,seed,max_steps,input_digest,normalized_spec,status,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'validated',$13) RETURNING *`,
          [tenantId,key,spec.name,spec.scenarioVersion,spec.configVersion,spec.fixtureDigest,spec.repository,spec.commitSha,spec.seed,spec.maxSteps,validation.inputDigest,validation.normalized,req.user.id]
        );
        await client.query(
          `INSERT INTO simulation_provenance_events
           (tenant_id,run_spec_id,actor_id,event_type,from_status,to_status,payload,evidence_digest)
           VALUES ($1,$2,$3,'spec_validated','draft','validated',$4,$5)`,
          [tenantId,inserted.rows[0].id,req.user.id,{ scenarioVersion: spec.scenarioVersion, configVersion: spec.configVersion },validation.inputDigest]
        );
        return { runSpec: inserted.rows[0], replayed: false };
      });
      res.status(result.replayed ? 200 : 201).json(result);
    } catch (error) { sendError(res, error, 'run specification could not be persisted'); }
  });

  router.post('/specs/:id/reruns', role('developer', 'admin'), async (req, res) => {
    try {
      const tenantId = tenant(req);
      const key = String(req.get('Idempotency-Key') || '').trim();
      if (!tenantId || !key) return res.status(400).json({ error: 'tenant and Idempotency-Key are required' });
      const source = await pool.query('SELECT * FROM simulation_run_specs WHERE id=$1 AND tenant_id=$2', [req.params.id,tenantId]);
      if (!source.rows[0]) return res.status(404).json({ error: 'source run specification not found' });
      const row = source.rows[0];
      const inserted = await pool.query(
        `INSERT INTO simulation_run_specs
         (tenant_id,idempotency_key,name,scenario_version,config_version,fixture_digest,repository,commit_sha,seed,max_steps,input_digest,normalized_spec,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'validated',$13)
         ON CONFLICT (tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`,
        [tenantId,key,row.name,row.scenario_version,row.config_version,row.fixture_digest,row.repository,row.commit_sha,row.seed,row.max_steps,row.input_digest,row.normalized_spec,req.user.id]
      );
      res.status(201).json({ runSpec: inserted.rows[0], reproducibleInputDigest: row.input_digest });
    } catch (error) { sendError(res, error, 'rerun could not be created'); }
  });

  router.post('/specs/:id/approvals', role('reviewer', 'admin'), async (req, res) => {
    try {
      const tenantId = tenant(req);
      if (!tenantId) return res.status(403).json({ error: 'active tenant membership is required' });
      if (!['approve','reject'].includes(req.body?.decision) || !String(req.body?.attestation || '').trim()) return res.status(422).json({ error: 'decision and attestation are required' });
      const found = await pool.query('SELECT id,created_by,status FROM simulation_run_specs WHERE id=$1 AND tenant_id=$2', [req.params.id,tenantId]);
      if (!found.rows[0]) return res.status(404).json({ error: 'run specification not found' });
      if (found.rows[0].status !== 'validated') return res.status(409).json({ error: 'run specification is not awaiting approval' });
      if (Number(found.rows[0].created_by) === Number(req.user.id)) return res.status(409).json({ error: 'creator cannot approve their own run' });
      const attestationDigest = digest({ decision: req.body.decision, attestation: req.body.attestation });
      const result = await pool.query(
        `INSERT INTO simulation_run_approvals (tenant_id,run_spec_id,actor_id,decision,attestation_digest)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id,run_spec_id,actor_id)
         DO UPDATE SET decision=EXCLUDED.decision,attestation_digest=EXCLUDED.attestation_digest,created_at=NOW() RETURNING *`,
        [tenantId,req.params.id,req.user.id,req.body.decision,attestationDigest]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) { sendError(res, error, 'approval could not be recorded'); }
  });

  router.post('/specs/:id/transition', async (req, res) => {
    try {
      const tenantId = tenant(req);
      if (!tenantId) return res.status(403).json({ error: 'active tenant membership is required' });
      const revision = Number(req.get('If-Match'));
      if (!Number.isInteger(revision) || revision < 1) return res.status(400).json({ error: 'If-Match must be a positive revision' });
      const result = await transaction(async (client) => {
        const found = await client.query('SELECT * FROM simulation_run_specs WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id,tenantId]);
        const run = found.rows[0];
        if (!run) throw Object.assign(new Error('run specification not found'), { status: 404 });
        if (run.revision !== revision) throw Object.assign(new Error('run revision conflict'), { status: 409 });
        const approvals = (await client.query('SELECT actor_id AS "actorId",decision FROM simulation_run_approvals WHERE tenant_id=$1 AND run_spec_id=$2',[tenantId,run.id])).rows;
        const evaluation = (await client.query('SELECT evidence_digest AS "evidenceDigest" FROM simulation_evaluations WHERE tenant_id=$1 AND run_spec_id=$2 ORDER BY id DESC LIMIT 1',[tenantId,run.id])).rows[0];
        const authorization = authorizeTransition({ current: run.status,next:req.body?.nextStatus,actor:req.user,approvals,adaptersReady:adapterReadiness().ready,evaluation });
        if (!authorization.ok) throw Object.assign(new Error(authorization.errors.join('; ')), { status: 422 });
        const updated = await client.query('UPDATE simulation_run_specs SET status=$1,revision=revision+1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND revision=$4 RETURNING *',[req.body.nextStatus,run.id,tenantId,revision]);
        if (req.body.nextStatus === 'queued') {
          const plan = buildDeterministicPlan(run.normalized_spec);
          for (const job of plan.jobs) {
            await client.query(
              `INSERT INTO simulation_jobs (tenant_id,run_spec_id,sequence,step,agent_id,idempotency_key,allowed_tools)
               VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tenant_id,idempotency_key) DO NOTHING`,
              [tenantId,run.id,job.sequence,job.step,job.agentId,job.idempotencyKey,job.allowedTools]
            );
          }
        }
        await client.query(
          `INSERT INTO simulation_provenance_events
           (tenant_id,run_spec_id,actor_id,event_type,from_status,to_status,payload,evidence_digest)
           VALUES ($1,$2,$3,'state_transition',$4,$5,$6,$7)`,
          [tenantId,run.id,req.user.id,run.status,req.body.nextStatus,{ revision },authorization.evidenceDigest]
        );
        return updated.rows[0];
      });
      res.json(result);
    } catch (error) { sendError(res, error, 'run transition failed'); }
  });

  router.post('/specs/:id/results', role('operator','admin'), async (req,res) => {
    try {
      const tenantId=tenant(req);
      if (!tenantId) return res.status(403).json({ error:'active tenant membership is required' });
      const { workerId,outputDigest,result,latencyMs,costUsd,providerFailures,recovered,artifact }=req.body||{};
      if (!String(workerId||'').trim() || !/^[a-f0-9]{64}$/.test(String(outputDigest||'')) || digest(result)!==outputDigest) {
        return res.status(422).json({ error:'worker ID and matching result SHA-256 digest are required' });
      }
      if (!artifact || !String(artifact.storageKey||'').trim() || !/^[a-f0-9]{64}$/.test(String(artifact.contentDigest||'')) || !String(artifact.mediaType||'').trim() || !Number.isInteger(Number(artifact.byteSize)) || Number(artifact.byteSize)<=0) {
        return res.status(422).json({ error:'immutable artifact metadata is required' });
      }
      if (![latencyMs,costUsd,providerFailures||0].every((value)=>Number.isFinite(Number(value))&&Number(value)>=0)) {
        return res.status(422).json({ error:'latency, cost, and provider failure count must be non-negative numbers' });
      }
      const inserted=await transaction(async(client)=>{
        const run=await client.query('SELECT status FROM simulation_run_specs WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,tenantId]);
        if(!run.rows[0]) throw Object.assign(new Error('run specification not found'),{status:404});
        if(run.rows[0].status!=='running') throw Object.assign(new Error('run is not accepting execution results'),{status:409});
        const execution=await client.query(
          `INSERT INTO simulation_execution_results
           (tenant_id,run_spec_id,worker_id,output_digest,result,latency_ms,cost_usd,provider_failures,recovered)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [tenantId,req.params.id,workerId,outputDigest,result,Number(latencyMs),Number(costUsd),Number(providerFailures||0),recovered===true]
        );
        await client.query(
          `INSERT INTO simulation_artifacts
           (tenant_id,run_spec_id,artifact_type,storage_key,content_digest,media_type,byte_size)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tenant_id,content_digest) DO NOTHING`,
          [tenantId,req.params.id,artifact.type||'run_output',artifact.storageKey,artifact.contentDigest,artifact.mediaType,Number(artifact.byteSize)]
        );
        await client.query(
          `INSERT INTO simulation_provenance_events
           (tenant_id,run_spec_id,actor_id,event_type,payload,evidence_digest)
           VALUES ($1,$2,$3,'execution_result_recorded',$4,$5)`,
          [tenantId,req.params.id,req.user.id,{workerId,artifactDigest:artifact.contentDigest},outputDigest]
        );
        return execution.rows[0];
      });
      res.status(201).json(inserted);
    } catch(error){sendError(res,error,'execution result could not be recorded');}
  });

  router.post('/specs/:id/evaluations', role('evaluator','admin'), async (req, res) => {
    try {
      const tenantId = tenant(req);
      if (!tenantId) return res.status(403).json({ error: 'active tenant membership is required' });
      if (!String(req.body?.fixtureVersion || '').trim()) return res.status(422).json({ error: 'fixtureVersion is required' });
      const metrics = evaluateRuns(req.body.samples,req.body.baseline);
      const evidenceDigest = digest({ fixtureVersion:req.body.fixtureVersion,baselineVersion:req.body.baselineVersion,samples:req.body.samples,metrics });
      const result = await transaction(async (client) => {
        const run = await client.query('SELECT * FROM simulation_run_specs WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,tenantId]);
        if (!run.rows[0]) throw Object.assign(new Error('run specification not found'), { status:404 });
        if (run.rows[0].status !== 'running') throw Object.assign(new Error('only running work can be evaluated'), { status:409 });
        const inserted = await client.query(
          `INSERT INTO simulation_evaluations
           (tenant_id,run_spec_id,fixture_version,baseline_version,metrics,evidence_digest,evaluated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [tenantId,req.params.id,req.body.fixtureVersion,req.body.baselineVersion||null,metrics,evidenceDigest,req.user.id]
        );
        await client.query("UPDATE simulation_run_specs SET status='evaluated',revision=revision+1,updated_at=NOW() WHERE id=$1 AND tenant_id=$2",[req.params.id,tenantId]);
        await client.query(
          `INSERT INTO simulation_provenance_events
           (tenant_id,run_spec_id,actor_id,event_type,from_status,to_status,payload,evidence_digest)
           VALUES ($1,$2,$3,'evaluation_recorded','running','evaluated',$4,$5)`,
          [tenantId,req.params.id,req.user.id,{fixtureVersion:req.body.fixtureVersion,baselineVersion:req.body.baselineVersion||null},evidenceDigest]
        );
        return inserted.rows[0];
      });
      res.status(201).json(result);
    } catch (error) { sendError(res,error,'evaluation could not be recorded'); }
  });

  router.post('/scenario-coverage', role('developer','evaluator','admin'), async (req,res) => {
    try {
      const tenantId=tenant(req);
      if (!tenantId) return res.status(403).json({ error:'active tenant membership is required' });
      if (!String(req.body?.scenarioLibraryVersion||'').trim() || !String(req.body?.requirementsVersion||'').trim()) return res.status(422).json({ error:'versioned scenario library and requirements are required' });
      if(req.body.runSpecId){
        const owned=await pool.query('SELECT id FROM simulation_run_specs WHERE id=$1 AND tenant_id=$2',[req.body.runSpecId,tenantId]);
        if(!owned.rows[0]) return res.status(404).json({ error:'run specification not found in tenant' });
      }
      const result=analyzeScenarioCoverage(req.body);
      const inserted=await pool.query(
        `INSERT INTO scenario_coverage_results
         (tenant_id,run_spec_id,scenario_library_version,requirements_version,result,evidence_digest,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [tenantId,req.body.runSpecId||null,req.body.scenarioLibraryVersion,req.body.requirementsVersion,result,result.evidenceDigest,req.user.id]
      );
      res.status(201).json(inserted.rows[0]);
    } catch (error) { sendError(res,error,'scenario coverage could not be recorded'); }
  });

  return router;
}
module.exports=buildRouter;
