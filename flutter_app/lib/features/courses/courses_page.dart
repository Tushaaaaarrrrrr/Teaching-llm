import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../core/models/course.dart';
import '../../shared/widgets/app_topbar.dart';
import '../../shared/widgets/section_head.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

final coursesProvider = FutureProvider<List<Course>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/courses');
  final data = res.data;
  final list = data is List
      ? data
      : (data is Map && data['courses'] is List ? data['courses'] : <dynamic>[]);
  return [for (final j in list) Course.fromJson(j as Map<String, dynamic>)];
});

/// Redesigned My Courses screen — matches courses.jsx from the design canvas:
/// page heading + filter button, search field, Continue-learning hero,
/// All-courses section with structured colour-banded cards.
class CoursesPage extends ConsumerWidget {
  const CoursesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final firstName =
        (user?.firstName ?? user?.name.split(' ').first) ?? 'there';
    final async = ref.watch(coursesProvider);
    final count = async.value?.length ?? 0;

    return AppRefresh(
      onRefresh: () async => ref.invalidate(coursesProvider),
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
                _Header(count: count),
                const SizedBox(height: 14),
                const _SearchField(),
                async.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 60),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (e, _) => _Error(message: e.toString()),
                  data: (courses) {
                    if (courses.isEmpty) return const _Empty();
                    final first = courses.first;
                    final rest = courses.skip(1).toList();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SectionHead(
                            title: 'Continue learning',
                            subtitle: 'Pick up where you left off'),
                        const SizedBox(height: 14),
                        _ContinueCard(course: first),
                        SectionHead(
                            title: 'All courses',
                            subtitle: '${courses.length} enrolled courses'),
                        const SizedBox(height: 14),
                        for (final c in rest) ...[
                          _CourseCard(course: c),
                          const SizedBox(height: 14),
                        ],
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.count});
  final int count;
  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('My Courses', style: AppTypography.h1),
              const SizedBox(height: 2),
              Text(
                '$count enrolled · pick up where you left off',
                style: AppTypography.bodyMuted.copyWith(fontSize: 12.5),
              ),
            ],
          ),
        ),
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.line),
          ),
          child: const Icon(Icons.tune, size: 16, color: AppColors.ink2),
        ),
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField();
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Row(
        children: [
          const Icon(Icons.search, size: 16, color: AppColors.muted),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search your courses…',
                border: InputBorder.none,
                hintStyle: AppTypography.body
                    .copyWith(color: AppColors.muted, fontSize: 13.5),
              ),
              style: AppTypography.body.copyWith(fontSize: 13.5),
            ),
          ),
        ],
      ),
    );
  }
}

Color _accentOf(Course c) {
  final v = int.tryParse(c.color.replaceAll('#', ''), radix: 16) ?? 0x6366F1;
  return Color(0xFF000000 | v);
}

