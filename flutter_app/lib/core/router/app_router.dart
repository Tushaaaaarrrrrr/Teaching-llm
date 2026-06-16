import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/academics/academics_page.dart';
import '../../features/academics/calendar_page.dart';
import '../../features/academics/free_resources_page.dart';
import '../../features/announcements/announcements_page.dart';
import '../../features/auth/login_page.dart';
import '../../features/community/community_chat_page.dart';
import '../../features/community/community_page.dart';
import '../../features/courses/course_detail_page.dart';
import '../../features/courses/courses_page.dart';
import '../../features/dashboard/dashboard_page.dart';
import '../../features/feedback/feedback_page.dart';
import '../../features/lecture/material_page.dart' as lecture_material;
import '../../features/lecture/watch_page.dart';
import '../../features/live/live_sessions_page.dart';
import '../../features/more/more_page.dart';
import '../../features/notifications/notifications_page.dart';
import '../../features/profile/profile_page.dart';
import '../../features/settings/notification_settings_page.dart';
import '../../features/store/course_offering_detail_page.dart';
import '../../features/store/course_offerings_page.dart';
import '../../features/store/store_page.dart';
import '../../features/support/faq_page.dart';
import '../../features/support/live_chat_page.dart';
import '../../features/support/support_page.dart';
import '../../features/transactions/transactions_page.dart';
import '../../shared/widgets/app_scaffold.dart';
import '../auth/auth_providers.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      final isSignedIn = auth.value != null;
      final goingToLogin = state.matchedLocation == '/login';
      if (!isSignedIn && !goingToLogin) return '/login';
      if (isSignedIn && goingToLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginPage(),
      ),
      // Fullscreen video — no bottom nav, hence not inside the ShellRoute.
      GoRoute(
        path: '/watch',
        builder: (_, state) =>
            WatchPage.fromQuery(state.uri.queryParameters) ??
            const MissingVideoPage(),
      ),
      // Fullscreen PDF / material viewer.
      GoRoute(
        path: '/material',
        builder: (_, state) =>
            lecture_material.MaterialPage.fromQuery(state.uri.queryParameters) ??
            const _MissingMaterialPage(),
      ),
      // Standalone pages launched from inside Profile / the academics hub.
      // They have their own Scaffold + AppBar so they live outside the
      // bottom-nav shell.
      GoRoute(
          path: '/profile', builder: (_, __) => const ProfilePage()),
      GoRoute(
          path: '/transactions',
          builder: (_, __) => const TransactionsPage()),
      GoRoute(path: '/faq', builder: (_, __) => const FaqPage()),
      GoRoute(
        path: '/support/chat',
        builder: (_, state) => LiveChatPage(
          chatId: state.uri.queryParameters['id'],
        ),
      ),
      GoRoute(
          path: '/notifications',
          builder: (_, __) => const NotificationsPage()),
      GoRoute(
          path: '/settings/notifications',
          builder: (_, __) => const NotificationSettingsPage()),
      // Academics sub-pages — launched from the Academics hub tiles.
      // They have their own back chip, so they live outside the bottom-nav.
      GoRoute(path: '/calendar', builder: (_, __) => const CalendarPage()),
      GoRoute(
          path: '/free-resources',
          builder: (_, __) => const FreeResourcesPage()),
      GoRoute(
          path: '/announcements',
          builder: (_, __) => const AnnouncementsPage()),
      GoRoute(
          path: '/feedback', builder: (_, __) => const FeedbackPage()),
      GoRoute(path: '/live', builder: (_, __) => const LiveSessionsPage()),
      GoRoute(
        path: '/community',
        builder: (_, __) => const CommunityPage(),
        routes: [
          GoRoute(
            path: ':courseId',
            builder: (_, state) => CommunityChatPage(
              courseId: state.pathParameters['courseId']!,
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/store',
        builder: (_, __) => const StorePage(),
        routes: [
          GoRoute(
            path: 'courses',
            builder: (_, __) => const CourseOfferingsPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => CourseOfferingDetailPage(
                  offeringId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
        ],
      ),
      // Bottom-nav shell — Home / Courses / Academics(FAB) / Support / More.
      ShellRoute(
        builder: (context, state, child) => AppScaffold(
          currentLocation: state.matchedLocation,
          child: child,
        ),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (_, __) => const DashboardPage(),
          ),
          GoRoute(
            path: '/courses',
            builder: (_, __) => const CoursesPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => CourseDetailPage(
                  courseId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/academics',
            builder: (_, __) => const AcademicsPage(),
          ),
          GoRoute(
            path: '/support',
            builder: (_, __) => const SupportPage(),
          ),
          GoRoute(
            path: '/more',
            builder: (_, __) => const MorePage(),
          ),
        ],
      ),
    ],
  );
});

/// Fallback for `/material` when the route is hit without a usable contentId.
class _MissingMaterialPage extends StatelessWidget {
  const _MissingMaterialPage();
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Missing material reference.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}

/// Bridges Riverpod's auth state into go_router's refreshListenable contract.
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    _sub = ref.listen(authStateProvider, (_, __) => notifyListeners());
  }
  late final ProviderSubscription _sub;
  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}

