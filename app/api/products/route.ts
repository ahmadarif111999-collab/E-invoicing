export const runtime = 'nodejs';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import {
  getAccessibleBusinesses,
  requireBusinessAccess,
  requireBusinessWriteAccess
} from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { handleRoute, ok } from '@/lib/api-response';
import { buildItemCode } from '@/lib/item-code';

const CreateProductSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  defaultUnit: z.string().optional().nullable(),
  defaultTaxRate: z.coerce.number().nonnegative().default(18),
  defaultHsCodeId: z.string().optional().nullable()
});

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

export async function GET(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const url = new URL(request.url);

    const accessibleBusinesses = await getAccessibleBusinesses(user.id);
    const requestedBusinessId = url.searchParams.get('businessId');

    if (requestedBusinessId) {
      await requireBusinessAccess(user.id, requestedBusinessId);
    }

    const businessIds = requestedBusinessId
      ? [requestedBusinessId]
      : accessibleBusinesses.map((business) => business.id);

    if (businessIds.length === 0) {
      return ok({
        products: [],
        businesses: accessibleBusinesses
      });
    }

    const products = await prisma.productService.findMany({
      where: {
        businessId: {
          in: businessIds
        }
      },
      include: {
        business: true,
        defaultHsCode: true
      },
      orderBy: [{ businessId: 'asc' }, { itemCode: 'asc' }, { createdAt: 'desc' }],
      take: 300
    });

    return ok({
      products,
      businesses: accessibleBusinesses
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const body = CreateProductSchema.parse(await request.json());

    await requireBusinessWriteAccess(user.id, body.businessId);

    const cleanedName = body.name.trim();

    const duplicateProduct = await prisma.productService.findFirst({
      where: {
        businessId: body.businessId,
        name: {
          equals: cleanedName,
          mode: 'insensitive'
        }
      }
    });

    if (duplicateProduct) {
      throw requestError(
        `A product/service named "${cleanedName}" already exists for this business. Use the existing item code ${duplicateProduct.itemCode || duplicateProduct.id}.`
      );
    }

    let defaultHsCodeId = cleanOptional(body.defaultHsCodeId);

    if (defaultHsCodeId) {
      const hsCode = await prisma.hsCode.findUnique({
        where: {
          id: defaultHsCodeId
        }
      });

      if (!hsCode) {
        defaultHsCodeId = null;
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: {
          id: body.businessId
        },
        data: {
          productSequenceNext: {
            increment: 1
          }
        }
      });

      const sequenceNumber = Math.max(1, business.productSequenceNext - 1);
      const itemCode = buildItemCode(business.invoicePrefix, sequenceNumber);

      return tx.productService.create({
        data: {
          businessId: body.businessId,
          itemCode,
          name: cleanedName,
          description: cleanOptional(body.description),
          defaultUnit: cleanUnit(body.defaultUnit),
          defaultTaxRate: body.defaultTaxRate,
          defaultHsCodeId
        },
        include: {
          business: true,
          defaultHsCode: true
        }
      });
    });

    await writeAuditLog({
      userId: user.id,
      businessId: product.businessId,
      action: 'PRODUCT_CREATED',
      entityType: 'ProductService',
      entityId: product.id,
      newValue: {
        itemCode: product.itemCode,
        name: product.name,
        defaultUnit: product.defaultUnit,
        defaultTaxRate: product.defaultTaxRate,
        defaultHsCodeId: product.defaultHsCodeId
      }
    }).catch((error) => {
      console.error('Product audit log failed:', error);
    });

    return ok(
      {
        product
      },
      {
        status: 201
      }
    );
  });
}