class _ContinueCard extends StatelessWidget {
  const _ContinueCard({required this.course});
  final Course course;
  @override
  Widget build(BuildContext context) {
    final accent = _accentOf(course);
    return InkWell(
      onTap: () => context.go('/courses/${course.id}'),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.line),
          boxShadow: AppShadows.md,
        ),
        child: Row(
          children: [
            Container(
              width: 92,
              height: 92,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: LinearGradient(
                  colors: [accent, accent.withOpacity(0.72)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              alignment: Alignment.center,
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0x59FFFFFF),
                  borderRadius: BorderRadius.circular(19),
                  border: Border.all(
                      color: const Color(0x59FFFFFF), width: 1.5),
                ),
                child: const Icon(Icons.play_arrow,
                    color: AppColors.textInverse, size: 18),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CONTINUE LEARNING',
                    style: AppTypography.uppercase.copyWith(
                      fontSize: 10,
                      color: AppColors.brand,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(course.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.title
                          .copyWith(fontSize: 15, letterSpacing: -0.2)),
                  const SizedBox(height: 4),
                  Text(
                    course.subject ?? course.teacherName ?? 'Mentor',
                    style: AppTypography.bodyMuted.copyWith(fontSize: 12),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: AppColors.brand,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.play_arrow,
                            color: AppColors.textInverse, size: 12),
                        const SizedBox(width: 4),
                        Text('Resume',
                            style: AppTypography.caption.copyWith(
                              color: AppColors.textInverse,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            )),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.course});
  final Course course;

  String _batchLabel() {
    switch (course.enrollmentType) {
      case 'LIVE':
        return 'LIVE BATCH';
      case 'RECORDED':
        return 'DIPLOMA BATCH';
      case 'FREE':
        return 'FREE';
      case 'DEMO':
        return 'DEMO';
      default:
        return 'DIPLOMA BATCH';
    }
  }

  @override
  Widget build(BuildContext context) {
    final accent = _accentOf(course);
    final mentor = (course.teacherName ?? 'Mentor');
    final mentorInitial = mentor.trim().isNotEmpty
        ? mentor.trim()[0].toUpperCase()
        : '?';
    final accessDays = course.accessDays;
    final accessLabel = course.isExpired
        ? 'access expired'
        : accessDays != null
            ? 'access ends in $accessDays days'
            : 'lifetime access';

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: () => context.go('/courses/${course.id}'),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.line),
            boxShadow: AppShadows.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Coloured header band
              ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(20)),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [accent, accent.withOpacity(0.78)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: Stack(
                    clipBehavior: Clip.hardEdge,
                    children: [
                      Positioned(
                        right: -30,
                        top: -30,
                        child: Container(
                          width: 110,
                          height: 110,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0x14FFFFFF),
                          ),
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0x33FFFFFF),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(_batchLabel(),
                                    style: AppTypography.uppercase.copyWith(
                                      color: AppColors.textInverse,
                                      fontSize: 10,
                                      letterSpacing: 0.6,
                                    )),
                              ),
                              const Spacer(),
                              if (course.subject != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 9, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0x2EFFFFFF),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(course.subject!,
                                      style: AppTypography.caption.copyWith(
                                        color: AppColors.textInverse,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                      )),
                                ),
                            ],
                          ),
                          const SizedBox(height: 28),
                          Text(course.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.title.copyWith(
                                color: AppColors.textInverse,
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                              )),
                          if (course.description != null) ...[
                            const SizedBox(height: 3),
                            Text(course.description!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.body.copyWith(
                                  color: const Color(0xD9FFFFFF),
                                  fontSize: 11.5,
                                )),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Body
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: accent.withOpacity(0.12),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(mentorInitial,
                              style: AppTypography.caption.copyWith(
                                color: accent,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              )),
                        ),
                        const SizedBox(width: 8),
                        Text(mentor,
                            style: AppTypography.body.copyWith(
                              fontSize: 12.5,
                              color: AppColors.ink2,
                              fontWeight: FontWeight.w600,
                            )),
                        const SizedBox(width: 6),
                        Container(
                            width: 3,
                            height: 3,
                            decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.mute2)),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(accessLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.bodyMuted
                                  .copyWith(fontSize: 11.5)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Stats strip
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.bg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                              child: _Stat(
                                  value: course.topicsCount, label: 'Topics')),
                          Container(
                              width: 1,
                              height: 28,
                              color: AppColors.line2),
                          Expanded(
                              child: _Stat(
                                  value: course.lecturesCount,
                                  label: 'Lectures')),
                          Container(
                              width: 1,
                              height: 28,
                              color: AppColors.line2),
                          Expanded(
                              child: _Stat(
                                  value: course.materialsCount,
                                  label: 'Materials')),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Actions
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 42,
                            decoration: BoxDecoration(
                              color: AppColors.ink,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('Continue',
                                    style: AppTypography.title.copyWith(
                                      color: AppColors.textInverse,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                    )),
                                const SizedBox(width: 6),
                                const Icon(Icons.arrow_forward,
                                    color: AppColors.textInverse, size: 12),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.line),
                          ),
                          child: const Icon(Icons.bookmark_outline,
                              color: AppColors.ink2, size: 16),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});
  final int value;
  final String label;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          Text('$value',
              style: AppTypography.title
                  .copyWith(fontSize: 16, color: AppColors.ink, height: 1)),
          const SizedBox(height: 1),
          Text(label,
              style: AppTypography.caption.copyWith(
                fontSize: 10.5,
                color: AppColors.muted,
                fontWeight: FontWeight.w600,
              )),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        children: [
          const Icon(Icons.menu_book_outlined,
              color: AppColors.mute2, size: 40),
          const SizedBox(height: 8),
          Text('No courses enrolled yet',
              style: AppTypography.title, textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text('Enrolled courses will show up here.',
              style: AppTypography.bodyMuted, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        children: [
          const Icon(Icons.cloud_off, color: AppColors.mute2, size: 40),
          const SizedBox(height: 8),
          Text('Could not load your courses',
              style: AppTypography.title, textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text(message,
              style: AppTypography.bodyMuted, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
