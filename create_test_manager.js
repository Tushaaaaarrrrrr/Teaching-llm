const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const email = 'testmanager@example.com'
  const password = 'Test@1234'
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'MANAGER',
        passwordHash,
      },
      create: {
        email,
        name: 'Test Manager',
        role: 'MANAGER',
        passwordHash,
      },
    })
    console.log(`Success: Created/Updated manager ${email} with password ${password}`)
  } catch (error) {
    console.error('Error creating manager:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
