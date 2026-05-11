import { prisma } from './db';

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'for', 'with', 'from', 'into', 'other', 'item', 'product', 'service', 'sale', 'sales', 'pcs', 'piece', 'pieces'
]);

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export async function suggestHsCodes(description: string, limit = 5) {
  const tokens = tokenize(description);

  if (tokens.length === 0) {
    return [];
  }

  const candidates = await prisma.hsCode.findMany({
    where: {
      OR: tokens.slice(0, 8).map((token) => ({
        searchText: { contains: token, mode: 'insensitive' }
      }))
    },
    take: 80
  });

  return candidates
    .map((candidate) => {
      const text = candidate.searchText.toLowerCase();
      const matched = tokens.filter((token) => text.includes(token));
      const exactBonus = text.includes(description.toLowerCase()) ? 2 : 0;
      const confidence = Math.min(99, Math.round(((matched.length + exactBonus) / Math.max(tokens.length, 1)) * 100));
      return { ...candidate, confidence, matchedTokens: matched };
    })
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || a.code.localeCompare(b.code))
    .slice(0, limit);
}
