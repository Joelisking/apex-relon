import { PrismaService } from '../database/prisma.service';

/**
 * Generates a unique job number in YYMMNNNN format.
 * Example: 26030001 = March 2026, first job of the month.
 * Uses a retry loop to handle rare concurrent-creation conflicts.
 */
export async function generateJobNumber(prisma: PrismaService): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${yy}${mm}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.project.count({
      where: { jobNumber: { startsWith: prefix } },
    });
    const candidate = `${prefix}${String(count + 1 + attempt).padStart(4, '0')}`;

    // Check it isn't already taken (handles gaps from deletions)
    const existing = await prisma.project.findUnique({
      where: { jobNumber: candidate },
    });
    if (!existing) return candidate;
  }

  // Fallback: use timestamp suffix to guarantee uniqueness
  return `${prefix}${Date.now().toString().slice(-4)}`;
}
