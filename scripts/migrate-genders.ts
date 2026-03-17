import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting gender migration...')

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { gender: null },
        { avatar: null }
      ]
    }
  })

  console.log(`Found ${users.length} users to migrate.`)

  for (const user of users) {
    const data: any = {}
    
    // 1. Assign gender if missing
    if (!user.gender) {
      // Very simple heuristic: some common female endings in many cultures, otherwise random
      const name = user.name.toLowerCase()
      const isFemale = name.endsWith('a') || name.endsWith('i') || name.endsWith('ee') || Math.random() > 0.5
      data.gender = isFemale ? 'FEMALE' : 'MALE'
    }

    // 2. Assign default avatar if missing
    if (!user.avatar) {
      const gender = data.gender || user.gender
      data.avatar = gender === 'FEMALE' ? '/images/default-female.png' : '/images/default-male.png'
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data
      })
      console.log(`Updated user ${user.name} (${user.email}): gender=${data.gender || 'existing'}, avatar=${data.avatar || 'existing'}`)
    }
  }

  console.log('Migration completed successfully.')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
