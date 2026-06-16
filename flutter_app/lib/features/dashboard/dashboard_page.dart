import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_topbar.dart';
import '../../shared/widgets/section_head.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import 'dashboard_providers.dart';
import 'home_slider.dart';
import '../../shared/widgets/app_refresh.dart';

/// "Home" — the explore/discovery surface. Hero greeting, search, category
/// chips, featured live-batch banner, trending recordings, learning path.
/// Replaces the old static dashboard. Wired to /api/dashboard + /api/courses.
class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  String _greet() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    if (h < 21) return 'Good Evening';
    return 'Good Night';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final firstName =
        (user?.firstName ?? user?.name.split(' ').first) ?? 'there';
    final dashAsync = ref.watch(dashboardProvider);
    final dash = dashAsync.value ?? const <String, dynamic>{};
    final liveSessions = (dash['liveSessions'] as List?) ?? const [];
    final recentLecture =
        dash['recentViewedLecture'] as Map<String, dynamic>?;
    final upcomingExams = (dash['upcomingExams'] as List?) ?? const [];
    final announcements =
        (dash['announcements'] as List?) ?? const [];

    return AppRefresh(
      onRefresh: () async {
        ref.invalidate(dashboardProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          _HomeGreeting(
            firstName: firstName,
            greeting: _greet(),
          ),
          const SizedBox(height: 18),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: HomeSlider(),
          ),
          const SizedBox(height: 6),

          // ── Upcoming Session ───────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SectionHead(
              title: 'Upcoming Session',
              subtitle: 'Your next live class',
              right: liveSessions.isEmpty ? null : 'View All',
              onRightTap: liveSessions.isEmpty
                  ? null
                  : () => context.go('/live'),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _UpcomingSessionCard(sessions: liveSessions),
          ),

          // ── Recent Lecture ──────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: const SectionHead(
              title: 'Recent Lecture',
              subtitle: 'Pick up where you left off',
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _RecentLectureCard(lecture: recentLecture),
          ),

          // ── Upcoming Assessments ────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SectionHead(
              title: 'Upcoming Assessments',
              subtitle: 'Tests scheduled for you',
              right: 'View All',
              onRightTap: () => context.go('/calendar'),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: InkWell(
              onTap: () => context.go('/calendar'),
              borderRadius: BorderRadius.circular(16),
              child: _UpcomingAssessmentsCard(exams: upcomingExams),
            ),
          ),

          // ── Announcements ───────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SectionHead(
              title: 'Announcements',
              subtitle: 'Latest from the team',
              right: announcements.isEmpty ? null : 'View All',
              onRightTap: announcements.isEmpty
                  ? null
                  : () => context.go('/announcements'),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _AnnouncementsCard(items: announcements),
          ),
        ],
      ),
    );
  }
}

/// Greeting block at the top of the Home tab. Mirrors the screenshot:
/// avatar circle, "Good Morning, FirstName" + tagline, notification bell.
class _HomeGreeting extends ConsumerWidget {
  const _HomeGreeting({required this.firstName, required this.greeting});
  final String firstName;
  final String greeting;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notif = ref.watch(unreadProvider).valueOrNull ?? 0;
    final initial = firstName.trim().isNotEmpty
        ? firstName.trim()[0].toUpperCase()
        : 'S';
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.brand, AppColors.brandDk],
              ),
            ),
            alignment: Alignment.center,
            child: Text(initial,
                style: AppTypography.title.copyWith(
                  color: AppColors.textInverse,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                )),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(
                  TextSpan(
                    style: AppTypography.h2.copyWith(fontSize: 17),
                    children: [
                      TextSpan(text: '$greeting, '),
                      TextSpan(
                          text: firstName,
                          style: AppTypography.h2.copyWith(
                            fontSize: 17,
                            color: AppColors.brand,
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                    "Hope you're ready for a productive day ahead.",
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.bodyMuted
                        .copyWith(fontSize: 12)),
              ],
            ),
          ),
          _BellButton(
            badge: notif,
            onTap: () => context.go('/notifications'),
          ),
        ],
      ),
    );
  }
}

class _BellButton extends StatelessWidget {
  const _BellButton({required this.badge, required this.onTap});
  final int badge;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return InkResponse(
      onTap: onTap,
      radius: 22,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.line),
            ),
            child: const Icon(Icons.notifications_none_outlined,
                size: 18, color: AppColors.ink2),
          ),
          if (badge > 0)
            Positioned(
              top: 6,
              right: 6,
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: AppColors.red,
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _UpcomingSessionCard extends StatelessWidget {
  const _UpcomingSessionCard({required this.sessions});
  final List sessions;

  String _formatTime(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final mm = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour < 12 ? 'AM' : 'PM';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${months[dt.month - 1]} ${dt.day} · $h:$mm $ampm';
  }

  @override
  Widget build(BuildContext context) {
    if (sessions.isEmpty) {
      return _EmptyStateCard(
        icon: Icons.videocam_outlined,
        title: 'No upcoming sessions',
        sub: 'Check back later for live classes',
      );
    }
    final s = sessions.first as Map<String, dynamic>;
    final title = (s['title'] as String?) ?? 'Live session';
    final mentor = s['mentor'] as String?;
    final when = _formatTime(s['startDate'] as String?);
    final isLive = s['status'] == 'live';
    return InkWell(
      onTap: () => context.go('/live'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
          boxShadow: AppShadows.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isLive ? AppColors.danger : AppColors.brand,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                isLive ? Icons.live_tv : Icons.videocam_outlined,
                color: AppColors.textInverse,
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(isLive ? 'LIVE NOW' : 'UP NEXT',
                      style: AppTypography.uppercase.copyWith(
                        color: isLive ? AppColors.danger : AppColors.brand,
                        letterSpacing: 0.4,
                      )),
                  const SizedBox(height: 4),
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.title),
                  if (mentor != null || when.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text([if (mentor != null) mentor, if (when.isNotEmpty) when].join(' · '),
                        style: AppTypography.bodyMuted),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.mute2),
          ],
        ),
      ),
    );
  }
}

