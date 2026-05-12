export const runtime = 'nodejs';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleRoute, ok } from '@/lib/api-response';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function rankHsCode(row: { code: string; displayCode: string; description: string }, query: string) {
  const q = query.toLowerCase().trim();
  const normalized = normalizeText(q);
  const compact = normalizeDigits(q);
  const code = row.code.toLowerCase();
  const displayCode = row.displayCode.toLowerCase();
  const compactDisplay = normalizeDigits(row.displayCode);
  const description = row.description.toLowerCase();

  if (compact && code === compact) return 1;
  if (compact && compactDisplay === compact) return 2;
  if (compact && code.startsWith(compact)) return 3;
  if (compact && compactDisplay.startsWith(compact)) return 4;
  if (displayCode.startsWith(q)) return 5;
  if (description.startsWith(q)) return 6;
  if (normalized && description.includes(normalized)) return 7;
  if (description.includes(q)) return 8;

  return 20;
}

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireUser();

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const chapter = (url.searchParams.get('chapter') || '').trim();
    const offset = toPositiveInt(url.searchParams.get('offset'), 0);
    const requestedLimit = toPositiveInt(url.searchParams.get('limit'), DEFAULT_LIMIT);
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

    const normalized = normalizeText(q);
    const compact = normalizeDigits(q);

    const where = {
      AND: [
        chapter
          ? {
              chapter
            }
          : {},
        q
          ? {
              OR: [
                compact
                  ? {
                      code: {
                        contains: compact
                      }
                    }
                  : undefined,
                compact
                  ? {
                      displayCode: {
                        contains: compact
                      }
                    }
                  : undefined,
                {
                  displayCode: {
                    contains: q,
                    mode: 'insensitive' as const
                  }
                },
                {
                  description: {
                    contains: q,
                    mode: 'insensitive' as const
                  }
                },
                normalized
                  ? {
                      searchText: {
                        contains: normalized,
                        mode: 'insensitive' as const
                      }
                    }
                  : undefined
              ].filter(Boolean) as any
            }
          : {}
      ]
    };

    const [total, rows] = await Promise.all([
      prisma.hsCode.count({
        where
      }),
      prisma.hsCode.findMany({
        where,
        orderBy: [{ chapter: 'asc' }, { code: 'asc' }],
        take: q ? Math.min(1000, Math.max(limit + offset, 250)) : limit,
        skip: q ? 0 : offset
      })
    ]);

    const rankedRows = q
      ? rows
          .sort((a, b) => {
            const rankDiff = rankHsCode(a, q) - rankHsCode(b, q);
            if (rankDiff !== 0) return rankDiff;
            return a.code.localeCompare(b.code);
          })
          .slice(offset, offset + limit)
      : rows;

    return ok({
      results: rankedRows,
      total,
      limit,
      offset,
      hasMore: offset + rankedRows.length < total
    });
  });
}
