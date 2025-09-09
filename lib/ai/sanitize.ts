// Strip obvious meta/reasoning chatter we never want in model inputs
const META_LINE =
  /^(Reasoned\b|We need to respond\b|User (says|asks)\b|Now user\b|Probably\b|Let's respond\b)/i;
const THINK_TAGS = /<\/?think>|\[REASONING]|\[CHAIN OF THOUGHT]/gi;

export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(THINK_TAGS, '')
    .split('\n')
    .filter((line) => !META_LINE.test(line.trim()))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}
