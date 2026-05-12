export const runtime = 'nodejs';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import {
  getAccessibleBusinesses,
  requireBusinessAccess,
  requireBusinessWriteAccess
} from '@/lib/access';
import { handleRoute, ok } from '@/lib/api-response';
import { roundMoney, toNumber } from '@/lib/money';
import { suggestHsCodes } from '@/lib/hs-suggest';
import { writeAuditLog } from '@/lib/audit';
import { validateCnic, validateNtn, validateStrn } from '@/lib/tax-id';

const InvoiceItemSchema = z.object({
  productServiceId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().positive(),
  unit: z.string().optional().nullable(),
  unitPrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  taxRate: z.coerce.number().nonnegative().default(18),
  hsCodeId: z.string().optional().nullable()
});

const CreateInvoiceSchema = z.object({
  businessId: z.string().min(1),
  customerId: z.string().optional().nullable(),
  buyerName: z.string().optional().nullable(),
  buyerNtn: z.string().optional().nullable(),
  buyerStrn: z.string().optional().nullable(),
  buyerCnic: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  items: z.array(InvoiceItemSchema).min(1)
});

type InvoiceItemCreateData = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  hsCodeId: string | null;
};

function cleanOptional(value?: string | null) {
  const cleaned = String(value || '').trim();
  return cleaned || null;
}

function cleanUnit(value?: string | null) {
  const cleaned = String(value || '')
    .trim()
    .toUpperCase()
    .slice(0, 12);

  return cleaned || 'PCS';
}

function requestError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

async function getCustomerForInvoice(customerId: string | null, businessId: string) {
  if (!customerId) return null;

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId
    }
  });

  if (!customer) {
    throw requestError('Selected customer does not belong to this business');
  }

  return customer;
}

async function getProductForInvoice(productServiceId: string | null, businessId: string) {
  if (!productServiceId) return null;

  const product = await prisma.productService.findFirst({
    where: {
      id: productServiceId,
      businessId
    },
    include: {
      defaultHsCode: true
    }
  });

  if (!product) {
    throw requestError('Selected product/service does not belong to this business');
  }

  return product;
}

export async function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const url = new URL(request.url);

    const accessible = await getAccessibleBusinesses(user.id);
    const requestedBusinessId = url.searchParams.get('businessId');

    if (requestedBusinessId) {
      await requireBusinessAccess(user.id, requestedBusinessId);
    }

    const businessIds = requestedBusinessId
      ? [requestedBusinessId]
      : accessible.map((business) => business.id);

    const invoices = await prisma.invoice.findMany({
      where: {
        businessId: {
          in: businessIds
        }
      },
      include: {
        business: true,
        customer: true,
        items: {
          include: {
            hsCode: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return ok({
      invoices,
      businesses: accessible
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const body = CreateInvoiceSchema.parse(await request.json());

    await requireBusinessWriteAccess(user.id, body.businessId);

    const customer = await getCustomerForInvoice(cleanOptional(body.customerId), body.businessId);

    const buyerName = cleanOptional(body.buyerName) || customer?.name || '';
    const buyerNtn = validateNtn(cleanOptional(body.buyerNtn) || customer?.ntn || null, 'Buyer NTN');
    const buyerStrn = validateStrn(
      cleanOptional(body.buyerStrn) || customer?.strn || null,
      'Buyer STRN'
    );
    const buyerCnic = validateCnic(
      cleanOptional(body.buyerCnic) || customer?.cnic || null,
      'Buyer CNIC'
    );
    const buyerAddress = cleanOptional(body.buyerAddress) || customer?.address || null;

    if (!buyerName || buyerName.length < 2) {
      throw requestError('Buyer name is required. Select a customer or enter buyer name manually.');
    }

    const itemData: InvoiceItemCreateData[] = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    for (const item of body.items) {
      const product = await getProductForInvoice(
        cleanOptional(item.productServiceId),
        body.businessId
      );

      const description = cleanOptional(item.description) || product?.description || product?.name || '';

      if (!description || description.length < 2) {
        throw requestError('Every invoice line needs a description or selected product/service.');
      }

      let hsCodeId = cleanOptional(item.hsCodeId) || product?.defaultHsCodeId || null;

      if (!hsCodeId) {
        const suggestions = await suggestHsCodes(description, 1);
        hsCodeId = suggestions[0]?.id || null;
      }

      if (hsCodeId) {
        const hsCode = await prisma.hsCode.findUnique({
          where: {
            id: hsCodeId
          }
        });

        if (!hsCode) {
          hsCodeId = null;
        }
      }

      const quantity = toNumber(item.quantity);
      const unitPrice = toNumber(item.unitPrice);
      const discount = toNumber(item.discount);
      const taxRate = toNumber(item.taxRate, toNumber(product?.defaultTaxRate, 18));
      const unit = cleanUnit(item.unit || product?.defaultUnit || 'PCS');

      const baseAmount = roundMoney(quantity * unitPrice);
      const taxableAmount = Math.max(0, roundMoney(baseAmount - discount));
      const taxAmount = roundMoney(taxableAmount * (taxRate / 100));
      const lineTotal = roundMoney(taxableAmount + taxAmount);

      subtotal = roundMoney(subtotal + baseAmount);
      discountTotal = roundMoney(discountTotal + discount);
      taxTotal = roundMoney(taxTotal + taxAmount);

      itemData.push({
        description,
        quantity,
        unit,
        unitPrice,
        discount,
        taxRate,
        taxAmount,
        lineTotal,
        hsCodeId
      });
    }

    const grandTotal = roundMoney(subtotal - discountTotal + taxTotal);

    const invoice = await prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: {
          id: body.businessId
        },
        data: {
          sequenceNext: {
            increment: 1
          }
        }
      });

      const invoiceNumber = `${business.invoicePrefix}-${String(business.sequenceNext).padStart(
        6,
        '0'
      )}`;

      return tx.invoice.create({
        data: {
          businessId: body.businessId,
          customerId: customer?.id || null,
          invoiceNumber,
          buyerName,
          buyerNtn,
          buyerStrn,
          buyerCnic,
          buyerAddress,
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
          createdById: user.id,
          items: {
            create: itemData
          }
        },
        include: {
          business: true,
          customer: true,
          items: {
            include: {
              hsCode: true
            }
          }
        }
      });
    });

    await writeAuditLog({
      userId: user.id,
      businessId: invoice.businessId,
      invoiceId: invoice.id,
      action: 'INVOICE_CREATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      newValue: {
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        buyerName: invoice.buyerName,
        total: invoice.grandTotal
      }
    }).catch((error) => {
      console.error('Invoice audit log failed:', error);
    });

    return ok(
      {
        invoice
      },
      {
        status: 201
      }
    );
  });
}
