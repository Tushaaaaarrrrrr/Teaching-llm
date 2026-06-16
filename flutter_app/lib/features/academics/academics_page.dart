import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../features/courses/courses_page.dart' show coursesProvider;
import '../../features/live/live_sessions_page.dart' show liveSessionsProvider;
import '../../shared/widgets/app_topbar.dart';
import '../../shared/widgets/section_head.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';
import 'calendar_page.dart' show calendarEventsProvider;
import 'free_resources_page.dart'
    show
        freeCoursesProvider,
        freeMaterialsProvider,
        purchasedMaterialsProvider;

/// Academics hub — the new third bottom-nav tab.
/// Tile sub-stats are derived from the same providers the destination pages
/// use, so the numbers match what you'll see when you tap through. No more
/// hardcoded "420+ files" / "12 new messages" placeholders.
class AcademicsPage extends ConsumerWidget {
  const AcademicsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final firstName =
        (user?.firstName ?? user?.name.split(' ').first) ?? 'there';

    final now = DateTime.now();
    final calAsync = ref.watch(
        calendarEventsProvider((year: now.year, month: now.month)));
    final liveAsync = ref.watch(liveSessionsProvider);
    final freeCoursesAsync = ref.watch(freeCoursesProvider);
    final freeMaterialsAsync = ref.watch(freeMaterialsProvider);
    final purchasedAsync = ref.watch(purchasedMaterialsProvider);
    final coursesAsync = ref.watch(coursesProvider);

    final todayKey =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    final todayEvents = (calAsync.valueOrNull ?? const [])
        .where((e) => (e['date'] as String?) == todayKey)
        .length;
    final liveNow =
        (liveAsync.valueOrNull ?? const []).where((e) => e.isLive).length;
    final upcomingLive = (liveAsync.valueOrNull ?? const [])
        .where((e) => e.isUpcoming)
        .length;
    final freeFiles = (freeCoursesAsync.valueOrNull?.length ?? 0) +
        (freeMaterialsAsync.valueOrNull?.length ?? 0) +
        (purchasedAsync.valueOrNull?.length ?? 0);
    final communities = coursesAsync.valueOrNull?.length ?? 0;

    final tiles = <_TileSpec>[
      _TileSpec(
        label: 'Calendar',
        desc: 'Schedule, classes & deadlines',
        gradient: const [Color(0xFF6366F1), AppColors.brand],
        icon: Icons.calendar_month_outlined,
        stat: calAsync.isLoading
            ? 'Loading…'
            : (todayEvents == 0
                ? 'No events today'
                : '$todayEvents event${todayEvents == 1 ? '' : 's'} today'),
        path: '/calendar',
      ),
      _TileSpec(
        label: 'Live Sessions',
        desc: 'Join live classes & recordings',
        gradient: const [Color(0xFFF97316), Color(0xFFEA580C)],
        icon: Icons.live_tv_outlined,
        stat: liveAsync.isLoading
            ? 'Loading…'
            : (liveNow > 0
                ? '$liveNow live now'
                : (upcomingLive > 0
                    ? '$upcomingLive coming up'
                    : 'No live sessions')),
        path: '/live',
        live: liveNow > 0,
      ),
      _TileSpec(
        label: 'Free Resources',
        desc: 'Notes, PYQs & study aids',
        gradient: const [AppColors.green, Color(0xFF0E9F6E)],
        icon: Icons.description_outlined,
        stat: freeFiles == 0 ? 'Nothing yet' : '$freeFiles available',
        path: '/free-resources',
      ),
      _TileSpec(
        label: 'Community',
        desc: 'Chat with peers & instructors',
        gradient: const [Color(0xFFD946EF), Color(0xFFA21CAF)],
        icon: Icons.groups_outlined,
        stat: coursesAsync.isLoading
            ? 'Loading…'
            : (communities == 0
                ? 'No communities yet'
                : '$communities ${communities == 1 ? 'community' : 'communities'}'),
        path: '/community',
      ),
      _TileSpec(
        label: 'Course Feedback',
        desc: 'Ratings & student reviews',
        gradient: const [Color(0xFFFBBF24), Color(0xFFF59E0B)],
        icon: Icons.star_outline,
        stat: communities == 0
            ? 'Enroll in a course to rate'
            : 'Rate your enrolled courses',
        path: '/feedback',
      ),
      _TileSpec(
        label: 'Announcements',
        desc: 'Latest news & updates',
        gradient: const [Color(0xFF60A5FA), Color(0xFF2563EB)],
        icon: Icons.notifications_outlined,
        stat: 'From the LMS team',
        path: '/announcements',
      ),
    ];

