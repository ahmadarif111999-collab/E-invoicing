export const runtime = 'nodejs';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import {
  getAccessibleBusinesses,
  getUserFirmMembership,
  PROBIZ_FIRM_ID,
  requireFirmWriteAccess
} from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { handleRoute, ok } from '@/lib/api-response';
import { validateNtn, validateStrn } from '@/lib/tax-id';

const CreateBusinessSchema = z.object({
  name: z.string().min(2),
  ntn: z.string().optional().nullable(),
  strn: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  invoicePrefix: z.string().optional().nullable()
});

function cleanOptional(value?: string | null) {
  const cleaned = String(value || '').trim();
  return cleaned || null;
}

function normalizeInvoicePrefix(value?: string | null) {
  const cleaned = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  return cleaned || 'INV';
}

type BusinessStats = {
  invoiceCount: number;
  acceptedCount: number;
  rejectedCount: number;
  customerCount: number;
  productCount: number;
  totalGrandValue: number;
  totalTaxValue: number;
};

function emptyStats(): BusinessStats {
  return {
    invoiceCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    customerCount: 0,
    productCount: 0,
    totalGrandValue: 0,
    totalTaxValue: 0
  };
}

function canCreateBusiness(role?: string | null) {
  return role === 'FIRM_OWNER' || role === 'FIRM_PARTNER' || role === 'ACCOUNTANT';
}

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();

    const [businesses, firmMembership] = await Promise.all([
      getAccessibleBusinesses(user.id),
      getUserFirmMembership(user.id)
    ]);

    const businessIds = businesses.map((business) => business.id);

    if (businessIds.length === 0) {
      return ok({
        businesses: [],
        firm: {
          role: firmMembership?.role || null
        },
        canCreateBusiness: canCreateBusiness(firmMembership?.role)
      });
    }

    const [invoiceGroups, invoiceStatusGroups, customerGroups, productGroups] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['businessId'],
        where: {
          businessId: {
            in: businessIds
          }
        },
        _count: {
          _all: true
        },
        _sum: {
          grandTotal: true,
          taxTotal: true
        }
      }),
      prisma.invoice.groupBy({
        by: ['businessId', 'status'],
        where: {
          businessId: {
            in: businessIds
          }
        },
        _count: {
          _all: true
        }
      }),
      prisma.customer.groupBy({
        by: ['businessId'],
        where: {
          businessId: {
            in: businessIds
          }
        },
        _count: {
          _all: true
        }
      }),
      prisma.productService.groupBy({
        by: ['businessId'],
        where: {
          businessId: {
            in: businessIds
          }
        },
        _count: {
          _all: true
        }
      })
    ]);

    const statsByBusiness = new Map<string, BusinessStats>();

    for (const business of businesses) {
      statsByBusiness.set(business.id, emptyStats());
    }

    for (const group of invoiceGroups) {
      const stats = statsByBusiness.get(group.businessId) || emptyStats();

      stats.invoiceCount = group._count._all;
      stats.totalGrandValue = Number(group._sum.grandTotal || 0);
      stats.totalTaxValue = Number(group._sum.taxTotal || 0);

      statsByBusiness.set(group.businessId, stats);
    }

    for (const group of invoiceStatusGroups) {
      const stats = statsByBusiness.get(group.businessId) || emptyStats();

      if (group.status === 'ACCEPTED_BY_FBR') {
        stats.acceptedCount = group._count._all;
      }

      if (group.status === 'REJECTED_BY_FBR' || group.status === 'FAILED') {
        stats.rejectedCount += group._count._all;
      }

      statsByBusiness.set(group.businessId, stats);
    }

    for (const group of customerGroups) {
      const stats = statsByBusiness.get(group.businessId) || emptyStats();
      stats.customerCount = group._count._all;
      statsByBusiness.set(group.businessId, stats);
    }

    for (const group of productGroups) {
      const stats = statsByBusiness.get(group.businessId) || emptyStats();
      stats.productCount = group._count._all;
      statsByBusiness.set(group.businessId, stats);
    }

    const enrichedBusinesses = businesses.map((business) => ({
      ...business,
      ...statsByBusiness.get(business.id)
    }));

    return ok({
      businesses: enrichedBusinesses,
      firm: {
        role: firmMembership?.role || null
      },
      canCreateBusiness: canCreateBusiness(firmMembership?.role)
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    await requireFirmWriteAccess(user.id);

    const body = CreateBusinessSchema.parse(await request.json());

    const business = await prisma.business.create({
      data: {
        firmId: PROBIZ_FIRM_ID,
        name: body.name.trim(),
        ntn: validateNtn(body.ntn, 'Business NTN'),
        strn: validateStrn(body.strn, 'Business STRN'),
        address: cleanOptional(body.address),
        invoicePrefix: normalizeInvoicePrefix(body.invoicePrefix),
        sequenceNext: 1
      }
    });

    await writeAuditLog({
      userId: user.id,
      businessId: business.id,
      action: 'BUSINESS_CREATED',
      entityType: 'Business',
      entityId: business.id,
      newValue: {
        name: business.name,
        ntn: business.ntn,
        strn: business.strn,
        invoicePrefix: business.invoicePrefix
      }
    }).catch((error) => {
      console.error('Business audit log failed:', error);
    });

    return ok(
      {
        business: {
          ...business,
          ...emptyStats()
        }
      },
      {
        status: 201
      }
    );
  });
}
