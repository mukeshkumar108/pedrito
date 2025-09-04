# User Flows & Behaviors

## Chat
- User sends a message → `POST /api/chat` builds `uiMessages` → `streamText(...)` with `systemPrompt`.
- Model may call tools (below). Responses stream token-by-token to the UI.

## Create Document (tool)
**When used:**
- Request is a "real document" (>10 lines) or user asks explicitly.
**What we pass:**
- `title`, `kind` (default `text` unless specified), `context` (string or bullets), `language`, `tone`, `outline`, `length`, `original_request`, optional `doc_type`, `must_include`, `audience`.
**What happens:**
- `create-document.ts` normalizes/infers doc_type and streams via the correct handler.
- Text handler resolves language/tone/length (talks clamp to 3–20 min), builds a tailored system prompt, and streams content.
- On completion → document saved, UI shows artifact.

## Update Document (tool)
**When used:** user asks for edits/refinements.  
**Guardrails:**
- "Apply the change **minimally**; keep length/tone/structure unless asked."
- Talks: spoken voice, clear citations, keep within LENGTH_HINT ±10%.
**What happens:**
- Loads the doc → sends "diff-style" prompt to artifact model → streams patch → saves.

## Suggestions (tool)
- Lightweight helper to surface next-best edits or options ("Want me to add citations?").

## Weather (tool)
- Example of a simple external tool call gated by model selection.
