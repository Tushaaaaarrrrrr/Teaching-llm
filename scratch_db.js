const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const tableInfo = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'WebhookLog';
    `)
    console.log('WebhookLog columns:', tableInfo)

    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "WebhookLog";`)
    console.log('WebhookLog row count:', count)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
