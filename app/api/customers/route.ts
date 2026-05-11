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

const CreateCustomerSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2),
  ntn: z.string().optional().nullable(),
  strn: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  address: z.string().optional().nullable()
});

function cleanOptional(value?: string | null) {
  const cleaned = String(value || '').trim();
  return cleaned || null;
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
        customers: [],
        businesses: accessibleBusinesses
      });
    }

    const customers = await prisma.customer.findMany({
      where: {
        businessId: {
          in: businessIds
        }
      },
      include: {
        business: true,
        _count: {
          select: {
            invoices: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 300
    });

    return ok({
      customers,
      businesses: accessibleBusinesses
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const body = CreateCustomerSchema.parse(await request.json());

    await requireBusinessWriteAccess(user.id, body.businessId);

    const customer = await prisma.customer.create({
      data: {
        businessId: body.businessId,
        name: body.name.trim(),
        ntn: cleanOptional(body.ntn),
        strn: cleanOptional(body.strn),
        cnic: cleanOptional(body.cnic),
        address: cleanOptional(body.address)
      },
      include: {
        business: true,
        _count: {
          select: {
            invoices: true
          }
        }
      }
    });

    await writeAuditLog({
      userId: user.id,
      businessId: customer.businessId,
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
      newValue: {
        name: customer.name,
        ntn: customer.ntn,
        strn: customer.strn,
        cnic: customer.cnic
      }
    }).catch((error) => {
      console.error('Customer audit log failed:', error);
    });

    return ok(
      {
        customer
      },
      {
        status: 201
      }
    );
  });
}
