import { generateUUID } from '@/lib/utils';
import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';
import type { ChatMessage } from '@/lib/types';

interface CreateDocumentProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  memoryBrief?: string; // optional brief injected from chat route
}

// (unchanged) classifyDocType helper …
function classifyDocType(input: {
  title?: string;
  original_request?: string;
  context?: string | string[];
}): 'letter' | 'talk' | 'essay' | 'translation' | 'report' | 'other' {
  const blob = [
    input.title || '',
    Array.isArray(input.context)
      ? input.context.join(' ')
      : input.context || '',
    input.original_request || '',
  ]
    .join(' ')
    .toLowerCase();

  if (
    /\btalk|discurso|charla|sermon|homil|speech|presentation|lecture/.test(blob)
  )
    return 'talk';
  if (/\bletter|carta|notificación|email|message|note/.test(blob))
    return 'letter';
  if (/\bessay|ensayo\b|paper|article|composition/.test(blob)) return 'essay';
  if (/\btranslate|traducci|version|language/.test(blob)) return 'translation';
  if (/\breport|informe|summary|analysis|review|assessment/.test(blob))
    return 'report';
  return 'other';
}

export const createDocument = ({
  session,
  dataStream,
  memoryBrief,
}: CreateDocumentProps) =>
  tool({
    description:
      'Create a document for writing or content creation. This tool will generate the contents of the document based on the title, type, and context.',
    inputSchema: z.object({
      title: z.string(),

      // ✅ Make `kind` default to "text" so missing values don’t crash
      kind: z.enum(artifactKinds).default('text'),

      // Accept string OR array of strings for context
      context: z.union([z.string(), z.array(z.string())]).optional(),
      language: z.enum(['es-GT', 'en']).optional(),
      tone: z.enum(['formal', 'neutral', 'warm']).optional(),
      outline: z.array(z.string()).optional(),
      length: z.enum(['short', 'medium', 'long', '5-min talk']).optional(),
      original_request: z.string().optional(),

      // Extra guidance
      must_include: z.array(z.string()).optional(),
      audience: z.string().optional(),

      // Optional doc_type
      doc_type: z
        .enum(['letter', 'talk', 'essay', 'translation', 'report', 'other'])
        .optional(),
      // optional brief injected by the orchestrator or explicitly by the model
      memory_brief: z.string().optional(),
    }),
    execute: async (payload) => {
      let {
        title,
        kind,
        context,
        language,
        tone,
        outline,
        length,
        original_request,
        doc_type,
        must_include,
        audience,
        memory_brief,
      } = payload as {
        title: string;
        kind?: (typeof artifactKinds)[number]; // may be undefined before defaulting
        context?: string | string[];
        language?: 'es-GT' | 'en';
        tone?: 'formal' | 'neutral' | 'warm';
        outline?: string[];
        length?: 'short' | 'medium' | 'long' | '5-min talk';
        original_request?: string;
        must_include?: string[];
        audience?: string;
        doc_type?:
          | 'letter'
          | 'talk'
          | 'essay'
          | 'translation'
          | 'report'
          | 'other';
        memory_brief?: string;
      };

      // Even though Zod defaults kind, keep this safety just in case:
      const safeKind: (typeof artifactKinds)[number] = kind ?? 'text';

      // Normalize context
      const normalizedContext = Array.isArray(context)
        ? context.join('\n')
        : context || '(no context provided)';

      // If model didn't supply a brief, inject the orchestrator-provided one
      if (!memory_brief && memoryBrief) {
        memory_brief = memoryBrief;
      }

      // Prepend a compact brief if available
      const contextWithBrief = memory_brief
        ? `[BRIEF]\n${memory_brief.trim()}\n\n[USER CONTEXT]\n${normalizedContext}`
        : normalizedContext;

      // Resolve doc_type
      const resolvedDocType =
        doc_type && doc_type !== 'other'
          ? doc_type
          : classifyDocType({ title, original_request, context });

      if (process.env.DEBUG_ARTIFACTS === 'true') {
        console.log(
          '[createDocument] input from model:',
          JSON.stringify(
            {
              title,
              kind: safeKind,
              language,
              tone,
              length,
              outline,
              doc_type: resolvedDocType,
              audience,
              must_include,
              context, // raw
              original_request: (original_request || '').slice(0, 500),
            },
            null,
            2,
          ),
        );
      }

      const id = generateUUID();

      // UI signals
      dataStream.write({ type: 'data-kind', data: safeKind, transient: true });
      dataStream.write({ type: 'data-id', data: id, transient: true });
      dataStream.write({ type: 'data-title', data: title, transient: true });
      dataStream.write({ type: 'data-clear', data: null, transient: true });

      const documentHandler = documentHandlersByArtifactKind.find(
        (h) => h.kind === safeKind,
      );
      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${safeKind}`);
      }

      if (process.env.DEBUG_ARTIFACTS === 'true') {
        console.log(
          '[createDocument] forwarding brief to handler:',
          JSON.stringify(
            {
              id,
              title,
              language,
              tone,
              length,
              outline,
              doc_type: resolvedDocType,
              audience,
              must_include,
              context: normalizedContext.slice(0, 1000),
              original_request: (original_request || '').slice(0, 1000),
            },
            null,
            2,
          ),
        );
      }

      if (process.env.DEBUG_ARTIFACTS === 'true') {
        console.log(
          '[createDocument] final context with brief:',
          contextWithBrief.slice(0, 1000),
        );
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
        context: contextWithBrief,
        language,
        tone,
        outline,
        length,
        original_request,
        doc_type: resolvedDocType,
        must_include,
        audience,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title,
        kind: safeKind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });
