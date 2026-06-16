import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/course.dart';
import '../../features/courses/courses_page.dart' show coursesProvider;
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

/// Community page — one community per enrolled course. No DMs, no peer-to-peer
/// chats. Mirrors ScreenCommunity in community.jsx — pinned hero card, course
/// list, community guidelines reminder. Uses the same /api/courses provider
/// so the user only sees communities for courses they're enrolled in.
class CommunityPage extends ConsumerWidget {
  const CommunityPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coursesAsync = ref.watch(coursesProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            const SubPageHeader(
              title: 'Communities',
              subtitle: 'One community per course · join the conversation',
              right: CircleIconBtn(icon: Icons.search),
            ),
            const SizedBox(height: 4),
            coursesAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 60),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20, vertical: 40),
                child: Column(
                  children: [
                    const Icon(Icons.cloud_off,
                        color: AppColors.mute2, size: 40),
                    const SizedBox(height: 8),
                    Text('Could not load communities',
                        style: AppTypography.title,
                        textAlign: TextAlign.center),
                    const SizedBox(height: 4),
                    Text(e.toString(),
                        style: AppTypography.bodyMuted,
                        textAlign: TextAlign.center),
                  ],
                ),
              ),
              data: (courses) {
                if (courses.isEmpty) return _empty();
                final pinned = courses.first;
                final rest = courses.skip(1).toList();
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 18),
                      Text('PINNED',
                          style: AppTypography.uppercase
                              .copyWith(letterSpacing: 1.4)),
                      const SizedBox(height: 10),
                      _CommunityCard(course: pinned, featured: true),
                      const SizedBox(height: 20),
                      Text('YOUR COURSES',
                          style: AppTypography.uppercase
                              .copyWith(letterSpacing: 1.4)),
                      const SizedBox(height: 10),
                      ...rest.map((c) => Padding(
                            padding: const EdgeInsets.only(top: 10),
                            child: _CommunityCard(
                                course: c, featured: false),
                          )),
                      const SizedBox(height: 18),
                      const _Guidelines(),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _empty() => Padding(
        padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 24),
        child: Column(
          children: [
            const Icon(Icons.groups_outlined,
                color: AppColors.mute2, size: 40),
            const SizedBox(height: 8),
            Text('No communities yet',
                style: AppTypography.title, textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(
                'Enroll in a course to join its community for peers + mentor.',
                style: AppTypography.bodyMuted,
                textAlign: TextAlign.center),
          ],
        ),
      );
}

class _CommunityCard extends StatelessWidget {
  const _CommunityCard({required this.course, required this.featured});
  final Course course;
  final bool featured;

  Color get _accent {
    final v = int.tryParse(course.color.replaceAll('#', ''), radix: 16) ??
        0x6366F1;
    return Color(0xFF000000 | v);
  }

  String get _code {
    final name = course.name.trim();
    if (name.isEmpty) return '??';
    final parts = name.split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.length >= 2
        ? name.substring(0, 2).toUpperCase()
        : name.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final mentor = course.teacherName ?? 'Mentor';
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: () => context.go('/community/${course.id}'),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.line),
            boxShadow: featured ? AppShadows.md : AppShadows.sm,
          ),
          clipBehavior: Clip.hardEdge,
          child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 6,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_accent, _accent.withOpacity(0.72)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        gradient: LinearGradient(
                          colors: [_accent, _accent.withOpacity(0.78)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(_code,
                          style: AppTypography.title.copyWith(
                            color: AppColors.textInverse,
                            fontSize: 15,
                            letterSpacing: -0.4,
                          )),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(course.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.title
                                  .copyWith(fontSize: 14.5)),
                          const SizedBox(height: 3),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: AppColors.brandSoft,
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Text(
                                    (course.subject ?? 'TERM 1')
                                        .toUpperCase(),
                                    style: AppTypography.uppercase.copyWith(
                                      fontSize: 9.5,
                                      color: AppColors.brand,
                                      letterSpacing: 0.4,
                                    )),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                width: 3,
                                height: 3,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.mute2,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(mentor,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTypography.caption.copyWith(
                                      fontSize: 11,
                                      color: AppColors.muted,
                                    )),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: AppColors.brandSoft,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Open chat',
                              style: AppTypography.caption.copyWith(
                                color: AppColors.brand,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              )),
                          const SizedBox(width: 4),
                          const Icon(Icons.chevron_right,
                              color: AppColors.brand, size: 14),
                        ],
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
      ),
    );
  }
}

class _Guidelines extends StatelessWidget {
  const _Guidelines();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.amberSft,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.amberSft),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.info_outline,
                color: AppColors.amber, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Community guidelines',
                    style: AppTypography.title.copyWith(
                      color: const Color(0xFF7C3A04),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                    )),
                const SizedBox(height: 3),
                Text(
                  'Keep the conversation on-topic for the course. Be kind, cite your sources, and read pinned messages first.',
                  style: AppTypography.body.copyWith(
                    fontSize: 11.5,
                    color: const Color(0xFF92400E),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
