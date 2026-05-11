export const runtime = 'nodejs';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { setSessionCookie, signSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { errorResponse, handleRoute, ok } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = LoginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return errorResponse('Invalid email or password', 401);
    }

    const token = signSession({ sub: user.id, email: user.email });
    setSessionCookie(token);

    await writeAuditLog({ userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id });

    return ok({
      user: { id: user.id, email: user.email, name: user.name, globalRole: user.globalRole }
    });
  });
}
