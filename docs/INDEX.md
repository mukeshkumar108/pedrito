# Docs Index

This project splits **process/rules** at the repo root and **system knowledge** under `/docs`.

## Repo Rules & Operations (root)

- **/AGENT_RULES.md** — Operating modes (PLAN / READ / ACT), output limits, budgets.
- **/CONTRIBUTING.md** — How to change code & docs together (tiny, incremental patches).
- **/ENTRYPOINTS.md** — Key surfaces to modify (API routes, tools, handlers).
- **/RUNBOOK.md** — Operate, debug, common incidents, how to ask for help.
- **/TESTING.md** — How to run tests, acceptance checks, what “done” means.
- _Optional_: **/AGENT_QUICKSTART.md** — Copy/paste prompts for agents.
- _Optional_: **/CLINE_PLAYBOOK.md** — Cline-specific PLAN/READ/ACT prompts.
- **/.agentignore** — paths the agent must not scan (build, deps, secrets)

## System Knowledge (/docs)

- **/docs/ARCHITECTURE.md** — High-level map: Next.js, chat route, artifacts, flows.
- **/docs/MODEL_MAP.md** — Model wiring (chat, reasoning, artifact) + where used.
- **/docs/FLOWS.md** — User journeys: chat → tools → handlers → DB.
- **/docs/FEATURES.md** — Current features + short roadmap.

## Conventions

- Root files = _how_ we work (rules, process, ops).
- `/docs/*`   = _what_ the system is and _how_ it behaves.
- Any code change that alters behavior **must** come with a doc change (see `/CONTRIBUTING.md`).
