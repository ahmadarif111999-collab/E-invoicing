import type { BusinessRole, FirmRole } from '@prisma/client';
import { prisma } from './db';

export const PROBIZ_FIRM_ID = 'seed_firm_probiz';
export const PROBIZ_FIRM_NAME = 'ProBiz';

const FIRM_READ_ROLES: FirmRole[] = [
  'FIRM_OWNER',
  'FIRM_PARTNER',
  'ACCOUNTANT',
  'READ_ONLY_AUDITOR'
];

const FIRM_WRITE_ROLES: FirmRole[] = ['FIRM_OWNER', 'FIRM_PARTNER', 'ACCOUNTANT'];

const FIRM_SUBMIT_ROLES: FirmRole[] = ['FIRM_OWNER', 'FIRM_PARTNER', 'ACCOUNTANT'];

const BUSINESS_READ_ROLES: BusinessRole[] = [
  'CLIENT_OWNER',
  'CLIENT_STAFF',
  'ACCOUNTANT',
  'READ_ONLY_AUDITOR'
];

const BUSINESS_WRITE_ROLES: BusinessRole[] = ['CLIENT_OWNER', 'CLIENT_STAFF', 'ACCOUNTANT'];

function accessError(message = 'You do not have access to this resource') {
  return Object.assign(new Error(message), { status: 403 });
}

export async function getUserFirmMembership(userId: string) {
  return prisma.firmMembership.findUnique({
    where: {
      userId_firmId: {
        userId,
        firmId: PROBIZ_FIRM_ID
      }
    },
    include: {
      firm: true
    }
  });
}

export async function requireFirmMember(userId: string) {
  const membership = await getUserFirmMembership(userId);

  if (!membership || !FIRM_READ_ROLES.includes(membership.role)) {
    throw accessError('You do not have access to the ProBiz firm workspace');
  }

  return membership;
}

export async function requireFirmOwner(userId: string) {
  const membership = await getUserFirmMembership(userId);

  if (!membership || membership.role !== 'FIRM_OWNER') {
    throw accessError('Only the ProBiz firm owner can perform this action');
  }

  return membership;
}

export async function requireFirmWriteAccess(userId: string) {
  const membership = await getUserFirmMembership(userId);

  if (!membership || !FIRM_WRITE_ROLES.includes(membership.role)) {
    throw accessError('You do not have permission to change ProBiz firm data');
  }

  return membership;
}

export async function getAccessibleBusinesses(userId: string) {
  const directBusinesses = await prisma.business.findMany({
    where: {
      memberships: {
        some: {
          userId,
          role: {
            in: BUSINESS_READ_ROLES
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const firmMembership = await getUserFirmMembership(userId);

  const firmBusinesses = firmMembership
    ? await prisma.business.findMany({
        where: {
          firmId: PROBIZ_FIRM_ID
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
    : [];

  const byId = new Map<string, (typeof directBusinesses)[number]>();

  for (const business of [...directBusinesses, ...firmBusinesses]) {
    byId.set(business.id, business);
  }

  return [...byId.values()];
}

export async function getUserAccessForBusiness(userId: string, businessId: string) {
  const business = await prisma.business.findUnique({
    where: {
      id: businessId
    },
    include: {
      firm: {
        include: {
          memberships: {
            where: {
              userId
            },
            take: 1
          }
        }
      },
      memberships: {
        where: {
          userId
        },
        take: 1
      }
    }
  });

  if (!business) {
    throw Object.assign(new Error('Business not found'), { status: 404 });
  }

  const firmMembership = business.firm?.memberships[0] || null;
  const businessMembership = business.memberships[0] || null;

  const hasFirmReadAccess =
    Boolean(firmMembership) && FIRM_READ_ROLES.includes(firmMembership!.role);

  const hasFirmWriteAccess =
    Boolean(firmMembership) && FIRM_WRITE_ROLES.includes(firmMembership!.role);

  const hasFirmSubmitAccess =
    Boolean(firmMembership) && FIRM_SUBMIT_ROLES.includes(firmMembership!.role);

  const hasBusinessReadAccess =
    Boolean(businessMembership) && BUSINESS_READ_ROLES.includes(businessMembership!.role);

  const hasBusinessWriteAccess =
    Boolean(businessMembership) && BUSINESS_WRITE_ROLES.includes(businessMembership!.role);

  return {
    business,
    firmMembership,
    businessMembership,
    hasReadAccess: hasFirmReadAccess || hasBusinessReadAccess,
    hasWriteAccess: hasFirmWriteAccess || hasBusinessWriteAccess,
    canSubmitInvoice: hasFirmSubmitAccess
  };
}

export async function requireBusinessAccess(userId: string, businessId: string) {
  const access = await getUserAccessForBusiness(userId, businessId);

  if (!access.hasReadAccess) {
    throw accessError('You do not have access to this business');
  }

  return access.business;
}

export async function requireBusinessWriteAccess(userId: string, businessId: string) {
  const access = await getUserAccessForBusiness(userId, businessId);

  if (!access.hasWriteAccess) {
    throw accessError('You do not have permission to change this business');
  }

  return access.business;
}

export async function requireInvoiceSubmitAccess(userId: string, businessId: string) {
  const access = await getUserAccessForBusiness(userId, businessId);

  if (!access.canSubmitInvoice) {
    throw accessError('Only ProBiz firm users can submit invoices in mock FBR mode');
  }

  return access.business;
}
