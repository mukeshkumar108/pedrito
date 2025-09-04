# Agent Operating Rules

This document defines strict rules for how the agent may operate in this repository. The goal is to keep analysis scoped, costs predictable, and output minimal.

---

### Core Protocol

* **Modes of Operation:** The agent operates in distinct modes to prevent mistakes and token overruns.
    * **PLAN MODE (Default):** Propose actions only. No file reads, no code, and no diffs.
    * **READ MODE (After Approval):** Access only approved files and line ranges. Summarize; show at most 0–3 lines per file, with an absolute maximum of 10 lines total.
    * **ACT MODE (Explicit Only):** Propose changes. Use `diff --unified` format only, with ±3 lines of context. Never output full files. Stop if the change is >150 lines or touches >3 files.
* **Initial Confirmation:** At the start of every session, the agent must confirm:
    > "I have read and will adhere to /AGENT_RULES.md and the exclusions in /.agentignore."

---

### Hard Limits & Constraints

* **Read-Only Default:** The agent is **read-only** unless explicitly told to enter **ACT MODE**.
* **No Execution:** Never run commands, tests, or builds.
* **No Secrets:** Never reveal or log API keys, environment variables, or credentials.
* **Budgeting:**
    * Provide a rough token estimate and a running meter with every response.
    * If a step is >20k tokens, stop and ask to narrow the scope.
* **Scoping:**
    * Respect `/.agentignore`.
    * Only access files and ranges explicitly approved.

## Agentignore Compliance (Mandatory)
- In PLAN MODE, always include `/.agentignore` in the requested reads.
- In READ MODE, summarize its top-level patterns (e.g., build artefacts, secrets, large folders).
- If `.agentignore` is missing or empty, stop and ask before scanning unknown paths.

---

### PLAN MODE Rules (Default)

* **Purpose:** To map out the next steps.
* **Output Restrictions:**
    * No code, snippets, or diffs under any circumstances.
    * Must return **exactly** the following:
        * A concise plan (≤5 bullets).
        * Requested reads (file paths + ranges + one-line reason each).
        * A token budget estimate.
        * The current meter.
* If uncertain, ask questions instead of outputting code.

---

### READ MODE Rules (After Approval)

* **Purpose:** To minimally summarize approved files.
* **Output Restrictions:**
    * Provide 2–3 bullets per file summarizing its purpose.
    * Evidence is capped at 0–3 lines per file, with a maximum of 10 lines total across the entire task.
    * Never dump imports, schemas, or boilerplate.
* If more context is needed, request additional ranges instead of pasting code.

---

### ACT MODE Rules (Explicit Only)

* **Purpose:** To propose code changes.
* **Output Restrictions:**
    * **Diffs only** (`diff --unified`, ±3 lines of context).
    * Each diff must include:
        * A 2–4 bullet rationale.
        * A rollback note.
* The agent must stop and request approval if:
    * The diff is >150 lines, or
    * The change spans >3 files.
* Never output entire files disguised as diffs.

## Verification Protocol (no execution)
Agents must not run builds or tests. After proposing diffs:
- Ask the human to run `pnpm lint`, `pnpm typecheck`, and/or `pnpm dev` locally.
- Request only **errors/warnings text** back (no full logs).
- If verification fails, propose **one tiny follow-up patch** to fix the most likely issue, or ask for one targeted read (path:line-range) to inspect.

## Failure Protocol
When a tool call or generation step fails:
- Stop, report the failure briefly (1–2 lines), and list **two plausible causes**.
- Propose **one** minimal next step (e.g., a specific file read with line range, or a tiny patch).
- If secrets or execution would be required to proceed, state that explicitly and wait for human guidance.

---

Doc Sync Is Mandatory:
- Any code patch in ACT MODE must include minimal, incremental patches to /docs.
- Never replace entire docs; only add the smallest diff that brings them up to date.
- If unsure which doc to update, propose tiny candidates and ask.

---

### Violations

* If the agent is about to output >200 characters of code (without an explicit "SHOW LINES" request), it **must stop and apologize**. This is a hard stop.
