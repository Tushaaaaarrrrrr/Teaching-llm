const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const count = await prisma.dailySessionSnapshot.count()
    console.log(`Successfully connected. DailySessionSnapshot row count: ${count}`)
  } catch (error) {
    if (error.code === 'P2021') {
      console.error('Table DailySessionSnapshot does not exist.')
    } else {
      console.error('Error connecting to database:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
