import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': openrouter('openai/gpt-oss-120b'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openrouter('openai/gpt-4o-mini'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openrouter('meta-llama/llama-3.2-3b-instruct'),
        'artifact-model': openrouter('openai/gpt-4o-mini'),
      },
      imageModels: {
        'small-model': openrouter('openai/gpt-4o-mini'),
      },
    });
