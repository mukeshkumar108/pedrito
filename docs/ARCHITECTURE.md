# Pedrito – Architecture (Snapshot)

## High-level
- **Next.js app** with Vercel AI SDK.
- **Chat route** orchestrates auth, rate limits, model selection, tools, and streaming.
- **Artifacts system**: tool calls dispatch to per-kind handlers (text/code/image/sheet) that stream content, then save to DB.

## Flow (happy path)
1) **POST /app/(chat)/api/chat/route.ts**
   - Auth, entitlements, build `uiMessages`.
   - Calls `streamText` with `systemPrompt(...)`, `messages`, and tools.
2) **Tools** (when invoked by the model)
   - `createDocument` → resolves doc_type/kind + streams via handler.
   - `updateDocument` → minimal edits via handler.
3) **Handlers** in `lib/artifacts/*/server.ts`
   - Build system prompt, brief.
   - Stream tokens to UI (data-* deltas).
   - Save to DB on completion.

## Key Modules
- `lib/ai/providers.ts`: Provider map (OpenRouter in prod; mock in tests).
- `lib/ai/tools/create-document.ts`: Validates input, resolves doc_type/kind, dispatches handler.
- `lib/ai/tools/update-document.ts`: Loads doc, calls handler’s updater.
- `lib/artifacts/server.ts`: Shared types/registry + `createDocumentHandler` wrapper.
- `artifacts/{text,code,image,sheet}/server.ts`: Model prompts + streaming implementation per kind.

## Data/DB (brief)
- Drizzle-based save/load for chats + documents.
- `saveDocument()` is called by handlers after streaming completes.

## Notes
- Resumable streaming uses Redis (global context guarded).
- Tools are enabled/disabled based on selected chat model.
