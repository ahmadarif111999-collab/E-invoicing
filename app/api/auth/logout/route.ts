export const runtime = 'nodejs';

import { clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { handleRoute, ok } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit';

export async function POST() {
  return handleRoute(async () => {
    const user = await getCurrentUser();
    if (user) await writeAuditLog({ userId: user.id, action: 'LOGOUT', entityType: 'User', entityId: user.id });
    clearSessionCookie();
    return ok({ ok: true });
  });
}
