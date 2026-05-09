'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationSetup() {
  usePushNotifications()
  return null
}
