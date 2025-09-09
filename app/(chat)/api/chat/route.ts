import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { sanitizeText } from '@/lib/ai/sanitize';
import { getSummarizer } from '@/lib/ai/summarizer';
import { measureConversation, pickSummaryTier } from '@/lib/ai/salience';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import {
  formatStructuredMemoryToPrompt,
  createToolMemoryBrief,
  recencyWeighting,
} from '@/lib/ai/memory-utils';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      console.error(
        'Failed to create resumable stream context:',
        error.message,
      );
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const enableMemorySlice = process.env.MEMORY_SLICE === '1';
    const MIN_TURNS_FOR_SUMMARY = Number(process.env.MEMORY_MIN_TURNS ?? 5);
    let memoryBrief = '';
    let systemWithMemory = systemPrompt({
      selectedChatModel,
      requestHints: { longitude: '0', latitude: '0', city: '', country: '' },
    });
    let messagesToSend = uiMessages;

    // Declare variables outside the if block so they're accessible later
    const convo = uiMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: (m.parts?.map?.((p: any) => p.text || '').join(' ') || '')
          .replace(
            /^(Reasoned .*|We need to respond .*|User says .*|Assistant .*):?/i,
            '',
          )
          .trim(),
      }))
      .filter((m) => m.content.length > 0);

    const { tokensApprox, salience, language } = measureConversation(convo);
    const minTokens = Number(process.env.MEMORY_MIN_TOKENS ?? 400);
    const minSal = Number(process.env.MEMORY_MIN_SALIENCE ?? 3);
    const shouldSummarize = tokensApprox >= minTokens || salience >= minSal;

    if (enableMemorySlice) {
      if (convo.length >= MIN_TURNS_FOR_SUMMARY && shouldSummarize) {
        try {
          // Use structured memory extraction
          const structuredMemory = await getSummarizer().summarizeStructured(
            convo,
            language,
          );

          // Apply recency weighting based on recent messages
          const recentMessages = uiMessages.slice(-3); // Last 3 messages for recency
          const enhancedMemory = recencyWeighting(
            structuredMemory,
            recentMessages,
          );

          // Format structured memory for system prompt
          const memoryBlock = formatStructuredMemoryToPrompt(enhancedMemory);
          systemWithMemory = `${systemWithMemory}\n\n${memoryBlock}`;

          // Create compact brief for tools with most relevant information
          memoryBrief = createToolMemoryBrief(enhancedMemory);

          if (process.env.NODE_ENV !== 'production') {
            console.log(
              `[memory] Extracted ${enhancedMemory.facts.length} facts, ${
                enhancedMemory.decisions.length
              } decisions, ${
                enhancedMemory.openItems.length
              } open items. Confidence: ${enhancedMemory.metadata.confidence}`,
            );
          }

          // Dynamic lastK calculation (unchanged)
          const lastKMax = Number(process.env.MEMORY_LAST_K_MAX ?? 10);
          const dynamicLastK = Math.max(
            4,
            Math.min(lastKMax, Math.round(tokensApprox / 500) + 3),
          );
          messagesToSend = uiMessages.slice(-dynamicLastK);
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              '[memory] Structured summarizer failed, falling back to plain summary:',
              err,
            );
          }

          // Fallback to plain summary
          try {
            const tier = pickSummaryTier(tokensApprox);
            const summary = await getSummarizer().summarizePlain(
              convo,
              tier,
              language,
            );

            const filteredSummary = summary
              .replace(/\b(jokes?|lol|haha|funny|joking)\b/gi, '')
              .replace(/\b(meta|technical|internal)\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();

            const memoryBlock = `\n[MEMORY]\n${filteredSummary}`;
            systemWithMemory = `${systemWithMemory}${memoryBlock}`;

            // Simple fallback brief
            memoryBrief =
              language === 'es'
                ? `Resumen: ${filteredSummary.split('.')[0] || filteredSummary}`
                : `Summary: ${filteredSummary.split('.')[0] || filteredSummary}`;
          } catch (fallbackErr) {
            console.warn(
              '[memory] Fallback summarizer also failed:',
              fallbackErr,
            );
            memoryBrief = '';
          }

          // Ensure minimum messages even with fallback
          const lastKMax = Number(process.env.MEMORY_LAST_K_MAX ?? 10);
          const dynamicLastK = Math.max(
            4,
            Math.min(lastKMax, Math.round(tokensApprox / 500) + 3),
          );
          messagesToSend = uiMessages.slice(-dynamicLastK);
        }
      } else {
        messagesToSend = uiMessages; // before threshold, no memory injection
      }
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Only set base system prompt if no memory was injected
    if (
      !enableMemorySlice ||
      convo.length < MIN_TURNS_FOR_SUMMARY ||
      !shouldSummarize
    ) {
      systemWithMemory = systemPrompt({ selectedChatModel, requestHints });
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const systemPromptWithMemory = enableMemorySlice
          ? systemWithMemory
          : systemPrompt({ selectedChatModel, requestHints });

        // Safety tweak B: Dev logs for token estimation and tool usage
        if (process.env.NODE_ENV !== 'production') {
          const tokenEst =
            messagesToSend.length * 20 + systemPromptWithMemory.length / 4;
          console.log(`[CHAT] tokenEst.in: ~${Math.round(tokenEst)} tokens`);
        }

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPromptWithMemory,
          messages: convertToModelMessages(messagesToSend),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather,
            createDocument: createDocument({
              session,
              dataStream,
              memoryBrief,
            }),
            updateDocument: updateDocument({
              session,
              dataStream,
              memoryBrief,
            }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        // Safety tweak C: Disable reasoning in production
        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: process.env.NODE_ENV !== 'production',
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error(error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
