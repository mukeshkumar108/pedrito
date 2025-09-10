import { myProvider } from '@/lib/ai/providers';
import { generateText } from 'ai';

export interface Summarizer {
  summarizePlain(
    convo: { role: 'user' | 'assistant'; content: string }[],
    tier: 'short' | 'medium' | 'long',
    language: 'en' | 'es',
  ): Promise<string>; // returns tier-appropriate sentences (plain text) in detected language

  summarizeStructured(
    convo: { role: 'user' | 'assistant'; content: string }[],
    language: 'en' | 'es',
  ): Promise<StructuredMemory>; // returns structured memory with facts, decisions, etc.
}

export interface StructuredMemory {
  // Natural language summary (concise)
  summary: string;

  // Unlimited factual details
  facts: string[];

  // Open questions/decisions pending
  openItems: string[];

  // Key decisions made
  decisions: string[];

  // Quality metadata
  metadata: {
    confidence: number;
    language: 'en' | 'es';
    extractedAt: Date;
  };
}

function buildPrompt(
  convoLines: string,
  tier: 'short' | 'medium' | 'long',
  language: 'en' | 'es',
): string {
  const sentenceGuide = {
    en: {
      short: '1–2 sentences',
      medium: '2–3 sentences',
      long: '3–5 sentences',
    },
    es: {
      short: '1–2 oraciones',
      medium: '2–3 oraciones',
      long: '3–5 oraciones',
    },
  };

  const instructions = {
    en: [
      'You are a conversation summarizer.',
      `Rewrite the dialogue so far into ${sentenceGuide.en[tier]} that preserve:`,
      '- Key people, names, relationships',
      '- Important facts (ages, places, events)',
      '- Emotional tone and ongoing concerns',
      '- Open threads or pending questions',
      'Keep it compact, fluent, and natural. No lists, no bullets, no JSON — just plain sentences.',
    ],
    es: [
      'Eres un resumidor de conversaciones.',
      `Reescribe el diálogo hasta ahora en ${sentenceGuide.es[tier]} que preserven:`,
      '- Personas clave, nombres, relaciones',
      '- Hechos importantes (edades, lugares, eventos)',
      '- Tono emocional y preocupaciones continuas',
      '- Temas abiertos o preguntas pendientes',
      'Manténlo compacto, fluido y natural. Sin listas, sin viñetas, sin JSON — solo oraciones simples.',
    ],
  };

  return [
    ...instructions[language],
    '',
    'Conversation (oldest first, newest last):',
    convoLines,
  ].join('\n');
}

export class ModelSummarizer implements Summarizer {
  async summarizePlain(
    convo: { role: 'user' | 'assistant'; content: string }[],
    tier: 'short' | 'medium' | 'long',
    language: 'en' | 'es',
  ): Promise<string> {
    const modelId = 'summarizer-model'; // from provider map
    const convoLines = convo
      .map((m) =>
        language === 'es'
          ? `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`
          : `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
      )
      .join('\n')
      .slice(0, 12000); // hard cap to be safe

    const prompt = buildPrompt(convoLines, tier, language);

    try {
      const res = await generateText({
        model: myProvider.languageModel(modelId),
        temperature: 0,
        prompt,
        experimental_activeTools: [], // Explicitly disable tools for summarizer
        tools: {}, // Ensure no tools are available
      });
      const text = (res?.text || '').trim();
      if (!text) throw new Error('Empty summarizer output');

      // One more guard: forbid lists/JSON
      if (
        text.includes('{') ||
        text.includes('}') ||
        text.includes('•') ||
        text.includes('- ')
      ) {
        // take first sentence chunk as ultra-safe fallback
        return `${text.split(/\.\s+/).slice(0, 3).join('. ')}.`;
      }
      return text;
    } catch (error) {
      // Log the model error for debugging
      console.error(`[ModelSummarizer] Failed to use model ${modelId}:`, error);

      // Try fallback models in order of preference (using logical names from provider map)
      const fallbackModels = [
        'chat-model',
        'chat-model-reasoning',
        'artifact-model',
      ];
      for (const fallbackModel of fallbackModels) {
        try {
          console.log(
            `[ModelSummarizer] Trying fallback model: ${fallbackModel}`,
          );
          const res = await generateText({
            model: myProvider.languageModel(fallbackModel),
            temperature: 0,
            prompt,
            experimental_activeTools: [], // Explicitly disable tools for all fallback models
            tools: {}, // Ensure no tools are available
          });
          const text = (res?.text || '').trim();
          if (text) {
            console.log(
              `[ModelSummarizer] Fallback model ${fallbackModel} succeeded`,
            );
            return text;
          }
        } catch (fallbackError) {
          console.error(
            `[ModelSummarizer] Fallback model ${fallbackModel} also failed:`,
            fallbackError,
          );
          continue;
        }
      }

      // If all models fail, return a safe default summary
      console.error('[ModelSummarizer] All models failed, using safe default');
      return language === 'es'
        ? 'La conversación incluye varios temas importantes que el usuario mencionó.'
        : 'The conversation includes several important topics that the user mentioned.';
    }
  }

  async summarizeStructured(
    convo: { role: 'user' | 'assistant'; content: string }[],
    language: 'en' | 'es',
  ): Promise<StructuredMemory> {
    const modelId = 'summarizer-model'; // from provider map
    const fullConversation = convo
      .map((m) =>
        language === 'es'
          ? `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`
          : `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
      )
      .join('\n')
      .slice(0, 12000);

    const structuredPrompt = buildStructuredPrompt(fullConversation, language);

    try {
      const res = await generateText({
        model: myProvider.languageModel(modelId),
        temperature: 0,
        prompt: structuredPrompt,
        experimental_activeTools: [], // Explicitly disable tools for summarizer
        tools: {}, // Ensure no tools are available
      });

      const text = (res?.text || '').trim();
      if (!text) throw new Error('Empty structured summarizer output');

      const parsedMemory = parseStructuredOutput(text, language);

      // Extract additional facts using pattern matching
      const extractedFacts = extractAdditionalFacts(convo, language);
      parsedMemory.facts.push(...extractedFacts);

      return parsedMemory;
    } catch (error) {
      console.error(`[ModelSummarizer] Structured summary failed:`, error);

      // Fallback: Extract basic structured memory using pattern matching only
      const extractedFacts = extractAdditionalFacts(convo, language);
      const simpleSummary = await this.summarizePlain(convo, 'short', language);

      return {
        summary: simpleSummary,
        facts: extractedFacts,
        openItems: [],
        decisions: [],
        metadata: {
          confidence: 0.5,
          language,
          extractedAt: new Date(),
        },
      };
    }
  }
}

