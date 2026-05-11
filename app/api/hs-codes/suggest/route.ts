export const runtime = 'nodejs';

import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { suggestHsCodes } from '@/lib/hs-suggest';
import { handleRoute, ok } from '@/lib/api-response';

const SuggestSchema = z.object({ description: z.string().min(2), limit: z.number().optional() });

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireUser();
    const body = SuggestSchema.parse(await request.json());
    const suggestions = await suggestHsCodes(body.description, body.limit || 5);
    return ok({ suggestions });
  });
}
