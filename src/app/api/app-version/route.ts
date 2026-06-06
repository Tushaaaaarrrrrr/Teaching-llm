import { NextResponse } from 'next/server';

/**
 * App version endpoint — single source of truth is the GitHub Releases page.
 *
 * Release a new APK by publishing a GitHub Release:
 *   1. Bump versionName + versionCode in android/app/build.gradle, build the APK.
 *   2. Create a release whose TAG is the version (e.g. "v1.3.0" or "1.3.0").
 *   3. Attach the .apk as a release asset. Put the changelog in the release body.
 *
 * Because the tag drives `latestVersion` and the asset drives `apkUrl`, the three
 * values that used to drift by hand (env version / build.gradle / uploaded file)
 * are now derived from one place and can't get out of sync. Each release also has
 * a unique asset URL, so there's no stale-CDN-cache problem.
 *
 * Env overrides (all optional):
 *   GITHUB_REPO              "owner/repo" to read releases from. Defaults below.
 *   GITHUB_TOKEN             Raises the GitHub API rate limit (60/hr -> 5000/hr). Optional for a public repo.
 *   APP_MIN_REQUIRED_VERSION Force-update floor. Defaults to "0.0.0" (never forced) unless set,
 *                            or can be declared per-release in the body as a line: `min-required: 1.2.0`.
 *   APP_LATEST_VERSION / APK_DOWNLOAD_URL / APP_RELEASE_NOTES
 *                            Static fallbacks used only if GitHub can't be reached.
 */

const GITHUB_REPO = process.env.GITHUB_REPO || 'Tushaaaaarrrrrr/Teaching-llm';

// Static fallback so the endpoint degrades gracefully if GitHub is unreachable.
const FALLBACK = {
  latestVersion: process.env.APP_LATEST_VERSION || '1.2.0',
  minRequiredVersion: process.env.APP_MIN_REQUIRED_VERSION || '0.0.0',
  apkUrl:
    process.env.APK_DOWNLOAD_URL ||
    'https://zedmvgqhnapmpqpnzoqh.supabase.co/storage/v1/object/public/downloads/class%20genz.apk',
  releaseNotes: process.env.APP_RELEASE_NOTES || 'Bug fixes and improvements.',
};

/** Normalize a git tag into a plain semver string: "v1.3.0" / "release-1.3.0" -> "1.3.0". */
function tagToVersion(tag: string): string {
  const match = tag.match(/\d+(\.\d+)*/);
  return match ? match[0] : tag;
}

/** Optional per-release force-update floor, declared in the body as `min-required: x.y.z`. */
function parseMinRequired(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/min[-_ ]?required\s*[:=]\s*v?(\d+(?:\.\d+)*)/i);
  return match ? match[1] : null;
}

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers,
        // Cache server-side: all users share this server's IP against GitHub's
        // unauthenticated 60-req/hr limit, so we must not hit the API per request.
        next: { revalidate: 300 }, // 5 minutes
      }
    );

    if (!res.ok) {
      console.warn(
        `[app-version] GitHub releases fetch failed (${res.status}); serving static fallback.`
      );
      return NextResponse.json(FALLBACK);
    }

    const release = await res.json();

    const apkAsset = (release.assets || []).find(
      (a: { name?: string; browser_download_url?: string }) =>
        a.name?.toLowerCase().endsWith('.apk')
    );

    // No usable APK on the latest release -> don't advertise an unreachable update.
    if (!release.tag_name || !apkAsset?.browser_download_url) {
      console.warn(
        '[app-version] Latest release has no .apk asset or tag; serving static fallback.'
      );
      return NextResponse.json(FALLBACK);
    }

    const latestVersion = tagToVersion(release.tag_name);

    return NextResponse.json({
      latestVersion,
      // Force-update floor: release body marker > env override > never force.
      minRequiredVersion:
        parseMinRequired(release.body) ||
        process.env.APP_MIN_REQUIRED_VERSION ||
        '0.0.0',
      apkUrl: apkAsset.browser_download_url,
      releaseNotes: (release.body || '').trim() || FALLBACK.releaseNotes,
    });
  } catch (error) {
    console.error('[app-version] Error resolving latest release:', error);
    return NextResponse.json(FALLBACK);
  }
}
