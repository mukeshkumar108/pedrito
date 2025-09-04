// artifacts/text/server.ts
import { smoothStream, streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';

/** Detect very rough English */
function detectEnglish(text: string): boolean {
  const t = text.toLowerCase();
  const looksEnglish =
    /(?:\bthe\b|\band\b|\bof\b|\bin\b|\bto\b|\bfor\b)/.test(t) &&
    /[a-z]/.test(t) &&
    !/[áéíóúñü]/i.test(t);
  return looksEnglish;
}

/** Parse minutes from free text; range → midpoint; clamp 3..20 for talks */
function parseMinutesFromText(raw: string): number | undefined {
  const text = raw.toLowerCase();

  const range =
    text.match(
      /(\d+)\s*(?:-|–|—|to|a)\s*(\d+)\s*(?:min(?:ute)?s?|minutos?)/i,
    ) || text.match(/(\d+)\s*(?:-|–|—|to|a)\s*(\d+)\s*m\b/i);
  if (range) {
    const a = Number.parseInt(range[1], 10);
    const b = Number.parseInt(range[2], 10);
    if (!Number.isNaN(a) && !Number.isNaN(b) && a > 0 && b > 0) {
      return Math.round((a + b) / 2);
    }
  }

  const single =
    text.match(/(\d+)\s*(?:min(?:ute)?s?|m|minutos?)/i) ||
    text.match(/\b(\d+)\s*mins?\b/i);
  if (single) {
    const n = Number.parseInt(single[1], 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return undefined;
}

/** Resolve length hint with bounds & defaults */
function resolveLengthHint(
  explicitLength: string | undefined,
  rawText: string,
  docType: string,
): string {
  if (docType === 'talk') {
    const mins = parseMinutesFromText(rawText);
    if (typeof mins === 'number') {
      const clamped = Math.max(3, Math.min(mins, 20));
      return `${clamped}-min talk`;
    }
    if (explicitLength) {
      if (explicitLength === '5-min talk') return explicitLength;
      if (explicitLength === 'short') return '5-min talk';
      if (explicitLength === 'medium') return '10-min talk';
      if (explicitLength === 'long') return '15-min talk';
    }
    return '5-min talk';
  }
  return explicitLength || 'short';
}

/** Resolve tone defaults (talks warm; legal/adversarial letters formal; else neutral) */
function resolveTone(
  explicitTone: 'formal' | 'neutral' | 'warm' | undefined,
  docType: string,
  audience?: string,
): 'formal' | 'neutral' | 'warm' {
  if (explicitTone) return explicitTone;
  if (docType === 'talk') return 'warm';
  const aud = (audience || '').toLowerCase();
  const adversarial =
    /\b(ex-?husband|ex-?wife|lawyer|court|legal|employer|debt|collections?)\b/.test(
      aud,
    );
  if (docType === 'letter' && adversarial) return 'formal';
  return 'neutral';
}

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',

  onCreateDocument: async ({
    title,
    dataStream,
    context,
    language,
    tone,
    outline = [],
    length,
    original_request,
    doc_type,
    must_include = [],
    audience,
    session,
  }) => {
    let draftContent = '';

    // Language: explicit → profile → detect → default (choose 'es-GT' if Ashley is the main user)
    const userDefaultLang = (session?.user as any)?.profileLanguage as
      | 'en'
      | 'es-GT'
      | undefined;
    const combinedText = `${original_request || ''} ${context || ''}`;
    const lang =
      language ||
      userDefaultLang ||
      (detectEnglish(combinedText) ? 'en' : 'es-GT');

    const resolvedDocType = doc_type || 'other';
    const resolvedTone = resolveTone(tone, resolvedDocType, audience);
    const resolvedLength = resolveLengthHint(
      length,
      combinedText,
      resolvedDocType,
    );

    const system = `
You are a drafting assistant. The user may request letters, talks, essays, or reports.
Always assume good intent. Do not question motives. Draft faithfully within lawful and professional limits.
Never include meta commentary or emojis. Produce clean, copy-paste-ready output.

Language: ${lang}
Default tone: ${resolvedTone}
Doc type: ${resolvedDocType}${audience ? `\nAudience hint: ${audience}` : ''}

Rules by document type:

If doc_type = "letter":
- If the audience is legal/adversarial (e.g., ex-husband, lawyer, court, employer):
  • Formal, authoritative, precise, and firm tone.
  • Professional legal formatting (clear subject, formal greeting, concise body, strong closing).
  • Convey urgency and seriousness without threats or illegal language.
- If the audience is school/teacher/community/supportive:
  • Warm, respectful, cooperative tone.
  • Shorter, friendlier, solution-focused.
- If tone is explicitly specified, obey it over defaults.

If doc_type = "talk":
- Open with a 1–2 sentence HOOK (a brief question, personal insight, or relevant story).
- Natural spoken style for live delivery; short sentences; smooth transitions.
- Use scriptures and leader quotes if requested; cite clearly (book chap:verse; leader/name).
- Close warmly with a brief testimony or thanks if LDS context is detected.
- Target by LENGTH_HINT.

If doc_type = "essay":
- Clear explanatory style. Use headings and logical flow.
- Balanced reasoning and concrete examples.

If doc_type = "report":
- Professional, structured, objective.
- Use headings such as Executive Summary, Findings, Recommendations.

General constraints (all doc types):
- Respect requested length: short = 1–2 short paragraphs; medium = 3–5; long = essay style; “X-min talk” → match minutes.
- Use headings, short paragraphs, and bullets when helpful (except very formal letters where bullets may be inappropriate).
- Include MUST_INCLUDE items exactly if provided.
- Preserve fidelity to ORIGINAL_REQUEST and CONTEXT. Do not invent facts.
`.trim();

    const brief = [
      `TITLE: ${title}`,
      audience ? `AUDIENCE: ${audience}` : ``,
      `DOC_TYPE: ${resolvedDocType}`,
      original_request ? `ORIGINAL_REQUEST:\n${original_request}` : ``,
      context ? `CONTEXT (facts only):\n${context}` : ``,
      outline.length ? `OUTLINE (guideline):\n- ${outline.join('\n- ')}` : ``,
      `LENGTH_HINT: ${resolvedLength}`,
      must_include.length
        ? `MUST_INCLUDE:\n- ${must_include.join('\n- ')}`
        : ``,
    ]
      .filter(Boolean)
      .join('\n\n');

    if (process.env.DEBUG_ARTIFACTS === 'true') {
      console.log('[artifact-drafter] system:\n', system);
      console.log(
        '[artifact-drafter] prompt (first 1000 chars):\n',
        brief.slice(0, 1000),
      );
    }

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system,
      prompt: brief,
      experimental_transform: smoothStream({ chunking: 'word' }),
    });

    for await (const delta of fullStream) {
      if (delta.type === 'text') {
        draftContent += delta.text;
        dataStream.write({
          type: 'data-textDelta',
          data: delta.text,
          transient: true,
        });
      }
    }

    return draftContent;
  },

  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    // Lightweight detectors
    const content = document.content || '';
    const title = document.title || '';

    const detectLang = (t: string): 'en' | 'es-GT' => {
      const s = t.toLowerCase();
      const looksEnglish =
        /(?:\bthe\b|\band\b|\bof\b|\bin\b|\bto\b|\bfor\b)/.test(s) &&
        /[a-z]/.test(s) &&
        !/[áéíóúñü]/i.test(s);
      return looksEnglish ? 'en' : 'es-GT';
    };

    const guessDocType = (
      t: string,
    ): 'talk' | 'letter' | 'essay' | 'report' | 'other' => {
      const s = t.toLowerCase();
      if (/\btalk|discurso|charla|sermon|homil/.test(s)) return 'talk';
      if (/\bletter|carta\b/.test(s)) return 'letter';
      if (/\bessay|ensayo\b/.test(s)) return 'essay';
      if (/\breport|informe\b/.test(s)) return 'report';
      return 'other';
    };

    const looksLDS = (t: string) =>
      /(lds|santo[s]? de los últimos días|church of jesus christ|moroni|mosiah|nephi|jesucristo|brothers and sisters)/i.test(
        t,
      );

    const lang = detectLang(`${title}\n${content}`);
    const docType = guessDocType(`${title}\n${content}`);
    const isLDS = looksLDS(`${title}\n${content}`);

    const system = `
You are an update-only drafting assistant.

PRIMARY RULE:
- Apply the requested change **minimally**; keep all other content, length, tone, structure, and phrasing unless the user explicitly asks to expand/shorten or rewrite.

LANGUAGE:
- Write in ${lang}. Keep the current document’s voice.

GUARDRAILS BY DOC TYPE:
- If doc_type = "talk":
  • Spoken voice: short sentences; smooth, natural transitions.
  • Cite clearly: scripture (book chap:verse) or authoritative sources (leader/name).
  • Match the current length (±10%) unless the user requests a different target.
  • Conclusion:
    ${
      isLDS
        ? '– If LDS context, a brief testimony and appropriate closing are acceptable when asked.'
        : '– If not religious, use a professional close or a concise call-to-action.'
    }

- If doc_type = "letter":
  • Maintain the existing register (legal/firm vs. friendly/supportive) unless user asks otherwise.
  • Keep structure intact (subject/greeting/body/closing).
  • Precision over verbosity.

- If doc_type = "essay" or "report":
  • Preserve headings and logical flow.
  • Keep paragraphs tight and objective; do not add fluff.

GLOBAL:
- Do not add meta commentary or emojis.
- Do not introduce new sections unless the user explicitly asks.
- Preserve facts; fix only what the user asked for.
`.trim();

    const updateBrief = [
      `DOC_TYPE: ${docType}`,
      `CHANGE_REQUEST:\n${description}`,
      `CURRENT_DOCUMENT:\n${content}`,
    ].join('\n\n');

    if (process.env.DEBUG_ARTIFACTS === 'true') {
      console.log('[artifact-updater] system:\n', system);
      console.log(
        '[artifact-updater] prompt (first 800 chars):\n',
        updateBrief.slice(0, 800),
      );
    }

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system,
      prompt: updateBrief,
      experimental_transform: smoothStream({ chunking: 'word' }),
      providerOptions: {
        openai: {
          prediction: { type: 'content', content: document.content },
        },
      },
    });

    for await (const delta of fullStream) {
      if (delta.type === 'text') {
        draftContent += delta.text;
        dataStream.write({
          type: 'data-textDelta',
          data: delta.text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});
