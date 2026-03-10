import { NextResponse } from 'next/server'
import { getCookieConfig } from '@/lib/auth'

export async function POST() {
  const { name } = getCookieConfig()
  const response = NextResponse.json({ success: true })
  response.cookies.delete(name)
  return response
}
