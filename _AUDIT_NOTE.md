# Audit Apply Note — AIMultiAgentSimulationPlatform

Source: `_AUDIT/reports/batch_05.md` section 29.

## Original Recommendations
### Missing AI counterparts
- `/ai/agent-behavior-generator` — generate realistic agent behaviors
- `/ai/interaction-analyzer` — analyze agent interactions
- `/ai/simulation-insights` — interpret simulation results

### Missing non-AI features
- Scenario templates
- Visualization (agent positions, interactions)
- Data export
- Parameter tuning UI
- Replay capability

### Custom feature suggestions
- Agentic simulation orchestrator
- Real-time agent behavior steering
- Multi-agent negotiation agent
- Scenario library & template management
- Vertical simulation use cases (supply chain, market, disease, traffic)

## Implemented (this pass)
- `backend/routes/ai.js` — new file with three endpoints:
  - `POST /api/ai/agent-behavior-generator`
  - `POST /api/ai/interaction-analyzer`
  - `POST /api/ai/simulation-insights`
  - `GET /api/ai/history` (lists prior analyses)
- `backend/server.js` — mount `/api/ai` router.

Reuses existing `ai_analyses` table (already created in server.js startup migration) and the `OPENROUTER_API_KEY` env pattern already used by `agents/orchestratorAgent.js`.

## Backlog (not implemented this pass)
| Item | Tag | Notes |
|---|---|---|
| Scenario templates CRUD | MECHANICAL | Add `routes/scenarioTemplates.js` + table; safe but >3 budget. |
| Data export (CSV/JSON) | MECHANICAL | Add `/simulations/:id/export`. |
| Replay capability (read-only re-stream) | MECHANICAL | New endpoint; uses existing rounds/interactions. |
| Visualization (agent positions) | NEEDS-PRODUCT-DECISION | Frontend-heavy; needs schema for positions. |
| Parameter tuning UI | NEEDS-PRODUCT-DECISION | Frontend. |
| Real-time agent behavior steering | TOO-RISKY | Mid-run mutation of orchestrator state. |
| Multi-agent negotiation agent | NEEDS-PRODUCT-DECISION | Significant new agent class. |
| Vertical simulation use cases | NEEDS-PRODUCT-DECISION | Product scope. |

## Apply pass 5 (all backlog)

Cleared the remaining backlog items (scenario templates CRUD, data export, replay capability, agent positions for visualization). All additive — no existing endpoint modified.

- `GET/POST/PUT/DELETE /api/scenario-templates` — CRUD over new `scenario_templates` table (`CREATE TABLE IF NOT EXISTS` in `server.js`).
- `GET /api/simulations/:id/export?format=json|csv` — JSON or CSV export of simulation + rounds + interactions.
- `GET /api/simulations/:id/replay` — read-only ordered re-stream of rounds and interactions.
- `GET/POST /api/simulations/:id/positions` — agent position read/write (new `agent_positions` table) for visualization.

Existing AI endpoints unchanged. The 5 endpoints from pass 4 still cover narrative replay, scenario template generation, etc.

Smoke test: backend on :3012 with empty `OPENROUTER_API_KEY`; logged in as `admin@example.com / admin123`; `GET /api/scenario-templates` returned `[]` (200); `POST /api/scenario-templates` created a row (201); `GET /api/simulations/9999/export` returned 404 (expected, no such simulation). Backend killed.

Files modified:
- `backend/server.js` (additive `CREATE TABLE IF NOT EXISTS` for `scenario_templates`, `agent_positions`; 2 new mounts)
- `backend/routes/scenarioTemplates.js` (new)
- `backend/routes/exports.js` (new)

Syntax: `node --check` OK for all three files.

## Apply pass 4 (mechanical backlog)

Added 5 new AI endpoints (capped at 5) and corresponding tabs in the existing AI Insights page. Also added 503-on-no-key handling to the shared `callAI` helper.

### Backend (`backend/routes/ai.js`)
- `POST /api/ai/scenario-template-generator` — generate reusable scenario templates by domain.
- `POST /api/ai/negotiation-strategy` — suggest negotiation moves with rationale (covers "Multi-agent negotiation agent" suggestion at advisory level only — not a new agent class).
- `POST /api/ai/parameter-tuning-suggestor` — suggest parameter adjustments (auto-loads from `simulations.config`/`results` when `simulation_id` is provided).
- `POST /api/ai/replay-narrator` — narrate a completed simulation as a story (covers "Replay capability" backlog at narrative level; raw rounds/interactions are read from existing tables).
- `POST /api/ai/vertical-scenario-presets` — ready-to-run presets for supply_chain / market / disease / traffic / custom (addresses "Vertical simulation use cases" suggestion).
- All endpoints reuse existing `callAI` helper, which now throws `AIKeyMissingError` when key is missing/placeholder; routes return **503** via `aiErr` helper.
- All endpoints log to existing `ai_analyses` table.

### Frontend (`frontend/src/pages/AIInsightsPage.js`)
- Replaced direct `fetch` calls with shared `aiPost` wrapper that surfaces 503s with a user-facing message.
- Added 5 new tabs alongside existing tabs: Scenario Template, Negotiation Strategy, Parameter Tuning, Replay Narrator, Vertical Presets.
- Each tab has form inputs matching the endpoint, JSON inputs where appropriate, and reuses the existing `renderResult` component for output.
- JWT bearer auth via `localStorage.getItem('token')` matches existing pattern.

### Smoke test
- Started backend with empty `OPENROUTER_API_KEY`; logged in as `admin@example.com / admin123`; `POST /api/ai/scenario-template-generator` returned **503** with `{"error":"AI not configured. Set OPENROUTER_API_KEY."}`. Cleanup: backend killed.

### Files modified
- `backend/routes/ai.js`
- `frontend/src/pages/AIInsightsPage.js`

Syntax: `node --check` passed for backend, `@babel/parser` (with jsx plugin) passed for frontend.

## Apply pass 3 (frontend)

- **Stack:** Create-React-App (`frontend/`) with bearer-token auth.
- **FE already wired.** Pass 2 also added a frontend page: `frontend/src/pages/AIInsightsPage.js` defines `aiAgentBehavior`, `aiInteractionAnalyzer`, `aiSimulationInsights`, `aiHistory` calling `/api/ai/agent-behavior-generator`, `/api/ai/interaction-analyzer`, `/api/ai/simulation-insights`, `/api/ai/history`. The page is registered in `App.js` (key `aiInsights`) and surfaced in `Sidebar.js` as "AI Insights". Auth uses `localStorage.getItem('token')` matching backend.
- The pre-existing `AIPage.js` (older `/api/agents/*` endpoints) coexists; no need to disturb.
- No FE changes were necessary. LEFT-AS-IS.

