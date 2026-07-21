# Governed multi-agent simulation operations

The production boundary is `/api/governed-runs`. It records versioned scenario/config/fixture/repository inputs, immutable commit and content digests, deterministic seeds and job idempotency keys, approvals, sandbox constraints, execution artifacts, benchmark evaluations, scenario coverage, and append-only provenance. Generated legacy simulation/AI/streaming/gap routes are not mounted.

## Lifecycle

1. Copy `.env.example` to an untracked runtime environment and provide secrets through a secret manager.
2. Run `./scripts/bootstrap.sh` to install lockfiles; this never changes database state.
3. Back up and review the target, then run `ALLOW_SCHEMA_MUTATION=yes DATABASE_URL=... ./scripts/migrate.sh`.
4. Development seed data is separately guarded by `ALLOW_DEVELOPMENT_SEED=yes` and forbidden in production.
5. Run `./start.sh`. It refuses weak secrets, incomplete database configuration, missing dependencies, and occupied ports. It never installs, starts PostgreSQL, creates/migrates/seeds a database, or kills another process.

## Execution and write controls

Run specs require a read-only repository checkout, ephemeral filesystem, bounded CPU/memory/time, default-deny network, and explicit secret/tool allowlists. Creators cannot approve their work; two reviewers are required. Only operators can queue/run work after every typed adapter is operationally ready. Queuing creates deterministic jobs; no route executes untrusted code in the API process. External writes through repositories, CI, ticketing, or artifacts require the queued adapter boundary and provenance.

Workers record result and artifact digests, provider failures, recovery, latency, cost, and concurrency. Evaluators compare versioned fixtures and baselines for correctness, reliability, P95 latency, total cost, regressions, determinism, provider failure, concurrency, and recovery. The durable scenario-coverage endpoint replaces the generated analyzer and reports evidence-linked gaps.

## External gates

Authorized repository/CI/model/telemetry/secrets/artifact/ticketing/sandbox credentials, container or microVM isolation validation, provider contract tests, recovery drills, concurrency/load tests, migration/restore rehearsals, red-team testing, and security/platform-owner approval remain required. Local source and policy tests cannot prove sandbox containment or production fitness.
