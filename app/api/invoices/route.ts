export const runtime = 'nodejs';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getAccessibleBusinesses, requireBusinessAccess } from '@/lib/access';
import { errorResponse, handleRoute, ok } from '@/lib/api-response';
import { roundMoney, toNumber } from '@/lib/money';
import { suggestHsCodes } from '@/lib/hs-suggest';
import { writeAuditLog } from '@/lib/audit';

const InvoiceItemSchema = z.object({
  description: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unit: z.string().default('PCS'),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  taxRate: z.coerce.number().nonnegative().default(18),
  hsCodeId: z.string().optional().nullable()
});

const CreateInvoiceSchema = z.object({
  businessId: z.string().min(1),
  buyerName: z.string().min(2),
  buyerNtn: z.string().optional().nullable(),
  buyerStrn: z.string().optional().nullable(),
  buyerCnic: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  items: z.array(InvoiceItemSchema).min(1)
});

export async function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const url = new URL(request.url);
    const accessible = await getAccessibleBusinesses(user.id);
    const requestedBusinessId = url.searchParams.get('businessId');
    const businessIds = requestedBusinessId ? [requestedBusinessId] : accessible.map((business) => business.id);

    if (requestedBusinessId) await requireBusinessAccess(user.id, requestedBusinessId);

    const invoices = await prisma.invoice.findMany({
      where: { businessId: { in: businessIds } },
      include: { business: true, items: { include: { hsCode: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return ok({ invoices, businesses: accessible });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const body = CreateInvoiceSchema.parse(await request.json());
    await requireBusinessAccess(user.id, body.businessId);

    const invoice = await prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id: body.businessId },
        data: { sequenceNext: { increment: 1 } }
      });

      const invoiceNumber = `${business.invoicePrefix}-${String(business.sequenceNext).padStart(6, '0')}`;

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      const itemData = [];
      for (const item of body.items) {
        let hsCodeId = item.hsCodeId || null;

        if (!hsCodeId) {
          const suggestions = await suggestHsCodes(item.description, 1);
          hsCodeId = suggestions[0]?.id || null;
        }

        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice);
        const discount = toNumber(item.discount);
        const taxRate = toNumber(item.taxRate);
        const baseAmount = roundMoney(quantity * unitPrice);
        const taxableAmount = Math.max(0, roundMoney(baseAmount - discount));
        const taxAmount = roundMoney(taxableAmount * (taxRate / 100));
        const lineTotal = roundMoney(taxableAmount + taxAmount);

        subtotal = roundMoney(subtotal + baseAmount);
        discountTotal = roundMoney(discountTotal + discount);
        taxTotal = roundMoney(taxTotal + taxAmount);

        itemData.push({
          description: item.description,
          quantity,
          unit: item.unit || 'PCS',
          unitPrice,
          discount,
          taxRate,
          taxAmount,
          lineTotal,
          hsCodeId
        });
      }

      const grandTotal = roundMoney(subtotal - discountTotal + taxTotal);

      return tx.invoice.create({
        data: {
          businessId: body.businessId,
          invoiceNumber,
          buyerName: body.buyerName,
          buyerNtn: body.buyerNtn || null,
          buyerStrn: body.buyerStrn || null,
          buyerCnic: body.buyerCnic || null,
          buyerAddress: body.buyerAddress || null,
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
          createdById: user.id,
          items: { create: itemData }
        },
        include: { items: { include: { hsCode: true } }, business: true }
      });
    });

    await writeAuditLog({
      userId: user.id,
      businessId: invoice.businessId,
      invoiceId: invoice.id,
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      newValue: { invoiceNumber: invoice.invoiceNumber, total: invoice.grandTotal }
    });

    return ok({ invoice }, { status: 201 });
  });
}
