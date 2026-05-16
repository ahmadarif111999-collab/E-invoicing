import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { InvoiceStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROBIZ_FIRM_ID = 'seed_firm_probiz';
const PROBIZ_FIRM_NAME = 'ProBiz';
const PARTNER_PASSWORD = 'Probiz01';

type HsSeedRow = {
  code: string;
  displayCode: string;
  chapter?: string;
  description: string;
  customsDuty?: string | null;
  sourcePage?: number | null;
};

type PartnerSeed = {
  email: string;
  name: string;
  firmRole: 'FIRM_OWNER' | 'FIRM_PARTNER';
};

const partners: PartnerSeed[] = [
  {
    email: 'ahmadarif111999@gmail.com',
    name: 'Ahmad Arif',
    firmRole: 'FIRM_OWNER'
  },
  {
    email: 'yjavaid01@gmail.com',
    name: 'Y. Javaid',
    firmRole: 'FIRM_PARTNER'
  },
  {
    email: 'maysumzaidi2001@gmail.com',
    name: 'Maysum Zaidi',
    firmRole: 'FIRM_PARTNER'
  },
  {
    email: 'asfandsajjid@gmail.com',
    name: 'Asfand Sajjid',
    firmRole: 'FIRM_PARTNER'
  },
  {
    email: 'ali.awan9167@gmail.com',
    name: 'Ali Awan',
    firmRole: 'FIRM_PARTNER'
  }
];

function normalizeSearch(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function seedHsCodes() {
  const filePath = path.join(process.cwd(), 'data', 'hs-codes.seed.json');

  if (!fs.existsSync(filePath)) {
    console.warn('HS/PCT seed file not found. Skipping HS/PCT seed.');
    return;
  }

  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8')) as HsSeedRow[];
  const chunkSize = 500;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    await prisma.hsCode.createMany({
      data: chunk.map((row) => ({
        code: row.code,
        displayCode: row.displayCode,
        chapter: row.chapter || row.code.slice(0, 2),
        description: row.description,
        searchText: normalizeSearch(`${row.code} ${row.displayCode} ${row.description}`),
        customsDuty: row.customsDuty || null,
        sourcePage: row.sourcePage || null
      })),
      skipDuplicates: true
    });
  }

  console.log(`Seeded ${rows.length} HS/PCT code rows`);
}

async function disableLegacyOwnerLogin() {
  const disabledPasswordHash = await bcrypt.hash(`disabled-${randomUUID()}`, 12);

  await prisma.user.updateMany({
    where: {
      email: 'owner@probiz.ai'
    },
    data: {
      name: 'Legacy seed login disabled',
      passwordHash: disabledPasswordHash,
      globalRole: 'USER'
    }
  });
}

async function seedFirmAndPartners() {
  const passwordHash = await bcrypt.hash(PARTNER_PASSWORD, 12);

  const firm = await prisma.firm.upsert({
    where: {
      id: PROBIZ_FIRM_ID
    },
    update: {
      name: PROBIZ_FIRM_NAME
    },
    create: {
      id: PROBIZ_FIRM_ID,
      name: PROBIZ_FIRM_NAME
    }
  });

  const seededUsers = [];

  for (const partner of partners) {
    const user = await prisma.user.upsert({
      where: {
        email: partner.email
      },
      update: {
        name: partner.name,
        passwordHash,
        globalRole: 'USER'
      },
      create: {
        email: partner.email,
        name: partner.name,
        passwordHash,
        globalRole: 'USER'
      }
    });

    await prisma.firmMembership.upsert({
      where: {
        userId_firmId: {
          userId: user.id,
          firmId: firm.id
        }
      },
      update: {
        role: partner.firmRole
      },
      create: {
        userId: user.id,
        firmId: firm.id,
        role: partner.firmRole
      }
    });

    seededUsers.push(user);
  }

  return {
    firm,
    ownerUser: seededUsers[0]
  };
}

async function seedDemoBusiness(firmId: string) {
  const business = await prisma.business.upsert({
    where: {
      id: 'seed_business_abc_textiles'
    },
    update: {
      firmId,
      name: 'ABC Textiles Pvt Ltd',
      ntn: '1234567',
      strn: '3277876123456',
      address: 'Karachi, Pakistan',
      invoicePrefix: 'ABC',
      sequenceNext: 3,
      productSequenceNext: 2
    },
    create: {
      id: 'seed_business_abc_textiles',
      firmId,
      name: 'ABC Textiles Pvt Ltd',
      ntn: '1234567',
      strn: '3277876123456',
      address: 'Karachi, Pakistan',
      invoicePrefix: 'ABC',
      sequenceNext: 3,
      productSequenceNext: 2
    }
  });

  const customer = await prisma.customer.upsert({
    where: {
      id: 'seed_customer_retail_house'
    },
    update: {
      businessId: business.id,
      name: 'Retail House Lahore',
      ntn: '7654321',
      strn: '3277876543210',
      cnic: null,
      address: 'Lahore, Pakistan'
    },
    create: {
      id: 'seed_customer_retail_house',
      businessId: business.id,
      name: 'Retail House Lahore',
      ntn: '7654321',
      strn: '3277876543210',
      cnic: null,
      address: 'Lahore, Pakistan'
    }
  });

  const cottonHs = await prisma.hsCode.findFirst({
    where: {
      searchText: {
        contains: 'cotton'
      }
    }
  });

  const product = await prisma.productService.upsert({
    where: {
      id: 'seed_product_cotton_fabric'
    },
    update: {
      businessId: business.id,
      itemCode: 'ABC-ITEM-000001',
      name: 'Cotton fabric',
      description: 'Cotton textile fabric sold by meter',
      defaultUnit: 'MTR',
      defaultTaxRate: 18,
      defaultHsCodeId: cottonHs?.id || null
    },
    create: {
      id: 'seed_product_cotton_fabric',
      businessId: business.id,
      itemCode: 'ABC-ITEM-000001',
      name: 'Cotton fabric',
      description: 'Cotton textile fabric sold by meter',
      defaultUnit: 'MTR',
      defaultTaxRate: 18,
      defaultHsCodeId: cottonHs?.id || null
    }
  });

  return {
    business,
    customer,
    product,
    cottonHs
  };
}

async function seedDemoInvoices(params: {
  businessId: string;
  customerId: string;
  createdById: string;
  hsCodeId?: string | null;
}) {
  const { businessId, customerId, createdById, hsCodeId } = params;

  await prisma.invoice.upsert({
    where: {
      id: 'seed_invoice_abc_000001'
    },
    update: {
      businessId,
      customerId,
      invoiceNumber: 'ABC-000001',
      status: InvoiceStatus.ACCEPTED_BY_FBR,
      buyerName: 'Retail House Lahore',
      buyerNtn: '7654321',
      buyerStrn: '3277876543210',
      buyerCnic: null,
      buyerAddress: 'Lahore, Pakistan',
      subtotal: 50000,
      discountTotal: 0,
      taxTotal: 9000,
      grandTotal: 59000,
      fbrInvoiceNumber: 'MOCK-ABC-000001',
      fbrResponse: {
        mode: 'mock',
        accepted: true,
        referenceNumber: 'MOCK-ABC-000001',
        message: 'Mock FBR submission accepted. This is not a real FBR response.'
      } as any
    },
    create: {
      id: 'seed_invoice_abc_000001',
      businessId,
      customerId,
      invoiceNumber: 'ABC-000001',
      status: InvoiceStatus.ACCEPTED_BY_FBR,
      issueDate: new Date('2026-05-01T00:00:00.000Z'),
      buyerName: 'Retail House Lahore',
      buyerNtn: '7654321',
      buyerStrn: '3277876543210',
      buyerCnic: null,
      buyerAddress: 'Lahore, Pakistan',
      subtotal: 50000,
      discountTotal: 0,
      taxTotal: 9000,
      grandTotal: 59000,
      fbrInvoiceNumber: 'MOCK-ABC-000001',
      fbrResponse: {
        mode: 'mock',
        accepted: true,
        referenceNumber: 'MOCK-ABC-000001',
        message: 'Mock FBR submission accepted. This is not a real FBR response.'
      } as any,
      createdById,
      items: {
        create: [
          {
            hsCodeId: hsCodeId || null,
            description: 'Cotton textile fabric sold by meter',
            quantity: 100,
            unit: 'MTR',
            unitPrice: 500,
            discount: 0,
            taxRate: 18,
            taxAmount: 9000,
            lineTotal: 59000
          }
        ]
      }
    }
  });

  await prisma.invoice.upsert({
    where: {
      id: 'seed_invoice_abc_000002'
    },
    update: {
      businessId,
      customerId,
      invoiceNumber: 'ABC-000002',
      status: InvoiceStatus.DRAFT,
      buyerName: 'Retail House Lahore',
      buyerNtn: '7654321',
      buyerStrn: '3277876543210',
      buyerCnic: null,
      buyerAddress: 'Lahore, Pakistan',
      subtotal: 15000,
      discountTotal: 0,
      taxTotal: 2700,
      grandTotal: 17700,
      fbrInvoiceNumber: null,
      fbrResponse: undefined
    },
    create: {
      id: 'seed_invoice_abc_000002',
      businessId,
      customerId,
      invoiceNumber: 'ABC-000002',
      status: InvoiceStatus.DRAFT,
      issueDate: new Date('2026-05-05T00:00:00.000Z'),
      buyerName: 'Retail House Lahore',
      buyerNtn: '7654321',
      buyerStrn: '3277876543210',
      buyerCnic: null,
      buyerAddress: 'Lahore, Pakistan',
      subtotal: 15000,
      discountTotal: 0,
      taxTotal: 2700,
      grandTotal: 17700,
      createdById,
      items: {
        create: [
          {
            hsCodeId: hsCodeId || null,
            description: 'Sample cotton fabric order for review',
            quantity: 50,
            unit: 'MTR',
            unitPrice: 300,
            discount: 0,
            taxRate: 18,
            taxAmount: 2700,
            lineTotal: 17700
          }
        ]
      }
    }
  });

  await prisma.auditLog.upsert({
    where: {
      id: 'seed_audit_dashboard_ready'
    },
    update: {
      userId: createdById,
      businessId,
      action: 'SEED_DATA_READY',
      entityType: 'Workspace',
      entityId: PROBIZ_FIRM_ID,
      newValue: {
        message: 'ProBiz seed workspace prepared with partner access and demo invoice data.'
      } as any
    },
    create: {
      id: 'seed_audit_dashboard_ready',
      userId: createdById,
      businessId,
      action: 'SEED_DATA_READY',
      entityType: 'Workspace',
      entityId: PROBIZ_FIRM_ID,
      newValue: {
        message: 'ProBiz seed workspace prepared with partner access and demo invoice data.'
      } as any
    }
  });
}

async function main() {
  await seedHsCodes();
  await disableLegacyOwnerLogin();

  const { firm, ownerUser } = await seedFirmAndPartners();
  const { business, customer, cottonHs } = await seedDemoBusiness(firm.id);

  await seedDemoInvoices({
    businessId: business.id,
    customerId: customer.id,
    createdById: ownerUser.id,
    hsCodeId: cottonHs?.id || null
  });

  console.log('Seed complete');
  console.log('');
  console.log('ProBiz partner logins:');
  for (const partner of partners) {
    console.log(`${partner.email} / ${PARTNER_PASSWORD} / ${partner.firmRole}`);
  }
  console.log('');
  console.log('Seeded product item code: ABC-ITEM-000001');
  console.log('Legacy owner@probiz.ai login has been disabled by seed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
