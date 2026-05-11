import type { Invoice, InvoiceItem } from '@prisma/client';

export function validateMockFbrInvoice(invoice: Invoice & { items: InvoiceItem[] }) {
  const errors: string[] = [];

  if (!invoice.buyerName) errors.push('Buyer name is required.');
  if (invoice.items.length === 0) errors.push('At least one invoice item is required.');

  for (const [index, item] of invoice.items.entries()) {
    if (!item.hsCodeId) {
      errors.push(`Line ${index + 1}: HS/PCT code is missing.`);
    }
    if (Number(item.quantity) <= 0) {
      errors.push(`Line ${index + 1}: Quantity must be greater than zero.`);
    }
  }

  return errors;
}

export function createMockFbrReference(invoiceNumber: string) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MOCK-FBR-${invoiceNumber}-${suffix}`;
}
