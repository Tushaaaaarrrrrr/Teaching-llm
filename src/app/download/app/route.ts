import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const userAgent = request.headers.get('user-agent') || ''
  const host = request.headers.get('host') || 'class.genziitian.in'
  
  // Standard protocol detection
  let protocol = 'https'
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    protocol = 'http'
  }
  const baseUrl = `${protocol}://${host}`

  const isAndroid = /android/i.test(userAgent)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)

  if (isAndroid) {
    // Redirect directly to the existing Supabase storage APK download URL
    return NextResponse.redirect('https://zedmvgqhnapmpqpnzoqh.supabase.co/storage/v1/object/public/downloads/class%20genz.apk')
  } else if (isIOS) {
    return NextResponse.redirect(`${baseUrl}/download?device=ios`)
  } else {
    return NextResponse.redirect(`${baseUrl}/download?device=desktop`)
  }
}
