export const runtime = 'nodejs';

import { getCurrentUser } from '@/lib/auth';
import { handleRoute, ok } from '@/lib/api-response';

export async function GET() {
  return handleRoute(async () => {
    const user = await getCurrentUser();
    return ok({ user });
  });
}
