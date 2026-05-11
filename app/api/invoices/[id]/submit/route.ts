export const runtime = 'nodejs';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requireBusinessAccess } from '@/lib/access';
import { errorResponse, handleRoute, ok } from '@/lib/api-response';
import { createMockFbrReference, validateMockFbrInvoice } from '@/lib/mock-fbr';
import { writeAuditLog } from '@/lib/audit';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { items: true }
    });

    if (!invoice) return errorResponse('Invoice not found', 404);
    await requireBusinessAccess(user.id, invoice.businessId);

    const validationErrors = validateMockFbrInvoice(invoice);

    if (validationErrors.length > 0) {
      const submission = await prisma.fbrSubmission.create({
        data: {
          invoiceId: invoice.id,
          mode: 'mock',
          status: 'MOCK_REJECTED',
          requestPayload: invoice as any,
          errorPayload: { validationErrors }
        }
      });

      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'REJECTED_BY_FBR' } });
      await writeAuditLog({ userId: user.id, businessId: invoice.businessId, invoiceId: invoice.id, action: 'MOCK_FBR_REJECTED', entityType: 'Invoice', entityId: invoice.id, newValue: { validationErrors } });
      return ok({ accepted: false, validationErrors, submission });
    }

    const referenceNumber = createMockFbrReference(invoice.invoiceNumber);
    const responsePayload = {
      mode: 'mock',
      accepted: true,
      referenceNumber,
      message: 'Mock FBR submission accepted. This is not a real FBR response.'
    };

    const [updatedInvoice, submission] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'ACCEPTED_BY_FBR',
          fbrInvoiceNumber: referenceNumber,
          fbrResponse: responsePayload as any
        }
      }),
      prisma.fbrSubmission.create({
        data: {
          invoiceId: invoice.id,
          mode: 'mock',
          status: 'MOCK_ACCEPTED',
          requestPayload: invoice as any,
          responsePayload: responsePayload as any,
          referenceNumber
        }
      })
    ]);

    await writeAuditLog({ userId: user.id, businessId: invoice.businessId, invoiceId: invoice.id, action: 'MOCK_FBR_ACCEPTED', entityType: 'Invoice', entityId: invoice.id, newValue: responsePayload });
    return ok({ accepted: true, invoice: updatedInvoice, submission });
  });
}
