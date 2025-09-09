import type { StructuredMemory } from './summarizer';

export function formatStructuredMemoryToPrompt(
  memory: StructuredMemory,
): string {
  const sections = ['[MEMORY SUMMARY]', memory.summary];

  if (memory.facts.length > 0) {
    sections.push('\n[KEY FACTS]');
    sections.push(...memory.facts.map((fact) => `• ${fact}`));
  }

  if (memory.decisions.length > 0) {
    sections.push('\n[KEY DECISIONS]');
    sections.push(...memory.decisions.map((decision) => `• ${decision}`));
  }

  if (memory.openItems.length > 0) {
    sections.push('\n[OPEN ITEMS]');
    sections.push(...memory.openItems.map((item) => `• ${item}`));
  }

  return sections.join('\n');
}

export function createToolMemoryBrief(
  memory: StructuredMemory,
  maxItems = 5,
): string {
  // Create a compact brief for tools with most relevant information
  const brief: string[] = [];

  // Add summary (always include)
  brief.push(`Summary: ${memory.summary}`);

  // Add key facts (limit to most recent/important)
  if (memory.facts.length > 0) {
    const recentFacts = memory.facts
      .filter(
        (fact) => fact.includes('[RECENT]') || fact.match(/\d{4}/), // Contains years = important dates
      )
      .slice(0, maxItems);
    const otherFacts = memory.facts
      .filter((fact) => !fact.includes('[RECENT]') && !fact.match(/\d{4}/))
      .slice(0, maxItems - recentFacts.length);

    const topFacts = [...recentFacts, ...otherFacts];
    if (topFacts.length > 0) {
      brief.push(`Key facts: ${topFacts.join('; ')}`);
    }
  }

  // Add pending decisions/questions
  const pendingItems = [...memory.decisions, ...memory.openItems]
    .filter(
      (item) =>
        item.toLowerCase().includes('should') ||
        item.toLowerCase().includes('what') ||
        item.toLowerCase().includes('decide'),
    )
    .slice(0, 3);

  if (pendingItems.length > 0) {
    brief.push(`Pending: ${pendingItems.join('; ')}`);
  }

  return brief.join('. ');
}

export function recencyWeighting(
  originalMemory: StructuredMemory,
  recentMessages: any[],
): StructuredMemory {
  // Mark facts/decisions from recent messages as [RECENT]
  const recentContent = recentMessages
    .slice(-2)
    .map((m) => m.content)
    .join(' ');

  const enhancedFacts = originalMemory.facts.map((fact) => {
    // Check if this fact appears in recent messages
    const factLower = fact.toLowerCase();
    const recentLower = recentContent.toLowerCase();

    // Simple heuristic: if fact content appears in recent messages, mark as recent
    const words = factLower.split(' ').filter((word) => word.length > 3);
    const isRecent = words.some((word) => recentLower.includes(word));

    return isRecent && !fact.includes('[RECENT]') ? `[RECENT] ${fact}` : fact;
  });

  return {
    ...originalMemory,
    facts: enhancedFacts,
    metadata: {
      ...originalMemory.metadata,
      confidence: Math.min(originalMemory.metadata.confidence + 0.1, 1.0), // Slight boost
    },
  };
}
