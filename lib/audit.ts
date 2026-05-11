import { prisma } from './db';

type AuditInput = {
  userId?: string;
  businessId?: string;
  invoiceId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
};

export async function writeAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      businessId: input.businessId,
      invoiceId: input.invoiceId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue === undefined ? undefined : (input.oldValue as any),
      newValue: input.newValue === undefined ? undefined : (input.newValue as any),
      ipAddress: input.ipAddress
    }
  });
}
