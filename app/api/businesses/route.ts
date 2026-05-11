export const runtime = 'nodejs';

import { requireUser } from '@/lib/auth';
import { getAccessibleBusinesses } from '@/lib/access';
import { handleRoute, ok } from '@/lib/api-response';

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const businesses = await getAccessibleBusinesses(user.id);
    return ok({ businesses });
  });
}
