import { prisma } from './db';

export async function getAccessibleBusinesses(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user?.globalRole === 'SUPER_ADMIN') {
    return prisma.business.findMany({ orderBy: { createdAt: 'asc' } });
  }

  const direct = await prisma.business.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: { createdAt: 'asc' }
  });

  const firmBusinesses = await prisma.business.findMany({
    where: { firm: { memberships: { some: { userId } } } },
    orderBy: { createdAt: 'asc' }
  });

  const map = new Map<string, (typeof direct)[number]>();
  for (const business of [...direct, ...firmBusinesses]) map.set(business.id, business);
  return [...map.values()];
}

export async function requireBusinessAccess(userId: string, businessId: string) {
  const businesses = await getAccessibleBusinesses(userId);
  const business = businesses.find((item) => item.id === businessId);
  if (!business) {
    throw Object.assign(new Error('You do not have access to this business'), { status: 403 });
  }
  return business;
}
