import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fetching users missing firstName or lastName...')
  
  // Find users where firstName is null/empty or lastName is null/empty
  const usersToUpdate = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: null },
        { firstName: '' },
        { lastName: null },
        { lastName: '' }
      ]
    },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true
    }
  })

  console.log(`Found ${usersToUpdate.length} users to update.`)

  let updatedCount = 0
  for (const user of usersToUpdate) {
    if (!user.name) continue // Skip if no name

    const parts = user.name.trim().split(/\s+/)
    const fn = parts[0] || ''
    const ln = parts.slice(1).join(' ') || '' // If only one name, ln is empty string

    // Only update if it actually needs changing
    if (user.firstName !== fn || user.lastName !== ln) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: fn,
          lastName: ln
        }
      })
      updatedCount++
      if (updatedCount % 100 === 0) {
        console.log(`Updated ${updatedCount} users...`)
      }
    }
  }

  console.log(`Migration complete. Backfilled ${updatedCount} users.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
