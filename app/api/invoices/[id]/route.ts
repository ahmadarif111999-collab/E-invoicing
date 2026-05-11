export const runtime = 'nodejs';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requireBusinessAccess } from '@/lib/access';
import { errorResponse, handleRoute, ok } from '@/lib/api-response';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        business: true,
        items: { include: { hsCode: true } },
        submissions: { orderBy: { createdAt: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!invoice) return errorResponse('Invoice not found', 404);
    await requireBusinessAccess(user.id, invoice.businessId);
    return ok({ invoice });
  });
}
