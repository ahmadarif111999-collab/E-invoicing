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

    const invoices = await prisma.invoice.findMany({
      where: { businessId: { in: businessIds } },
      include: { business: true, items: true },
      orderBy: { issueDate: 'desc' }
    });

    const salesTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.grandTotal), 0);
    const taxTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.taxTotal), 0);
    const pending = invoices.filter((invoice) => ['DRAFT', 'READY_FOR_REVIEW', 'VALIDATED'].includes(invoice.status)).length;
    const accepted = invoices.filter((invoice) => invoice.status === 'ACCEPTED_BY_FBR').length;
    const rejected = invoices.filter((invoice) => invoice.status === 'REJECTED_BY_FBR').length;

    return ok({ salesTotal, taxTotal, pending, accepted, rejected, invoices });
  });
}
