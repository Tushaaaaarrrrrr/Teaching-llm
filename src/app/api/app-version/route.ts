import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In production, these values could be fetched from your database (e.g., a Prisma settings table)
    // or loaded from environment variables. Here we use a clean, editable config object.
    const updateConfig = {
      latestVersion: process.env.APP_LATEST_VERSION || '1.1.0', // Bump this in your env to trigger update
      minRequiredVersion: process.env.APP_MIN_REQUIRED_VERSION || '1.1.0', // Users below this are forced to update
      apkUrl: process.env.APK_DOWNLOAD_URL || 'https://zedmvgqhnapmpqpnzoqh.supabase.co/storage/v1/object/public/downloads/class%20genz.apk',
      releaseNotes: process.env.APP_RELEASE_NOTES || 'Stability enhancements, streamlined navigation, and native seamless auto-update integration.',
    };

    return NextResponse.json(updateConfig);
  } catch (error) {
    console.error('Error fetching app version configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