class _RecentLectureCard extends StatelessWidget {
  const _RecentLectureCard({required this.lecture});
  final Map<String, dynamic>? lecture;
  @override
  Widget build(BuildContext context) {
    if (lecture == null) {
      return _EmptyStateCard(
        icon: Icons.play_circle_outline,
        title: 'No recent lectures',
        sub: '',
      );
    }
    final content = (lecture!['content'] as Map<String, dynamic>?) ?? const {};
    final title = (content['title'] as String?) ?? 'Lecture';
    final topic = (content['topic'] as Map<String, dynamic>?) ?? const {};
    final course = (topic['course'] as Map<String, dynamic>?) ?? const {};
    final courseName = (course['name'] as String?) ?? 'Course';
    final colorHex = (course['color'] as String?) ?? '#4F46E5';
    final v = int.tryParse(colorHex.replaceAll('#', ''), radix: 16) ?? 0x4F46E5;
    final accent = Color(0xFF000000 | v);
    final courseId = topic['courseId'] as String?;
    return InkWell(
      onTap: () {
        if (courseId != null) context.go('/courses/$courseId');
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
          boxShadow: AppShadows.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: accent,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.play_arrow,
                  color: AppColors.textInverse, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(courseName.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.uppercase.copyWith(color: accent)),
                  const SizedBox(height: 4),
                  Text(title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.title),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.mute2),
          ],
        ),
      ),
    );
  }
}

class _UpcomingAssessmentsCard extends StatelessWidget {
  const _UpcomingAssessmentsCard({required this.exams});
  final List exams;

  String _formatDate(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${months[dt.month - 1]} ${dt.day}';
  }

  @override
  Widget build(BuildContext context) {
    if (exams.isEmpty) {
      return _EmptyStateCard(
        icon: Icons.quiz_outlined,
        title: 'No upcoming exams or tests',
        sub: '',
      );
    }
    return Column(
      children: [
        for (final e in exams.take(3))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _ExamRow(exam: e as Map<String, dynamic>, formatter: _formatDate),
          ),
      ],
    );
  }
}

class _ExamRow extends StatelessWidget {
  const _ExamRow({required this.exam, required this.formatter});
  final Map<String, dynamic> exam;
  final String Function(String?) formatter;
  @override
  Widget build(BuildContext context) {
    final title = (exam['title'] as String?) ?? 'Exam';
    final course = (exam['course'] as Map<String, dynamic>?) ?? const {};
    final courseName = (course['name'] as String?) ?? '';
    final start = formatter(exam['startDate'] as String?);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
        boxShadow: AppShadows.sm,
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.amberSft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.quiz, color: AppColors.amber, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.title.copyWith(fontSize: 13.5)),
                if (courseName.isNotEmpty || start.isNotEmpty)
                  Text(
                      [if (courseName.isNotEmpty) courseName, if (start.isNotEmpty) start]
                          .join(' · '),
                      style: AppTypography.bodyMuted.copyWith(fontSize: 11.5)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.mute2),
        ],
      ),
    );
  }
}

class _AnnouncementsCard extends StatelessWidget {
  const _AnnouncementsCard({required this.items});
  final List items;
  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return _EmptyStateCard(
        icon: Icons.campaign_outlined,
        title: 'No announcements',
        sub: 'Updates from the team will appear here',
      );
    }
    return Column(
      children: [
        for (final a in items.take(3))
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _AnnouncementRow(a: a as Map<String, dynamic>),
          ),
      ],
    );
  }
}

class _AnnouncementRow extends StatelessWidget {
  const _AnnouncementRow({required this.a});
  final Map<String, dynamic> a;
  @override
  Widget build(BuildContext context) {
    final title = (a['title'] as String?) ?? 'Announcement';
    final message = (a['message'] as String?) ?? '';
    return InkWell(
      onTap: () => context.go('/announcements'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.line),
          boxShadow: AppShadows.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.brandSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.campaign,
                  color: AppColors.brand, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.title.copyWith(fontSize: 13.5)),
                  if (message.isNotEmpty)
                    Text(message,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bodyMuted.copyWith(fontSize: 11.5)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyStateCard extends StatelessWidget {
  const _EmptyStateCard(
      {required this.icon, required this.title, required this.sub});
  final IconData icon;
  final String title;
  final String sub;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.mute2, size: 32),
          const SizedBox(height: 10),
          Text(title,
              textAlign: TextAlign.center,
              style: AppTypography.title.copyWith(fontSize: 13.5)),
          if (sub.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(sub,
                textAlign: TextAlign.center,
                style: AppTypography.bodyMuted.copyWith(fontSize: 12)),
          ],
        ],
      ),
    );
  }
}

