import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import 'rate_course_sheet.dart';

/// GET /api/feedback → list of feedback rows the user has already submitted.
/// Students see only their own (server enforces).
final myFeedbackProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<dynamic>('/api/feedback');
    final list = res.data is List ? res.data as List : const [];
    return [for (final j in list) j as Map<String, dynamic>];
  } catch (_) {
    return const [];
  }
});

/// /api/auth/me → enrolled courses are joined; we pull them from there
/// (already cached by the profile provider).
final enrolledCoursesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<Map<String, dynamic>>('/api/auth/me');
  final user = (res.data?['user'] as Map<String, dynamic>?) ?? const {};
  final enrollments = (user['enrollments'] as List?) ?? const [];
  return [
    for (final e in enrollments)
      (e as Map<String, dynamic>)['course'] as Map<String, dynamic>
  ];
});

class FeedbackPage extends ConsumerWidget {
  const FeedbackPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final enrolledAsync = ref.watch(enrolledCoursesProvider);
    final mineAsync = ref.watch(myFeedbackProvider);
    final mine = mineAsync.valueOrNull ?? const [];

    final ratedIds = {
      for (final f in mine) (f['courseId'] ?? (f['course'] as Map?)?['id']),
    };

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: AppRefresh(
          onRefresh: () async {
            ref.invalidate(enrolledCoursesProvider);
            ref.invalidate(myFeedbackProvider);
          },
          child: enrolledAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ListView(
              padding: const EdgeInsets.all(40),
              children: [
                const Icon(Icons.cloud_off,
                    color: AppColors.mute2, size: 40),
                const SizedBox(height: 8),
                Text('Could not load courses',
                    style: AppTypography.title,
                    textAlign: TextAlign.center),
                Text(e.toString(),
                    style: AppTypography.bodyMuted,
                    textAlign: TextAlign.center),
              ],
            ),
            data: (courses) => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                const SubPageHeader(
                  title: 'Course Feedback',
                  subtitle: 'Rate your enrolled courses',
                ),
                const SizedBox(height: 18),
                if (courses.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(40),
                    child: Column(
                      children: [
                        const Icon(Icons.star_outline,
                            color: AppColors.mute2, size: 40),
                        const SizedBox(height: 8),
                        Text('No courses to rate',
                            style: AppTypography.title),
                        const SizedBox(height: 4),
                        Text(
                            'Enroll in a course first, then share your feedback here.',
                            style: AppTypography.bodyMuted,
                            textAlign: TextAlign.center),
                      ],
                    ),
                  )
                else
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      children: [
                        for (final c in courses) ...[
                          _CourseFeedbackRow(
                            course: c,
                            alreadyRated: ratedIds.contains(c['id']),
                          ),
                          const SizedBox(height: 10),
                        ],
                      ],
                    ),
                  ),
                if (mine.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 20),
                    child: Text('YOUR RECENT FEEDBACK',
                        style: AppTypography.uppercase
                            .copyWith(letterSpacing: 1.2)),
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      children: [
                        for (final f in mine.take(5)) _MyFeedbackRow(f: f),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CourseFeedbackRow extends StatelessWidget {
  const _CourseFeedbackRow(
      {required this.course, required this.alreadyRated});
  final Map<String, dynamic> course;
  final bool alreadyRated;
  @override
  Widget build(BuildContext context) {
    final name = (course['name'] as String?) ?? 'Course';
    final subject = course['subject'] as String?;
    return InkWell(
      onTap: alreadyRated
          ? null
          : () => RateCourseSheet.show(
                context,
                courseId: (course['id'] as String?) ?? '',
                courseName: name,
              ),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.line),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.amberSft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.star_outline,
                  color: AppColors.amber, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style:
                          AppTypography.title.copyWith(fontSize: 13.5)),
                  if (subject != null)
                    Text(subject,
                        style: AppTypography.bodyMuted
                            .copyWith(fontSize: 11.5)),
                ],
              ),
            ),
            if (alreadyRated)
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.greenSft,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('SUBMITTED',
                    style: AppTypography.uppercase.copyWith(
                      color: AppColors.green,
                      fontSize: 9.5,
                      letterSpacing: 0.4,
                    )),
              )
            else
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: AppColors.brand,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('Rate',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.textInverse,
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    )),
              ),
          ],
        ),
      ),
    );
  }
}

class _MyFeedbackRow extends StatelessWidget {
  const _MyFeedbackRow({required this.f});
  final Map<String, dynamic> f;
  @override
  Widget build(BuildContext context) {
    final rating = (f['rating'] as num?)?.toInt() ?? 0;
    final comment = (f['comment'] as String?) ?? '';
    final course = f['course'] as Map<String, dynamic>?;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                      (course?['name'] as String?) ?? 'Course',
                      style: AppTypography.title.copyWith(fontSize: 13)),
                ),
                Row(
                  children: List.generate(
                      5,
                      (i) => Icon(
                            i < rating
                                ? Icons.star
                                : Icons.star_outline,
                            color: AppColors.amber,
                            size: 14,
                          )),
                ),
              ],
            ),
            if (comment.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(comment,
                  style: AppTypography.body
                      .copyWith(fontSize: 12, height: 1.4)),
            ],
          ],
        ),
      ),
    );
  }
}
