export const THINKING_MESSAGES = {
  en: {
    thinking: [
      'Brewing some genius...',
      'Consulting my digital crystal ball...',
      'Doing some heavy thinking... 💭',
      'Plotting world domination... just kidding!',
      'Channeling my inner AI philosopher...',
      'Debugging the matrix...',
      'Having an existential crisis... be right back!',
      'Teaching electrons to dance...',
      'Negotiating with the cloud...',
      'Time-traveling through data streams...',
      'Having a chat with the servers...',
      'Doing AI yoga... ommmmm...',
      'Playing chess with your question...',
      'Having a debate with myself...',
      'Consulting the AI elders...',
    ],
    processing: [
      'Cooking up something special...',
      'Mixing metaphors and algorithms...',
      'Having a coffee break... virtually!',
      'Practicing my stand-up routine...',
      'Doing some digital archaeology...',
      'Having an artistic breakthrough...',
      'Channeling my inner wordsmith...',
      'Doing some creative gymnastics...',
      'Unleashing the creativity beast...',
      'Having a lightbulb moment...',
    ],
    generating: [
      'Weaving words into magic...',
      'Painting with pixels of thought...',
      'Composing a symphony of answers...',
      'Building castles in the cloud...',
      'Crafting a masterpiece...',
      'Having an artistic breakthrough...',
      'Channeling my inner wordsmith...',
      'Doing some creative gymnastics...',
      'Having a lightbulb moment...',
      'Unleashing the creativity beast...',
    ],
  },
  es: {
    pensando: [
      'Cocinando algo genial...',
      'Consultando mi bola de cristal digital...',
      'Pensando muy duro... 💭',
      'Planeando dominar el mundo... ¡es broma!',
      'Canalizando mi filósofo AI interior...',
      'Depurando la matrix...',
      'Teniendo una crisis existencial... ya vuelvo!',
      'Enseñando electrones a bailar...',
      'Negociando con la nube...',
      'Viajando en el tiempo por streams de datos...',
      'Charlando con los servidores...',
      'Haciendo yoga AI... ommmmm...',
      'Jugando ajedrez con tu pregunta...',
      'Debatiendo conmigo mismo...',
      'Consultando a los ancianos AI...',
    ],
    procesando: [
      'Preparando algo especial...',
      'Mezclando metáforas y algoritmos...',
      'Tomando un descanso para café... ¡virtualmente!',
      'Practicando mi rutina de stand-up...',
      'Haciendo arqueología digital...',
      'Teniendo un breakthrough artístico...',
      'Canalizando mi escritor interior...',
      'Haciendo gimnasia creativa...',
      'Teniendo un momento de bombilla...',
      'Desatando la bestia de creatividad...',
    ],
    generando: [
      'Tejiendo palabras en magia...',
      'Pintando con píxeles de pensamiento...',
      'Componiendo una sinfonía de respuestas...',
      'Construyendo castillos en la nube...',
      'Creando una obra maestra...',
      'Teniendo un breakthrough artístico...',
      'Canalizando mi escritor interior...',
      'Haciendo gimnasia creativa...',
      'Teniendo un momento de bombilla...',
      'Desatando la bestia de creatividad...',
    ],
  },
} as const;

export type ThinkingStage = 'thinking' | 'processing' | 'generating';
export type Language = 'en' | 'es';

export function getThinkingMessage(
  stage: ThinkingStage,
  language: Language,
  messageIndex = 0,
): string {
  if (language === 'en') {
    const messages = THINKING_MESSAGES.en[stage];
    return messages[messageIndex % messages.length] || messages[0];
  } else {
    // For Spanish, map the stages
    const spanishStage =
      stage === 'thinking'
        ? 'pensando'
        : stage === 'processing'
          ? 'procesando'
          : 'generando';
    const messages =
      THINKING_MESSAGES.es[spanishStage as keyof typeof THINKING_MESSAGES.es];
    return messages[messageIndex % messages.length] || messages[0];
  }
}