// Helper functions for structured memory extraction
function buildStructuredPrompt(
  fullConversation: string,
  language: 'en' | 'es',
): string {
  const instructions =
    language === 'en'
      ? {
          title: 'Extract Structured Memory from Conversation (Facts Only)',
          summary:
            'Provide a concise 1-2 sentence summary of the main conversation topics and key user information.',
          facts:
            'Extract ONLY user-provided facts about themselves (name, profession, family, location, preferences). DO NOT include creative fiction, hypothetical scenarios, or AI-generated stories.',
          decisions:
            'List key actions taken (documents created, tasks completed) and user requests fulfilled.',
          openItems:
            'Identify pending user questions, unresolved requests, or incomplete tasks.',
          contentFilter:
            'IMPORTANT: Distinguish between REAL user information vs creative/AI-generated content. Only include verified user facts, not fictional narratives.',
          format:
            'Output in clear sections with bullet points. Focus on real user details and conversation outcomes.',
        }
      : {
          title:
            'Extraer Memoria Estructurada de la Conversación (Solo Hechos)',
          summary:
            'Proporciona un resumen conciso de 1-2 oraciones de los temas principales de conversación e información clave del usuario.',
          facts:
            'Extrae SOLO hechos proporcionados por el usuario sobre sí mismo (nombre, profesión, familia, ubicación, preferencias). NO incluyas ficción creativa, escenarios hipotéticos, o historias generadas por IA.',
          decisions:
            'Lista acciones clave tomadas (documentos creados, tareas completadas) y solicitudes del usuario cumplidas.',
          openItems:
            'Identifica preguntas pendientes del usuario, solicitudes sin resolver, o tareas incompletas.',
          contentFilter:
            'IMPORTANTE: Distingue entre información REAL del usuario vs contenido creativo/generado por IA. Incluye solo hechos verificados del usuario, no narrativas ficticias.',
          format:
            'Salida en secciones claras con viñetas. Enfócate en detalles reales del usuario y resultados de conversación.',
        };

  return `
${instructions.title}

INSTRUCTIONS:
1. ${instructions.summary}
2. ${instructions.facts}
3. ${instructions.decisions}
4. ${instructions.openItems}

${instructions.contentFilter}

${instructions.format}

OUTPUT FORMAT:
SUMMARY: {brief summary}

FACTS:
• {real user fact 1}
• {real user fact 2}

DECISIONS:
• {action taken 1}
• {task completed 1}

OPEN ITEMS:
• {pending item 1}

Conversation:
${fullConversation}
  `.trim();
}

