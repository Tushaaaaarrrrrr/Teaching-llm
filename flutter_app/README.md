# Teaching LLM — Flutter App

Native Android (and future iOS) client for the GenZ IITian LMS. Mirrors the **mobile-web UX** of the existing Next.js app and talks to the same backend at `https://teaching-llm.onrender.com`.

The web app stays the source of truth for content authoring; this Flutter app is the consumer experience for students.

---

## Prerequisites

| Tool | Version |
|---|---|
| Flutter SDK | 3.4.0 or newer |
| Dart | 3.4+ (bundled with Flutter) |
| Android Studio / SDK | API 34 |
| JDK | 17 (Android Studio bundled JBR is fine) |

Verify with:

```bash
flutter --version
flutter doctor
```

If `flutter doctor` flags missing tools (Android licenses, command-line tools), accept them with `flutter doctor --android-licenses` first.

---

## One-time setup

```bash
cd flutter_app
flutter pub get
flutter create .       # generates the missing android/ ios/ platform folders the first time
flutter pub get
```

> The `flutter create .` step is only needed once after cloning — `pubspec.yaml`, `lib/`, and `README.md` are in this repo but the platform folders (`android/`, `ios/`, `web/`) are gitignored to keep the codebase clean.

### Fonts

The pubspec references the Outfit font family. Download the four weights from [Google Fonts → Outfit](https://fonts.google.com/specimen/Outfit) and drop them into `assets/fonts/`:

```
flutter_app/assets/fonts/
├── Outfit-Regular.ttf
├── Outfit-Medium.ttf
├── Outfit-SemiBold.ttf
├── Outfit-Bold.ttf
└── Outfit-Black.ttf
```

(If you skip this, Flutter falls back to the system font and the app still runs — just doesn't quite match the web look.)

### Google Sign-In

Native Google Sign-In requires the Android OAuth client in Google Cloud Console with:
- **Package name:** `com.teaching.lms` (or whatever you set in `android/app/build.gradle`'s `applicationId`)
- **Debug SHA-1:** find with `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`

The Web client ID is already wired in `lib/config/api_config.dart`. To override:

```bash
flutter run --dart-define=GOOGLE_WEB_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
```

---

## Run

```bash
# Against the deployed Render backend (default)
flutter run

# Against a local Next.js dev server on the emulator
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Build a debug APK:

```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
```

Release APK (needs a release keystore wired in `android/app/build.gradle`):

```bash
flutter build apk --release
```

---

## Project layout

```
flutter_app/
├── lib/
│   ├── main.dart                          # entry point
│   ├── app.dart                           # MaterialApp.router + theme
│   ├── config/
│   │   └── api_config.dart                # base URL, OAuth client, timeouts
│   ├── theme/
│   │   ├── app_colors.dart                # neumorphic palette mirroring web
│   │   ├── app_shadows.dart               # BoxShadow recipes (sm, md, lg, cardFloat, pillGlow)
│   │   ├── app_typography.dart            # h1 / h2 / title / body / caption styles
│   │   └── app_theme.dart                 # ThemeData
│   ├── core/
│   │   ├── api/
│   │   │   └── api_client.dart            # Dio + Authorization Bearer interceptor
│   │   ├── auth/
│   │   │   ├── token_storage.dart         # flutter_secure_storage
│   │   │   ├── auth_service.dart          # Google → backend → JWT
│   │   │   └── auth_providers.dart        # Riverpod AsyncNotifier<User?>
│   │   ├── models/
│   │   │   ├── user.dart
│   │   │   ├── course.dart
│   │   │   └── course_event.dart
│   │   └── router/
│   │       └── app_router.dart            # go_router with auth guard
│   ├── shared/widgets/
│   │   ├── neu_card.dart                  # Neumorphic card
│   │   ├── neu_button.dart                # Pill button (primary/dark/ghost/danger)
│   │   ├── mobile_bottom_nav.dart         # 5-tab bottom nav
│   │   └── app_scaffold.dart              # Shell scaffold for tabbed routes
│   └── features/
│       ├── auth/login_page.dart           # Google sign-in + quick-login fallback
│       ├── dashboard/dashboard_page.dart  # Greeting, hero slider, upcoming, recent
│       ├── courses/courses_page.dart      # My Courses list
│       ├── courses/course_detail_page.dart# Purple hero, mentor card, tabs
│       ├── live/live_sessions_page.dart   # Live / Upcoming / Recorded tabs
│       └── menu/menu_page.dart            # Profile, info links, social, sign out
├── assets/
│   └── fonts/                             # Outfit font files (you add)
├── pubspec.yaml
└── README.md
```

---

## How it talks to the backend

| What | Endpoint | File |
|---|---|---|
| Google sign-in | `POST /api/auth/google` | `AuthService.signInWithGoogle` |
| Quick login fallback | `POST /api/auth/student-quick-login` | `AuthService.quickStudentLogin` |
| Current user | `GET /api/auth/me` | `AuthService.currentUser` |
| Sign out | `POST /api/auth/logout` | `AuthService.signOut` |
| My courses | `GET /api/courses` | `coursesProvider` |
| Course detail | `GET /api/courses/:id` + `GET /api/courses/:id/topics` | `courseDetailProvider` |
| Today's live sessions | `GET /api/live-sessions` | `liveSessionsProvider` |

The JWT is stored encrypted via `flutter_secure_storage`. `ApiClient`'s interceptor attaches it as `Authorization: Bearer <token>` on every request — the backend's `getSession()` accepts both cookie and Bearer.

---

## What's in this Phase 1

✅ Auth (Google + quick-login fallback) with secure JWT storage
✅ Bottom-nav shell (Home / Courses / Academics / Support / Menu)
✅ Login page
✅ Dashboard (greeting header, hero card, upcoming-session row, recent-lecture card)
✅ My Courses list (purple gradient cards, mentor, access-days, 3-stat tiles)
✅ Course Detail (purple hero with back/bookmark, mentor card, Curriculum / Overview / Reviews tabs)
✅ Live Sessions (Live / Upcoming / Recorded pills, red LIVE card, time-pill upcoming rows)
✅ Menu (profile chip, info links, branded social tiles, sign out)
✅ Neumorphic theme matching the web design system
✅ Dio-based API client with auth interceptor

---

## What's deferred to Phase 2

These are scaffolded as routes/providers but need full implementations:

- 🟡 **Lecture player** with native `video_player`/`chewie` (Drive-stream proxy URL)
- 🟡 **Agora live broadcast page** — install `agora_rtc_engine`, use existing `/api/live/token` + `/api/live/start` + `/api/live/end` endpoints, implement host/audience views from `live/[sessionId]/page.tsx` as Flutter
- 🟡 **Community chat** (per-course list + thread + SSE stream via Dio response stream)
- 🟡 **Direct messages** (manager-initiated DMs)
- 🟡 **Push notifications** — `firebase_core` + `firebase_messaging` + register FCM token to `/api/notifications/register-fcm-token`
- 🟡 **Calendar page** with month/day views
- 🟡 **Announcements feed**
- 🟡 **Profile edit** with form + avatar picker
- 🟡 **Exams** (attempt + autosave)
- 🟡 **Free resources** (public-facing course list)
- 🟡 **Manager screens** (decide whether to ship as part of this app or keep web-only)

---

## Adding a new screen — pattern

1. **Model** — add a Dart class under `lib/core/models/` with `fromJson`.
2. **Provider** — `FutureProvider` (or `AsyncNotifier`) that calls `apiClientProvider`.
3. **Page** — `ConsumerWidget` or `ConsumerStatefulWidget` in `lib/features/<area>/`.
4. **Route** — add a `GoRoute` to `lib/core/router/app_router.dart`.

Example: a single-screen "Announcements" page

```dart
// lib/core/models/announcement.dart
class Announcement {
  const Announcement({required this.id, required this.title, required this.content});
  final String id;
  final String title;
  final String content;
  factory Announcement.fromJson(Map<String, dynamic> j) => Announcement(
        id: j['id'] as String,
        title: j['title'] as String,
        content: j['content'] as String,
      );
}

// lib/features/announcements/announcements_page.dart
final announcementsProvider = FutureProvider((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<List<dynamic>>('/api/announcements');
  return [for (final j in (res.data ?? [])) Announcement.fromJson(j)];
});

class AnnouncementsPage extends ConsumerWidget {
  const AnnouncementsPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = ref.watch(announcementsProvider);
    return list.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Text(e.toString()),
      data: (items) => ListView(children: items.map((a) => Text(a.title)).toList()),
    );
  }
}

// Add to app_router.dart:
// GoRoute(path: '/announcements', builder: (_, __) => const AnnouncementsPage()),
```

---

## Troubleshooting

**"Google sign-in returns null."**
Means the user cancelled. No fix needed.

**"google_sign_in throws PlatformException(sign_in_failed, ApiException: 10)."**
The Android OAuth client isn't registered (or wrong SHA-1). Add the debug-keystore SHA-1 to Google Cloud Console → Credentials → Android OAuth client.

**"Connection refused on http://10.0.2.2:3000."**
The Android emulator reaches the host machine at `10.0.2.2`. Make sure your Next.js dev server is actually running on port 3000 on the host (`npm run dev`).

**"401 Unauthorized on /api/courses after login."**
The JWT wasn't stored. Check `flutter_secure_storage` permissions in `android/app/src/main/AndroidManifest.xml` — newer Android versions need encrypted shared prefs (already configured in `TokenStorage`).

**App appears blank after sign-in.**
The dashboard's data requires `/api/auth/me` to succeed. Check `flutter run`'s logs for the failing request; usually a CORS or 500 issue on the backend.

---

## Roadmap to v1 release

1. **Phase 1** (this) — auth + browse content (✅ in this commit)
2. **Phase 2** — lectures (video player) + community (SSE) + push (FCM)
3. **Phase 3** — Agora live class broadcasting
4. **Phase 4** — exams, profile edit, free resources
5. **Phase 5** — polish, app icon, Play Store internal testing
6. **Phase 6** — closed alpha → production

Expected: ~3-4 months for one Flutter dev working full time.

---

## License

Internal project. Do not redistribute.
