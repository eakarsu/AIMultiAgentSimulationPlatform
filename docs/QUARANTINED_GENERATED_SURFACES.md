# Quarantined generated surfaces

The legacy simulation, agent, direct AI, SSE, auto-mounted feature, and `gap-*` routes remain in the repository for provenance review but are intentionally absent from `backend/server.js`. They include in-process generated/provider execution, in-memory records, and ungoverned mutations. They are not implementation evidence and must not be re-mounted without tenant isolation, sandbox execution, typed adapters, approvals, durable state, failure handling, and acceptance tests.
