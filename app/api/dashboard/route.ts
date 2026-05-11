export const runtime = 'nodejs';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getAccessibleBusinesses } from '@/lib/access';
import { handleRoute, ok } from '@/lib/api-response';

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const businesses = await getAccessibleBusinesses(user.id);
    const businessIds = businesses.map((business) => business.id);

    const [invoiceCount, acceptedCount, rejectedCount, auditCount] = await Promise.all([
      prisma.invoice.count({ where: { businessId: { in: businessIds } } }),
      prisma.invoice.count({ where: { businessId: { in: businessIds }, status: 'ACCEPTED_BY_FBR' } }),
      prisma.invoice.count({ where: { businessId: { in: businessIds }, status: 'REJECTED_BY_FBR' } }),
      prisma.auditLog.count({ where: { businessId: { in: businessIds } } })
    ]);

    const recentInvoices = await prisma.invoice.findMany({
      where: { businessId: { in: businessIds } },
      include: { business: true },
      orderBy: { createdAt: 'desc' },
      take: 8
    });

    return ok({ user, businesses, invoiceCount, acceptedCount, rejectedCount, auditCount, recentInvoices });
  });
}
