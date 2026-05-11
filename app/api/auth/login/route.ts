export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    undefined
  );
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = LoginSchema.parse(await request.json());

    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    const passwordMatches = await verifyPassword(body.password, user.passwordHash);

    if (!passwordMatches) {
      return errorResponse('Invalid email or password', 401);
    }

    const token = signSession({
      sub: user.id,
      email: user.email
    });

    setSessionCookie(token);

    try {
      await writeAuditLog({
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: getRequestIp(request)
      });
    } catch (error) {
      console.error('Login audit log failed but login was allowed:', error);
    }

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole
      }
    });
  });
}
