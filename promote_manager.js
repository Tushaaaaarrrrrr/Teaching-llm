const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function promoteToManager(email) {
  try {
    const user = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { 
        role: 'MANAGER',
        isSuperManager: true,
        canCreateStudents: true,
        canTerminate: true,
        isProfileComplete: true
      }
    })
    console.log(`✅ Success: ${email} is now a MANAGER and has been unblocked.`)
  } catch (error) {
    console.error(`❌ Error: User with email ${email} not found or update failed.`)
    console.error(error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Replace with the email you want to promote
promoteToManager('lkiitmng2428@gmail.com')
