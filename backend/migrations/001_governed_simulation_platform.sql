CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id);
CREATE TABLE IF NOT EXISTS tenant_memberships (
  tenant_id UUID NOT NULL REFERENCES organizations(id), user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('developer','reviewer','operator','evaluator','admin')),
  active BOOLEAN NOT NULL DEFAULT TRUE, PRIMARY KEY (tenant_id,user_id)
);
CREATE TABLE IF NOT EXISTS simulation_run_specs (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  idempotency_key TEXT NOT NULL, name TEXT NOT NULL, scenario_version TEXT NOT NULL,
  config_version TEXT NOT NULL, fixture_digest CHAR(64) NOT NULL, repository TEXT NOT NULL,
  commit_sha TEXT NOT NULL, seed BIGINT NOT NULL, max_steps INTEGER NOT NULL,
  input_digest CHAR(64) NOT NULL, normalized_spec JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'validated' CHECK (status IN ('draft','validated','approved','queued','running','evaluated','accepted','rejected','failed','cancelled')),
  revision INTEGER NOT NULL DEFAULT 1, created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS simulation_run_queue_idx ON simulation_run_specs(tenant_id,status,updated_at);
CREATE TABLE IF NOT EXISTS simulation_run_approvals (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  run_spec_id BIGINT NOT NULL REFERENCES simulation_run_specs(id), actor_id INTEGER NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approve','reject')), attestation_digest CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (tenant_id,run_spec_id,actor_id)
);
CREATE TABLE IF NOT EXISTS simulation_jobs (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  run_spec_id BIGINT NOT NULL REFERENCES simulation_run_specs(id), sequence INTEGER NOT NULL,
  step INTEGER NOT NULL, agent_id TEXT NOT NULL, idempotency_key CHAR(64) NOT NULL,
  allowed_tools JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','succeeded','failed','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT, UNIQUE (tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS simulation_job_delivery_idx ON simulation_jobs(status,next_attempt_at);
CREATE TABLE IF NOT EXISTS simulation_artifacts (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  run_spec_id BIGINT NOT NULL REFERENCES simulation_run_specs(id), artifact_type TEXT NOT NULL,
  storage_key TEXT NOT NULL, content_digest CHAR(64) NOT NULL, media_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,content_digest)
);
CREATE TABLE IF NOT EXISTS simulation_execution_results (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  run_spec_id BIGINT NOT NULL REFERENCES simulation_run_specs(id), worker_id TEXT NOT NULL,
  output_digest CHAR(64) NOT NULL, result JSONB NOT NULL, latency_ms NUMERIC NOT NULL,
  cost_usd NUMERIC NOT NULL, provider_failures INTEGER NOT NULL DEFAULT 0,
  recovered BOOLEAN NOT NULL DEFAULT FALSE, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS simulation_execution_result_digest_idx
ON simulation_execution_results(tenant_id,run_spec_id,output_digest);
CREATE TABLE IF NOT EXISTS simulation_evaluations (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  run_spec_id BIGINT NOT NULL REFERENCES simulation_run_specs(id), fixture_version TEXT NOT NULL,
  baseline_version TEXT, metrics JSONB NOT NULL, evidence_digest CHAR(64) NOT NULL,
  evaluated_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS scenario_coverage_results (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  run_spec_id BIGINT REFERENCES simulation_run_specs(id), scenario_library_version TEXT NOT NULL,
  requirements_version TEXT NOT NULL, result JSONB NOT NULL, evidence_digest CHAR(64) NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS simulation_provenance_events (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  run_spec_id BIGINT NOT NULL REFERENCES simulation_run_specs(id), actor_id INTEGER REFERENCES users(id),
  event_type TEXT NOT NULL, from_status TEXT, to_status TEXT, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_digest CHAR(64), occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION prevent_simulation_provenance_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'simulation provenance is append-only'; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS simulation_provenance_append_only ON simulation_provenance_events;
CREATE TRIGGER simulation_provenance_append_only BEFORE UPDATE OR DELETE ON simulation_provenance_events
FOR EACH ROW EXECUTE FUNCTION prevent_simulation_provenance_mutation();
CREATE TABLE IF NOT EXISTS simulation_integration_failures (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES organizations(id),
  run_spec_id BIGINT, adapter TEXT NOT NULL, operation TEXT NOT NULL,
  retryable BOOLEAN NOT NULL, error_code TEXT NOT NULL, sanitized_detail TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
