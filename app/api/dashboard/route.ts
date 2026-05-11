export const runtime = 'nodejs';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import {
  getAccessibleBusinesses,
  getUserFirmMembership,
  PROBIZ_FIRM_ID,
  PROBIZ_FIRM_NAME
} from '@/lib/access';
import { handleRoute, ok } from '@/lib/api-response';

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function getAcceptanceRate(accepted: number, rejected: number, failed: number) {
  const totalCompleted = accepted + rejected + failed;
  if (totalCompleted === 0) return 0;
  return Math.round((accepted / totalCompleted) * 100);
}

const emptyStatusBreakdown = {
  DRAFT: 0,
  READY_FOR_REVIEW: 0,
  VALIDATED: 0,
  SUBMISSION_PENDING: 0,
  SUBMITTED: 0,
  ACCEPTED_BY_FBR: 0,
  REJECTED_BY_FBR: 0,
  FAILED: 0,
  CANCELLED: 0,
  CREDIT_NOTE_ISSUED: 0,
  DEBIT_NOTE_ISSUED: 0
};

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();

    const [businesses, firmMembership, partnerCount] = await Promise.all([
      getAccessibleBusinesses(user.id),
      getUserFirmMembership(user.id),
      prisma.firmMembership.count({
        where: {
          firmId: PROBIZ_FIRM_ID
        }
      })
    ]);

    const businessIds = businesses.map((business) => business.id);

    if (businessIds.length === 0) {
      return ok({
        user,
        firm: {
          id: PROBIZ_FIRM_ID,
          name: PROBIZ_FIRM_NAME,
          role: firmMembership?.role || null,
          partnerCount
        },
        businesses,
        businessCount: 0,
        invoiceCount: 0,
        draftCount: 0,
        readyForReviewCount: 0,
        validatedCount: 0,
        submissionPendingCount: 0,
        submittedCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        failedCount: 0,
        auditCount: 0,
        totalGrandValue: 0,
        totalTaxValue: 0,
        acceptanceRate: 0,
        statusBreakdown: emptyStatusBreakdown,
        recentInvoices: []
      });
    }

    const [statusGroups, totals, auditCount, recentInvoices] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['status'],
        where: {
          businessId: {
            in: businessIds
          }
        },
        _count: {
          _all: true
        }
      }),
      prisma.invoice.aggregate({
        where: {
          businessId: {
            in: businessIds
          }
        },
        _sum: {
          grandTotal: true,
          taxTotal: true
        }
      }),
      prisma.auditLog.count({
        where: {
          businessId: {
            in: businessIds
          }
        }
      }),
      prisma.invoice.findMany({
        where: {
          businessId: {
            in: businessIds
          }
        },
        include: {
          business: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 8
      })
    ]);

    const statusBreakdown: Record<string, number> = {
      ...emptyStatusBreakdown
    };

    for (const group of statusGroups) {
      statusBreakdown[group.status] = group._count._all;
    }

    const invoiceCount = Object.values(statusBreakdown).reduce((sum, count) => sum + count, 0);
    const acceptedCount = statusBreakdown.ACCEPTED_BY_FBR || 0;
    const rejectedCount = statusBreakdown.REJECTED_BY_FBR || 0;
    const failedCount = statusBreakdown.FAILED || 0;

    return ok({
      user,
      firm: {
        id: PROBIZ_FIRM_ID,
        name: PROBIZ_FIRM_NAME,
        role: firmMembership?.role || null,
        partnerCount
      },
      businesses,
      businessCount: businesses.length,
      invoiceCount,
      draftCount: statusBreakdown.DRAFT || 0,
      readyForReviewCount: statusBreakdown.READY_FOR_REVIEW || 0,
      validatedCount: statusBreakdown.VALIDATED || 0,
      submissionPendingCount: statusBreakdown.SUBMISSION_PENDING || 0,
      submittedCount: statusBreakdown.SUBMITTED || 0,
      acceptedCount,
      rejectedCount,
      failedCount,
      auditCount,
      totalGrandValue: toNumber(totals._sum.grandTotal),
      totalTaxValue: toNumber(totals._sum.taxTotal),
      acceptanceRate: getAcceptanceRate(acceptedCount, rejectedCount, failedCount),
      statusBreakdown,
      recentInvoices
    });
  });
}
