import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getMessagesByChatId, getChatById } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/utils';
import { getSummarizer } from '@/lib/ai/summarizer';

export async function GET(request: Request) {
  // Dev-only guard
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  const minTurns = Number(process.env.MEMORY_MIN_TURNS ?? 5);

  if (!chatId) {
    return new Response('Missing chatId parameter', { status: 400 });
  }

  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const messagesFromDb = await getMessagesByChatId({ id: chatId });
    if (messagesFromDb.length === 0) {
      return new ChatSDKError(
        'not_found:api',
        'No messages found',
      ).toResponse();
    }

    // Verify ownership
    const firstMessage = messagesFromDb[0];
    if (!firstMessage || firstMessage.chatId !== chatId) {
      return new ChatSDKError('forbidden:api').toResponse();
    }

    const uiMessages = convertToUIMessages(messagesFromDb);
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

    if (convo.length < minTurns) {
      return Response.json({
        memory: null,
        turns: convo.length,
        minTurnsRequired: minTurns,
      });
    }

    const summarizer = getSummarizer();
    const summary = await summarizer.summarizePlain(convo, 'medium', 'en');

    return Response.json({
      memory: summary,
      turns: convo.length,
      minTurnsRequired: minTurns,
    });
  } catch (error) {
    console.error('[Memory Preview API]', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
