import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_loading_wrapper.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_theme_tokens.dart';
import '../courses/course_detail_page.dart';
import '../courses/courses_page.dart';
import '../dashboard/dashboard_providers.dart';
import 'free_resources_page.dart';

class FreeCoursesPage extends ConsumerStatefulWidget {
  const FreeCoursesPage({super.key});

  @override
  ConsumerState<FreeCoursesPage> createState() => _FreeCoursesPageState();
}

class _FreeCoursesPageState extends ConsumerState<FreeCoursesPage> {
  final _enrollingIds = <String>{};

  Future<void> _enroll(String courseId) async {
    if (_enrollingIds.contains(courseId)) return;
    setState(() => _enrollingIds.add(courseId));
    try {
      await ref.read(apiClientProvider).post<dynamic>(
        '/api/free-resources/enroll',
        body: {'courseId': courseId},
      );
      if (!mounted) return;
      ref.invalidate(freeCoursesProvider);
      ref.invalidate(coursesProvider);
      ref.invalidate(dashboardProvider);
      ref.invalidate(courseDetailProvider(courseId));
      ref.invalidate(courseTopicsProvider(courseId));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Successfully enrolled in the free course.')),
      );
    } catch (error) {
      if (!mounted) return;
      final data = error is DioException ? error.response?.data : null;
      final message = data is Map && data['error'] is String
          ? data['error'] as String
          : 'Could not enroll. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } finally {
      if (mounted) setState(() => _enrollingIds.remove(courseId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final coursesAsync = ref.watch(freeCoursesProvider);
    return AppPageScaffold(
      title: 'Free Courses',
      subtitle: 'Browse and enroll for free',
      body: AppRefresh(
        onRefresh: () async {
          ref.invalidate(freeCoursesProvider);
          try {
            await ref.read(freeCoursesProvider.future);
          } catch (_) {
            // The provider renders the error with a retry action below.
          }
        },
        child: coursesAsync.when(
          loading: () => _message(
            const AppLoadingWrapper(isLoading: true),
          ),
          error: (_, __) => _message(
            Column(
              children: [
                const Text('Could not load free courses.'),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => ref.invalidate(freeCoursesProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
          data: (courses) => courses.isEmpty
              ? _message(const Text(
                  'No free courses available at the moment.',
                  textAlign: TextAlign.center,
                ))
              : ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  itemCount: courses.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final course =
                        (courses[index] as Map).cast<String, dynamic>();
                    final id = course['id'] as String;
                    return _FreeCourseCard(
                      course: course,
                      enrolling: _enrollingIds.contains(id),
                      onEnroll: () => _enroll(id),
                      onOpen: () => context.push(
                        '/courses/${Uri.encodeComponent(id)}',
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }

  Widget _message(Widget child) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
        children: [child],
      );
}

class _FreeCourseCard extends StatelessWidget {
  const _FreeCourseCard({
    required this.course,
    required this.enrolling,
    required this.onEnroll,
    required this.onOpen,
  });

  final Map<String, dynamic> course;
  final bool enrolling;
  final VoidCallback onEnroll;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final enrolled = course['isEnrolled'] == true;
    final subject = (course['subject'] as String?)?.trim() ?? '';
    final teacher = (course['teacherName'] as String?)?.trim() ?? '';
    final counts = course['_count'] as Map<String, dynamic>? ?? const {};

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: tokens.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.menu_book_outlined, color: tokens.primaryAccent),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  (course['name'] as String?) ?? 'Untitled course',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: tokens.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            enrolled ? 'FREE · ENROLLED' : 'FREE',
            style: TextStyle(
              color: tokens.success,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (subject.isNotEmpty || teacher.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              [subject, teacher].where((value) => value.isNotEmpty).join(' · '),
              style: TextStyle(color: tokens.textSecondary),
            ),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            children: [
              Text('${counts['topics'] ?? 0} Topics'),
              Text('${counts['lectures'] ?? 0} Lectures'),
              Text('${counts['materials'] ?? 0} Materials'),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: enrolling ? null : (enrolled ? onOpen : onEnroll),
            child: Text(enrolling
                ? 'Enrolling...'
                : enrolled
                    ? 'Open Course'
                    : 'Enroll for Free'),
          ),
        ],
      ),
    );
  }
}
