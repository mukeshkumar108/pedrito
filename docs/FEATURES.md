# Current Features (User-Facing)

## Drafting
- **Talks (LDS or general)**: Warm tone by default; clear scripture/leader citations; 3–20 min caps with smart defaults.
- **Letters**: Formal or warm tone based on audience; structured formatting.
- **Essays/Reports**: Headings, logical flow, concise style.

## Editing
- **Inline updates** via "Update Document" without starting over.
  - Minimal-change rule preserves length/structure.
  - Smart closing rules (e.g., LDS testimony when asked).

## Multilingual
- English default; Spanish (es-GT) supported; simple detection fallback.

## Streaming UI
- Live token streaming into the artifact pane.
- Persist to DB on completion.

## What's Next (shortlist)
- Goldfish (short-term working memory): rolling summary + last-N messages for cheaper context.
- Model routing: everyday vs. legal-heavy vs. web-research.
- True image model hookup (remove placeholder).
- Move shared types to `lib/types.ts` (done if merged).
