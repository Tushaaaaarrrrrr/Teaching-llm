import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In production, these values could be fetched from your database (e.g., a Prisma settings table)
    // or loaded from environment variables. Here we use a clean, editable config object.
    const updateConfig = {
      latestVersion: '1.1.0', // Bump this when you publish a new APK
      minRequiredVersion: '1.1.0', // Users below this are forced to update
      apkUrl: 'https://github.com/Tushaaaaarrrrrr/Teaching-llm/releases/latest/download/class.genz.apk',
      releaseNotes: 'Stability enhancements, streamlined navigation, and native seamless auto-update integration.',
    };

    return NextResponse.json(updateConfig);
  } catch (error) {
    console.error('Error fetching app version configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
