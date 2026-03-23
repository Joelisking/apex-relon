import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('👤 Seeding Apex users...\n');

  const hashedPassword = await bcrypt.hash('ApexDemo2026!', 10);

  const users = [
    {
      email: 'nana@apexsurveying.net',
      name: 'Nana',
      role: 'CEO',
    },
    {
      email: 'andrew@apexsurveying.net',
      name: 'Andrew',
      role: 'CEO',
    },
    {
      email: 'clipp@apexsurveying.net',
      name: 'Conner Clipp',
      role: 'ADMIN',
    },
    {
      email: 'pzurbuch@apexsurveying.net',
      name: 'Parker Zurbuch',
      role: 'PROJECT_MANAGER',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        password: hashedPassword,
        status: 'Active',
        isEmailVerified: true,
      },
    });
    console.log(`  ✅ ${user.name} (${user.email}) — ${user.role}`);
  }

  console.log('\n✅ Users seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
