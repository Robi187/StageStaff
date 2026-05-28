const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@stagebar.at';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN'
      }
    });
    console.log('Admin user created: admin@stagebar.at / admin123');
  } else {
    console.log('Admin user already exists.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