    return AppRefresh(
      onRefresh: () async {
        ref.invalidate(calendarEventsProvider(
            (year: now.year, month: now.month)));
        ref.invalidate(liveSessionsProvider);
        ref.invalidate(freeCoursesProvider);
        ref.invalidate(freeMaterialsProvider);
        ref.invalidate(purchasedMaterialsProvider);
        ref.invalidate(coursesProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        children: [
          AppTopBar(name: firstName),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Academics', style: AppTypography.h1),
                const SizedBox(height: 3),
                Text('Everything for your learning journey',
                    style: AppTypography.bodyMuted.copyWith(fontSize: 13)),
                const SizedBox(height: 18),
                for (var i = 0; i < tiles.length; i++) ...[
                  _AcadTile(spec: tiles[i]),
                  if (i < tiles.length - 1)
                    const SizedBox(height: 12),
                ],
                const SectionHead(
                  title: 'This week',
                  subtitle: 'Tap any day to see schedule',
                ),
                const SizedBox(height: 14),
                const _WeekStrip(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TileSpec {
  const _TileSpec({
    required this.label,
    required this.desc,
    required this.gradient,
    required this.icon,
    required this.stat,
    required this.path,
    this.live = false,
  });
  final String label;
  final String desc;
  final List<Color> gradient;
  final IconData icon;
  final String stat;
  final String path;
  final bool live;
}

// _StatsStrip / _Mini / _Divider removed — they displayed fake "14 study
// days / 08:32 this week / 78% attendance" with no backend source. The
// tiles below now carry real counts derived from the same providers their
// destination pages use.

class _AcadTile extends StatelessWidget {
  const _AcadTile({required this.spec});
  final _TileSpec spec;
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.go(spec.path),
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.line),
          boxShadow: AppShadows.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: spec.gradient,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(spec.icon, color: AppColors.textInverse, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(spec.label,
                          style: AppTypography.title
                              .copyWith(fontSize: 15.5, letterSpacing: -0.2)),
                      if (spec.live) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.redSft,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 5,
                                height: 5,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.red,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text('LIVE',
                                  style: AppTypography.uppercase.copyWith(
                                    fontSize: 9,
                                    color: AppColors.red,
                                    letterSpacing: 0.5,
                                  )),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(spec.desc,
                      style: AppTypography.bodyMuted.copyWith(fontSize: 12)),
                  const SizedBox(height: 6),
                  Text(spec.stat,
                      style: AppTypography.caption.copyWith(
                        fontSize: 11,
                        color: AppColors.ink2,
                        fontWeight: FontWeight.w600,
                      )),
                ],
              ),
            ),
            const Icon(Icons.chevron_right,
                color: AppColors.mute2, size: 18),
          ],
        ),
      ),
    );
  }
}

class _WeekStrip extends StatelessWidget {
  const _WeekStrip();
  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    // Start of week (Monday)
    final weekStart = now.subtract(Duration(days: now.weekday - 1));
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return Row(
      children: List.generate(7, (i) {
        final day = weekStart.add(Duration(days: i));
        final isToday = day.year == now.year &&
            day.month == now.month &&
            day.day == now.day;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(left: i == 0 ? 0 : 4),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: isToday ? AppColors.brand : AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isToday ? AppColors.brand : AppColors.line,
                ),
              ),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Text(labels[i],
                      style: AppTypography.uppercase.copyWith(
                        fontSize: 10,
                        color: isToday
                            ? const Color(0xD9FFFFFF)
                            : AppColors.muted,
                        letterSpacing: 0.6,
                      )),
                  const SizedBox(height: 4),
                  Text('${day.day}',
                      style: AppTypography.title.copyWith(
                        fontSize: 16,
                        color: isToday ? AppColors.textInverse : AppColors.ink,
                      )),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }
}
