import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { productsList } from './productsList';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing!');
  }

  console.log('🌱 Seeding Hoodizz products...');

  // Clear existing products first to avoid duplicates
  await prisma.product.deleteMany();

  for (const product of productsList) {
    await prisma.product.create({ data: product });
    console.log(`✔ Created: ${product.name}`);
  }

  console.log(`\n✅ Seeding complete. ${productsList.length} products added.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
