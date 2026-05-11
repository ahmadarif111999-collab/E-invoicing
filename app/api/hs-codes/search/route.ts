export const runtime = 'nodejs';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleRoute, ok } from '@/lib/api-response';

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireUser();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();

    if (!q) return ok({ results: [] });

    const normalized = q.replace(/[^a-z0-9]+/g, ' ').trim();
    const compact = q.replace(/\D/g, '');

    const results = await prisma.hsCode.findMany({
      where: {
        OR: [
          compact ? { code: { contains: compact } } : undefined,
          { displayCode: { contains: q, mode: 'insensitive' } },
          { searchText: { contains: normalized, mode: 'insensitive' } }
        ].filter(Boolean) as any
      },
      orderBy: [{ code: 'asc' }],
      take: 25
    });

    return ok({ results });
  });
}