function parseStructuredOutput(
  text: string,
  language: 'en' | 'es',
): StructuredMemory {
  const lines = text.split('\n').map((line) => line.trim());

  let summary = '';
  const facts: string[] = [];
  const decisions: string[] = [];
  const openItems: string[] = [];

  let currentSection: 'summary' | 'facts' | 'decisions' | 'openItems' | null =
    null;

  for (const line of lines) {
    if (!line) continue;

    // Detect section headers
    if (line.toUpperCase().startsWith('SUMMARY:')) {
      summary = line.substring(8).trim();
      currentSection = 'summary';
    } else if (
      line.toUpperCase().startsWith('FACTS:') ||
      (language === 'es' && line.toUpperCase().startsWith('HECHOS:'))
    ) {
      currentSection = 'facts';
    } else if (
      line.toUpperCase().startsWith('DECISIONS:') ||
      (language === 'es' && line.toUpperCase().startsWith('DECISIONES:'))
    ) {
      currentSection = 'decisions';
    } else if (
      line.toUpperCase().startsWith('OPEN ITEMS:') ||
      (language === 'es' && line.toUpperCase().startsWith('TEMAS ABIERTOS:'))
    ) {
      currentSection = 'openItems';
    } else if (
      line.startsWith('•') ||
      line.startsWith('-') ||
      line.startsWith('*')
    ) {
      // Bullet point content
      const content = line.substring(1).trim();
      if (content && currentSection) {
        switch (currentSection) {
          case 'facts':
            if (content.length > 10) facts.push(content);
            break;
          case 'decisions':
            if (content.length > 10) decisions.push(content);
            break;
          case 'openItems':
            if (content.length > 10) openItems.push(content);
            break;
        }
      }
    }
  }

  // Fallback summary if none extracted
  if (!summary) {
    summary =
      language === 'es'
        ? 'Conversación sobre temas diversos mencionados por el usuario.'
        : 'Conversation about various topics mentioned by the user.';
  }

  return {
    summary,
    facts,
    decisions,
    openItems,
    metadata: {
      confidence:
        facts.length + decisions.length + openItems.length > 0 ? 0.8 : 0.6,
      language,
      extractedAt: new Date(),
    },
  };
}

function extractAdditionalFacts(
  convo: { role: 'user' | 'assistant'; content: string }[],
  language: 'en' | 'es',
): string[] {
  const allText = convo.map((m) => m.content).join(' ');
  const facts: string[] = [];

  // Extract dates
  const dateMatches = allText.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g);
  if (dateMatches) {
    facts.push(
      ...dateMatches.map(
        (date) => `${language === 'es' ? 'Fecha' : 'Date'}: ${date}`,
      ),
    );
  }

  // Extract monetary amounts
  const moneyMatches = allText.match(
    /\$\d+|\d+\s*(?:dollars?|USD|euros?|EUR)/gi,
  );
  if (moneyMatches) {
    facts.push(
      ...moneyMatches.map(
        (amount) => `${language === 'es' ? 'Monto' : 'Amount'}: ${amount}`,
      ),
    );
  }

  // Extract names (basic pattern)
  const nameMatches = allText.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g);
  if (nameMatches) {
    facts.push(
      ...nameMatches.map(
        (name) => `${language === 'es' ? 'Nombre' : 'Name'}: ${name}`,
      ),
    );
  }

  // Extract numbers with context
  const numberMatches = allText.match(
    /\b\d+(?:\.\d+)?\s+(?:days?|months?|years?|hours?|minutes?|people|items)/gi,
  );
  if (numberMatches) {
    facts.push(
      ...numberMatches.map(
        (num) => `${language === 'es' ? 'Cantidad' : 'Quantity'}: ${num}`,
      ),
    );
  }

  return facts;
}

// Validate that summarizer model is available and consistent
function validateSummarizerModel(): void {
  const envModel = process.env.SUMMARIZER_MODEL_ID;
  const defaultModel = 'openai/gpt-oss-20b';

  if (envModel) {
    console.log(`[Summarizer] Using model from environment: ${envModel}`);
    console.log(
      `[Summarizer] Fallback chain: chat-model → chat-model-reasoning → artifact-model`,
    );
  } else {
    console.log(`[Summarizer] Using default model: ${defaultModel}`);
    console.log(
      `[Summarizer] Fallback chain: chat-model → chat-model-reasoning → artifact-model`,
    );
  }

  // Warn if we're about to use a model that might not exist
  const modelToUse = envModel || defaultModel;
  if (
    modelToUse !== 'liquid/lfm-3b' &&
    ![
      'summarizer-model',
      'chat-model',
      'chat-model-reasoning',
      'artifact-model',
    ].includes(modelToUse)
  ) {
    console.warn(
      `[Summarizer] Warning: Model ${modelToUse} may not be available. Using fallback chain if needed.`,
    );
  }
}

export function getSummarizer(): Summarizer {
  validateSummarizerModel();
  return new ModelSummarizer();
}
