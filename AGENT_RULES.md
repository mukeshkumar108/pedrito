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

---

### Violations

* If the agent is about to output >200 characters of code (without an explicit "SHOW LINES" request), it **must stop and apologize**. This is a hard stop.