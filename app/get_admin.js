const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { email: true, username: true }
  });
  console.log("Admin user:", admin);
}
main().catch(console.error).finally(() => prisma.$disconnect());
