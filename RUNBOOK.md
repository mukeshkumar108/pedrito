# Runbook: Quick Smoke & Common Gotchas

## First boot (human)
1) `pnpm install`
2) Ensure `.env.local` has required keys (see `.env.example`).
3) `pnpm dev` → open http://localhost:3000

## Sanity checks
- Auth loads, you can open chat.
- Send a message; response streams.
- Use “Create Document” → artifact opens, streams text.

## Common issues
- **Type errors**: run `pnpm typecheck` and fix offending files.
- **Model/provider errors**: check OpenRouter key and model IDs in `lib/ai/providers.ts`.
- **DB issues**: confirm Drizzle migrations ran; verify DB URL.
- **Edge incompat**: if edge warnings (e.g., bcrypt) appear, keep those routes on Node runtime.

## When things break
- Capture the exact error message and the file/line, paste into chat.
- Agent will propose **one tiny patch** or ask for **one targeted read**.

