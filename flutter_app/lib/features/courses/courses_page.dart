import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../core/models/course.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_theme_tokens.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/bouncy_pressable.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../shared/widgets/shimmer_loading.dart';
import '../dashboard/dashboard_providers.dart';

const _kCachedCoursesKey = 'cached_courses_payload';

final coursesProvider = FutureProvider<List<Course>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<dynamic>('/api/courses');
    final data = res.data;
    final list = data is List
        ? data
        : (data is Map && data['courses'] is List
            ? data['courses']
            : <dynamic>[]);
    if (list.isNotEmpty) {
      SharedPreferences.getInstance().then((prefs) {
        prefs.setString(_kCachedCoursesKey, jsonEncode(list));
      }).catchError((_) {});

      return [
        for (final j in list) Course.fromJson(j as Map<String, dynamic>)
      ];
    }
  } catch (_) {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(_kCachedCoursesKey);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        final list = jsonDecode(cachedStr) as List;
        return [
          for (final j in list) Course.fromJson(j as Map<String, dynamic>)
        ];
      }
    } catch (_) {}
  }

  return const <Course>[];
});

/// Redesigned My Courses screen — matches courses.jsx from the design canvas:
/// page heading + filter button, search field, Continue-learning hero,
/// All-courses section with structured colour-banded cards.
class CoursesPage extends ConsumerWidget {
  const CoursesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(coursesProvider);
    final count = async.value?.length ?? 0;
    final dash = ref.watch(dashboardProvider).valueOrNull;
    final recentLecture = dash?['recentViewedLecture'] as Map<String, dynamic>?;
    final hasRecent = recentLecture != null &&
        recentLecture.isNotEmpty &&
        (recentLecture['content'] != null || recentLecture['id'] != null);
    final String? recentCourseId = hasRecent
        ? (((recentLecture['content'] as Map?)?['topic'] as Map?)?['courseId'] as String? ??
            (recentLecture['content'] as Map?)?['courseId'] as String? ??
            recentLecture['courseId'] as String?)
        : null;

    return Scaffold(
      backgroundColor: context.tokens.bg,
      body: SafeArea(
        bottom: false,
        child: AppRefresh(
          onRefresh: () async => ref.invalidate(coursesProvider),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 110),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Header(count: count),
                    const SizedBox(height: 14),
                    const _SearchField(),
                    async.when(
                      loading: () => const Column(
                        children: [
                          SizedBox(height: 14),
                          SkeletonBox(height: 140, borderRadius: 20),
                          SizedBox(height: 14),
                          SkeletonBox(height: 120, borderRadius: 20),
                          SizedBox(height: 14),
                          SkeletonBox(height: 120, borderRadius: 20),
                        ],
                      ),
                      error: (e, _) => _Error(message: e.toString()),
                      data: (courses) {
                        if (courses.isEmpty) return const _Empty();

                        // Only show Continue Learning if the user actually has an in-progress course
                        Course? continueCourse;
                        if (recentCourseId != null && recentCourseId.isNotEmpty) {
                          for (final c in courses) {
                            if (c.id == recentCourseId) {
                              continueCourse = c;
                              break;
                            }
                          }
                        }

                        final remainingCourses = continueCourse != null
                            ? courses.where((c) => c.id != continueCourse!.id).toList()
                            : courses;

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (continueCourse != null) ...[
                              const SizedBox(height: 14),
                              _ContinueCard(course: continueCourse),
                            ],
                            const SizedBox(height: 14),
                            for (final c in remainingCourses) ...[
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
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              'My Courses',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: tokens.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            Text(
              '$count Enrolled',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: tokens.textSecondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Divider(color: tokens.divider, thickness: 1.2, height: 1),
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField();

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: tokens.surfaceSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tokens.border),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Row(
        children: [
          Icon(Icons.search, size: 18, color: tokens.textMuted),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search your courses…',
                border: InputBorder.none,
                hintStyle: TextStyle(
                  color: tokens.textMuted,
                  fontSize: 13.5,
                ),
              ),
              style: TextStyle(
                color: tokens.textPrimary,
                fontSize: 13.5,
              ),
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
    final tokens = context.tokens;

    return BouncyPressable(
      onTap: () {
        HapticFeedback.lightImpact();
        context.push('/courses/${course.id}');
      },
      scaleDown: 0.98,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: tokens.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: tokens.border),
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
                    color: Colors.white, size: 18),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CONTINUE LEARNING',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: tokens.primaryAccent,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    course.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: tokens.textPrimary,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    course.subject ?? course.teacherName ?? 'Mentor',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: tokens.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: tokens.primaryAccent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.play_arrow, color: Colors.white, size: 12),
                        SizedBox(width: 4),
                        Text(
                          'Resume',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
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
    final mentorInitial =
        mentor.trim().isNotEmpty ? mentor.trim()[0].toUpperCase() : '?';
    final tokens = context.tokens;

    return BouncyPressable(
      onTap: () {
        HapticFeedback.lightImpact();
        context.push('/courses/${course.id}');
      },
      scaleDown: 0.98,
      child: Container(
        decoration: BoxDecoration(
          color: tokens.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: tokens.border),
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
                              child: Text(
                                _batchLabel(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Builder(builder: (_) {
                              final tag = (course.tag ??
                                      course.packageName ??
                                      'PRO')
                                  .trim()
                                  .toUpperCase();
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 9, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0x2EFFFFFF),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  tag,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                        const SizedBox(height: 28),
                        Text(
                          course.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                          ),
                        ),
                        if (course.description != null) ...[
                          const SizedBox(height: 3),
                          Text(
                            course.description!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xD9FFFFFF),
                              fontSize: 11.5,
                            ),
                          ),
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
                        child: Text(
                          mentorInitial,
                          style: TextStyle(
                            color: accent,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        mentor,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: tokens.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if ((course.subject ?? '').trim().isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          width: 3,
                          height: 3,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: tokens.textMuted,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            course.subject!.trim(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: tokens.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Stats strip
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: tokens.surfaceSecondary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _Stat(
                            value: course.topicsCount,
                            label: 'Topics',
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 28,
                          color: tokens.border,
                        ),
                        Expanded(
                          child: _Stat(
                            value: course.lecturesCount,
                            label: 'Lectures',
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 28,
                          color: tokens.border,
                        ),
                        Expanded(
                          child: _Stat(
                            value: course.materialsCount,
                            label: 'Materials',
                          ),
                        ),
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
                            color: tokens.textPrimary,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Continue',
                                style: TextStyle(
                                  color: tokens.bg,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Icon(
                                Icons.arrow_forward,
                                color: tokens.bg,
                                size: 12,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: tokens.surfaceSecondary,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: tokens.border),
                        ),
                        child: Icon(
                          Icons.bookmark_outline,
                          color: tokens.textPrimary,
                          size: 16,
                        ),
                      ),
                    ],
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

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});
  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          Text(
            '$value',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: tokens.textPrimary,
              height: 1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              color: tokens.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        children: [
          Icon(Icons.menu_book_outlined, color: tokens.textMuted, size: 40),
          const SizedBox(height: 8),
          Text(
            'No courses enrolled yet',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: tokens.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            'Enrolled courses will show up here.',
            style: TextStyle(
              fontSize: 13,
              color: tokens.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
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
    final tokens = context.tokens;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        children: [
          Icon(Icons.cloud_off, color: tokens.textMuted, size: 40),
          const SizedBox(height: 8),
          Text(
            'Could not load your courses',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: tokens.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            message,
            style: TextStyle(
              fontSize: 13,
              color: tokens.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
