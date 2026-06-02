import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In production, these values could be fetched from your database (e.g., a Prisma settings table)
    // or loaded from environment variables. Here we use a clean, editable config object.
    const updateConfig = {
      latestVersion: '1.1.0', // e.g. '1.1.0' - The latest released app version
      minRequiredVersion: '1.1.0', // e.g. '1.1.0' - Versions below this are forced to update
      apkUrl: 'https://teaching-llm.onrender.com/downloads/teaching-lms.apk', // Public URL to download the new APK
      releaseNotes: 'Stability enhancements, streamlined navigation, and native seamless auto-update integration.',
    };

    return NextResponse.json(updateConfig);
  } catch (error) {
    console.error('Error fetching app version configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
