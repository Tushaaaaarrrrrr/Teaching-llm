import { prisma } from '@/lib/db'

export async function getMaintenanceModeState() {
  const settings = await prisma.updateSystemSettings.findUnique({
    where: { id: 'singleton' },
    select: { 
      maintenanceMode: true,
      maintenanceEndsAt: true,
    },
  })

  return { 
    active: Boolean(settings?.maintenanceMode),
    endsAt: settings?.maintenanceEndsAt ? settings.maintenanceEndsAt.toISOString() : null
  }
}
