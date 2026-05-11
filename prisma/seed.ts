import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type HsSeedRow = {
  code: string;
  displayCode: string;
  chapter?: string;
  description: string;
  customsDuty?: string | null;
  sourcePage?: number | null;
};

function normalizeSearch(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function seedHsCodes() {
  const filePath = path.join(process.cwd(), 'data', 'hs-codes.seed.json');
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

async function main() {
  await seedHsCodes();

  const passwordHash = await bcrypt.hash('Probiz01', 12);

  const user = await prisma.user.upsert({
    where: { email: 'owner@probiz.ai' },
    update: {},
    create: {
      email: 'owner@probiz.ai',
      name: 'ProBiz Owner',
      passwordHash,
      globalRole: 'SUPER_ADMIN'
    }
  });

  const firm = await prisma.firm.upsert({
    where: { id: 'seed_firm_probiz' },
    update: {},
    create: {
      id: 'seed_firm_probiz',
      name: 'ProBiz Digital Invoicing Firm'
    }
  });

  const business = await prisma.business.upsert({
    where: { id: 'seed_business_abc_textiles' },
    update: {},
    create: {
      id: 'seed_business_abc_textiles',
      firmId: firm.id,
      name: 'ABC Textiles Pvt Ltd',
      ntn: '1234567-8',
      strn: '3277876123456',
      address: 'Karachi, Pakistan',
      invoicePrefix: 'ABC'
    }
  });

  await prisma.firmMembership.upsert({
    where: { userId_firmId: { userId: user.id, firmId: firm.id } },
    update: { role: 'FIRM_OWNER' },
    create: { userId: user.id, firmId: firm.id, role: 'FIRM_OWNER' }
  });

  await prisma.businessMembership.upsert({
    where: { userId_businessId: { userId: user.id, businessId: business.id } },
    update: { role: 'CLIENT_OWNER' },
    create: { userId: user.id, businessId: business.id, role: 'CLIENT_OWNER' }
  });

  await prisma.customer.upsert({
    where: { id: 'seed_customer_retail_house' },
    update: {},
    create: {
      id: 'seed_customer_retail_house',
      businessId: business.id,
      name: 'Retail House Lahore',
      ntn: '7654321-0',
      strn: '3277876543210',
      address: 'Lahore, Pakistan'
    }
  });

  const cottonHs = await prisma.hsCode.findFirst({
    where: { searchText: { contains: 'cotton' } }
  });

  if (cottonHs) {
    await prisma.productService.upsert({
      where: { id: 'seed_product_cotton_fabric' },
      update: {},
      create: {
        id: 'seed_product_cotton_fabric',
        businessId: business.id,
        name: 'Cotton fabric',
        description: 'Cotton textile fabric sold by meter',
        defaultUnit: 'MTR',
        defaultTaxRate: 18,
        defaultHsCodeId: cottonHs.id
      }
    });
  }

  console.log('Seed complete');
  console.log('Login: owner@probiz.ai / Probiz01');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
