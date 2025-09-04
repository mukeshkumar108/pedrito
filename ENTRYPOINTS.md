# Entry Points

## API Routes
- POST /app/(chat)/api/chat → main chat orchestration (models, tools, streaming)
- DELETE /app/(chat)/api/chat → delete chat (cleanup)

## AI Tools (function-calling)
- createDocument → lib/ai/tools/create-document.ts
- updateDocument → lib/ai/tools/update-document.ts
- requestSuggestions → lib/ai/tools/request-suggestions.ts
- getWeather → lib/ai/tools/get-weather.ts

## Artifact Handlers
- text → artifacts/text/server.ts
- code → artifacts/code/server.ts
- sheet → artifacts/sheet/server.ts
- image → artifacts/image/server.ts

### Scripts
- Build/test/dev scripts live in `package.json`. If you add or rename scripts, update this section with the new names (e.g., `lint`, `typecheck`, `dev`, `build`, `test`).
