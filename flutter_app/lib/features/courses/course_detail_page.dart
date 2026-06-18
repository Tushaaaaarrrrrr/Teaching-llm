import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

final courseDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<Map<String, dynamic>>('/api/courses/$id');
  return (res.data ?? {}) as Map<String, dynamic>;
});

final courseTopicsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/courses/$id/topics');
  final list = res.data is List ? res.data as List : <dynamic>[];
  return [for (final j in list) j as Map<String, dynamic>];
});

/// GET /api/lectures/progress?courseId=ID → [{contentId, status}].
/// status ∈ NOT_STARTED | IN_PROGRESS | COMPLETED (Prisma stores as String,
/// default NOT_STARTED). We count COMPLETED rows to drive the ring.
final courseProgressProvider =
    FutureProvider.family<Map<String, String>, String>((ref, courseId) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res =
        await api.get<dynamic>('/api/lectures/progress?courseId=$courseId');
    final list = res.data is List ? res.data as List : const [];
    final m = <String, String>{};
    for (final j in list) {
      final row = j as Map<String, dynamic>;
      final id = row['contentId'] as String?;
      final st = row['status'] as String?;
      if (id != null && st != null) m[id] = st;
    }
    return m;
  } catch (_) {
    return const {};
  }
});

/// Redesigned course detail screen — gradient hero (back chip + access banner
/// + mentor card), floating progress ring card, tab strip, expandable topic
/// blocks with completed / current / locked lecture states.
class CourseDetailPage extends ConsumerStatefulWidget {
  const CourseDetailPage({super.key, required this.courseId});
  final String courseId;

  @override
  ConsumerState<CourseDetailPage> createState() => _CourseDetailPageState();
}

class _CourseDetailPageState extends ConsumerState<CourseDetailPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 3, vsync: this);
  int _tab = 0;
  int? _openTopic = 0;

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Color _accentOf(Map<String, dynamic> course) {
    final hex = (course['color'] as String?) ?? '#4F46E5';
    final v = int.tryParse(hex.replaceAll('#', ''), radix: 16) ?? 0x4F46E5;
    return Color(0xFF000000 | v);
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(courseDetailProvider(widget.courseId));
    final topicsAsync = ref.watch(courseTopicsProvider(widget.courseId));
    final progressMap =
        ref.watch(courseProgressProvider(widget.courseId)).valueOrNull ??
            const <String, String>{};

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _Error(message: e.toString()),
        data: (raw) {
          final course =
              (raw['course'] as Map<String, dynamic>?) ?? raw;
          final accent = _accentOf(course);
          final count = (course['_count'] as Map<String, dynamic>?) ?? {};
          final topicsCount = (count['topics'] as int?) ?? 0;
          final lecturesCount = (count['lectures'] as int?) ?? 0;
          final materialsCount = (count['materials'] as int?) ?? 0;
          final completedCount =
              progressMap.values.where((s) => s == 'COMPLETED').length;

          return AppRefresh(
            onRefresh: () async {
              ref.invalidate(courseDetailProvider(widget.courseId));
              ref.invalidate(courseTopicsProvider(widget.courseId));
              ref.invalidate(courseProgressProvider(widget.courseId));
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.zero,
              children: [
                _Hero(
                  accent: accent,
                  course: course,
                  topicsCount: topicsCount,
                  lecturesCount: lecturesCount,
                  materialsCount: materialsCount,
                ),
                Transform.translate(
                  offset: const Offset(0, -18),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _ProgressCard(
                      accent: accent,
                      completed: completedCount,
                      total: lecturesCount,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                _TabStrip(
                  tabs: ['Curriculum · $topicsCount', 'Overview', 'Reviews'],
                  selected: _tab,
                  accent: accent,
                  onTap: (i) => setState(() => _tab = i),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                  child: IndexedStack(
                    index: _tab,
                    children: [
                      topicsAsync.when(
                        loading: () => const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child:
                              Center(child: CircularProgressIndicator()),
                        ),
                        error: (e, _) => Text('Failed to load topics: $e',
                            style: AppTypography.bodyMuted),
                        data: (topics) => Column(
                          children: [
                            for (var i = 0; i < topics.length; i++)
                              _TopicBlock(
                                index: i + 1,
                                topic: topics[i],
                                accent: accent,
                                progress: progressMap,
                                open: _openTopic == i,
                                onToggle: () => setState(() =>
                                    _openTopic = _openTopic == i ? null : i),
                              ),
                          ],
                        ),
                      ),
                      _OverviewTab(course: course, total: lecturesCount),
                      const _ReviewsEmpty(),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.accent,
    required this.course,
    required this.topicsCount,
    required this.lecturesCount,
    required this.materialsCount,
  });
  final Color accent;
  final Map<String, dynamic> course;
  final int topicsCount;
  final int lecturesCount;
  final int materialsCount;

  String _badge() {
    switch (course['enrollmentType'] as String?) {
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

  String _accessLine() {
    final exp = course['expiresAt'] as String?;
    if (exp == null) return 'Lifetime access';
    final dt = DateTime.tryParse(exp);
    if (dt == null) return 'Access ongoing';
    final days = dt.difference(DateTime.now()).inDays;
    if (days < 0) return 'Course access expired';
    if (days == 0) return 'Course access ends today';
    return 'Course access ends in $days days';
  }

  @override
  Widget build(BuildContext context) {
    final tag =
        '${_badge()}${course['subject'] != null ? ' · ${course['subject']}' : ''}';
    final title = (course['name'] as String?) ?? 'Course';
    final subtitle = (course['description'] as String?) ?? '';
    final mentor = (course['teacherName'] as String?) ?? 'Mentor';

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [accent, accent.withOpacity(0.78)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius:
            const BorderRadius.vertical(bottom: Radius.circular(24)),
      ),
      child: SafeArea(
        bottom: false,
        child: Stack(
          clipBehavior: Clip.hardEdge,
          children: [
            Positioned(
              right: -50,
              top: -50,
              child: Container(
                width: 200,
                height: 200,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0x12FFFFFF),
                ),
              ),
            ),
            Positioned(
              right: 60,
              bottom: -60,
              child: Container(
                width: 130,
                height: 130,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0x0FFFFFFF),
                ),
              ),
            ),
            Padding(
              padding:
                  const EdgeInsets.fromLTRB(20, 14, 20, 36),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      InkWell(
                        onTap: () => context.go('/courses'),
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              vertical: 4, horizontal: 2),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.chevron_left,
                                  color: AppColors.textInverse, size: 18),
                              const SizedBox(width: 4),
                              Text('Back to Courses',
                                  style: AppTypography.caption.copyWith(
                                    color: AppColors.textInverse,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  )),
                            ],
                          ),
                        ),
                      ),
                      const Spacer(),
                      // Bookmark removed — not wired to anything yet, was
                      // clutter; share remains as a useful primary action.
                      _CircleBtn(icon: Icons.ios_share_outlined),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0x33FFFFFF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(tag,
                        style: AppTypography.uppercase.copyWith(
                          color: AppColors.textInverse,
                          fontSize: 10,
                          letterSpacing: 1,
                        )),
                  ),
                  const SizedBox(height: 10),
                  Text(title,
                      style: AppTypography.heroHeading
                          .copyWith(fontSize: 28, letterSpacing: -0.5)),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.body.copyWith(
                          color: const Color(0xD9FFFFFF),
                          fontSize: 13,
                        )),
                  ],
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 14,
                    runSpacing: 8,
                    children: [
                      _MetaPill(
                          icon: Icons.layers_outlined,
                          text: '$topicsCount topics'),
                      _MetaPill(
                          icon: Icons.play_circle_outline,
                          text: '$lecturesCount lectures'),
                      _MetaPill(
                          icon: Icons.description_outlined,
                          text: '$materialsCount materials'),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _AccessBanner(text: _accessLine()),
                  const SizedBox(height: 12),
                  _MentorRow(accent: accent, mentor: mentor),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleBtn extends StatelessWidget {
  const _CircleBtn({required this.icon});
  final IconData icon;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Color(0x29FFFFFF),
      ),
      child: Icon(icon, color: AppColors.textInverse, size: 15),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: const Color(0xF2FFFFFF), size: 12),
        const SizedBox(width: 5),
        Text(text,
            style: AppTypography.caption.copyWith(
              color: const Color(0xF2FFFFFF),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            )),
      ],
    );
  }
}

class _AccessBanner extends StatelessWidget {
  const _AccessBanner({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: const Color(0x2EF59E0B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x59F5B440)),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.amber,
            ),
            child: const Icon(Icons.schedule,
                color: AppColors.textInverse, size: 14),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(text,
                    style: AppTypography.caption.copyWith(
                      fontSize: 12.5,
                      color: const Color(0xFFFFD9A0),
                      fontWeight: FontWeight.w700,
                    )),
                const SizedBox(height: 1),
                Text('Renew to keep your progress',
                    style: AppTypography.caption.copyWith(
                      color: const Color(0xD9FFFFFF),
                      fontSize: 11,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MentorRow extends StatelessWidget {
  const _MentorRow({required this.accent, required this.mentor});
  final Color accent;
  final String mentor;
  @override
  Widget build(BuildContext context) {
    final initial =
        mentor.trim().isNotEmpty ? mentor.trim()[0].toUpperCase() : '?';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0x1FFFFFFF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xE6FFFFFF),
            ),
            alignment: Alignment.center,
            child: Text(initial,
                style: AppTypography.title.copyWith(
                  color: AppColors.brandDk,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                )),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('YOUR MENTOR',
                    style: AppTypography.uppercase.copyWith(
                      color: const Color(0xCCFFFFFF),
                      fontSize: 10.5,
                      letterSpacing: 0.5,
                    )),
                const SizedBox(height: 1),
                Text(mentor,
                    style: AppTypography.title.copyWith(
                      color: AppColors.textInverse,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    )),
              ],
            ),
          ),
          // Message button removed — mentor messaging isn't wired yet, so
          // showing it would be misleading. Mentor name + role chip alone
          // is enough until the chat surface is built.
        ],
      ),
    );
  }
}

class _ProgressCard extends StatelessWidget {
  const _ProgressCard(
      {required this.accent, required this.completed, required this.total});
  final Color accent;
  final int completed;
  final int total;

  @override
  Widget build(BuildContext context) {
    final pct =
        total > 0 ? (completed * 100 / total).round() : 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
        boxShadow: AppShadows.lg,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 52,
            height: 52,
            child: CustomPaint(
              painter: _RingPainter(pct: pct, color: accent),
              child: Center(
                child: Text('$pct%',
                    style: AppTypography.title.copyWith(
                      fontSize: 12.5,
                      color: AppColors.ink,
                      fontWeight: FontWeight.w800,
                    )),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('YOUR PROGRESS',
                    style: AppTypography.uppercase.copyWith(
                      fontSize: 11,
                      letterSpacing: 0.3,
                    )),
                const SizedBox(height: 2),
                Text('$completed of $total lectures done',
                    style: AppTypography.title.copyWith(fontSize: 15)),
                const SizedBox(height: 1),
                Text(pct == 100
                    ? 'Course complete — well done!'
                    : 'Pick up from your last lecture',
                    style: AppTypography.bodyMuted.copyWith(fontSize: 11.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.pct, required this.color});
  final int pct;
  final Color color;
  @override
  void paint(Canvas canvas, Size size) {
    const sw = 5.0;
    final r = (size.width - sw) / 2;
    final center = Offset(size.width / 2, size.height / 2);
    final bg = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = sw
      ..color = AppColors.line;
    canvas.drawCircle(center, r, bg);
    final fg = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = sw
      ..strokeCap = StrokeCap.round
      ..color = color;
    final sweep = (pct / 100) * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: r),
      -math.pi / 2,
      sweep,
      false,
      fg,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) =>
      old.pct != pct || old.color != color;
}

class _TabStrip extends StatelessWidget {
  const _TabStrip({
    required this.tabs,
    required this.selected,
    required this.accent,
    required this.onTap,
  });
  final List<String> tabs;
  final int selected;
  final Color accent;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: AppColors.line)),
        ),
        child: Row(
          children: [
            for (var i = 0; i < tabs.length; i++)
              Padding(
                padding: const EdgeInsets.only(right: 22),
                child: InkWell(
                  onTap: () => onTap(i),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: selected == i
                              ? accent
                              : Colors.transparent,
                          width: 2.5,
                        ),
                      ),
                    ),
                    child: Text(tabs[i],
                        style: AppTypography.title.copyWith(
                          fontSize: 13.5,
                          color: selected == i
                              ? AppColors.ink
                              : AppColors.muted,
                          fontWeight: FontWeight.w700,
                        )),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TopicBlock extends StatelessWidget {
  const _TopicBlock({
    required this.index,
    required this.topic,
    required this.accent,
    required this.progress,
    required this.open,
    required this.onToggle,
  });
  final int index;
  final Map<String, dynamic> topic;
  final Color accent;
  final Map<String, String> progress;
  final bool open;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final contents = (topic['content'] as List?) ?? const [];
    final videoCount =
        contents.where((c) => (c as Map)['videoUrl'] != null).length;
    final doneCount = contents.where((c) {
      final m = c as Map;
      final id = m['id'] as String?;
      return id != null && progress[id] == 'COMPLETED';
    }).length;
    final title = (topic['title'] as String?) ?? 'Topic';
    final allDone = videoCount > 0 && doneCount == videoCount;
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
          boxShadow: AppShadows.sm,
        ),
        child: Column(
          children: [
            InkWell(
              onTap: onToggle,
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: allDone
                            ? AppColors.greenSft
                            : AppColors.bg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: allDone
                          ? const Icon(Icons.check,
                              color: AppColors.green, size: 16)
                          : Text(
                              index.toString().padLeft(2, '0'),
                              style: AppTypography.title.copyWith(
                                fontSize: 13,
                                color: AppColors.muted,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title,
                              style: AppTypography.title.copyWith(
                                fontSize: 14.5,
                                letterSpacing: -0.2,
                              )),
                          const SizedBox(height: 2),
                          Text(
                            videoCount == 0
                                ? '0 lectures'
                                : '$doneCount / $videoCount lectures',
                            style: AppTypography.bodyMuted
                                .copyWith(fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    AnimatedRotation(
                      turns: open ? 0.5 : 0,
                      duration: const Duration(milliseconds: 180),
                      child: const Icon(Icons.expand_more,
                          color: AppColors.muted, size: 18),
                    ),
                  ],
                ),
              ),
            ),
            if (open && contents.isNotEmpty)
              Container(
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: AppColors.line)),
                ),
                child: Column(
                  children: [
                    for (var i = 0; i < contents.length; i++)
                      _LectureRow(
                        num: i + 1,
                        content: contents[i] as Map<String, dynamic>,
                        accent: accent,
                        progress: progress,
                        last: i == contents.length - 1,
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

class _LectureRow extends StatelessWidget {
  const _LectureRow({
    required this.num,
    required this.content,
    required this.accent,
    required this.progress,
    required this.last,
  });
  final int num;
  final Map<String, dynamic> content;
  final Color accent;
  final Map<String, String> progress;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final title = (content['title'] as String?) ?? 'Lecture';
    final videoUrl = content['videoUrl'] as String?;
    final pptUrl = content['pptUrl'] as String?;
    final hasVideo = videoUrl != null && videoUrl.isNotEmpty;
    final hasMaterial = pptUrl != null && pptUrl.isNotEmpty;
    // Row is tappable if either resource is available — video first, then
    // material. A row with neither (locked / not-yet-released) stays inert.
    final disabled = !hasVideo && !hasMaterial;
    final id = content['id'] as String?;
    // Backend stores videoSource = 'GOOGLE_DRIVE' (default) | 'YOUTUBE'.
    // Some legacy rows don't have it set, so sniff from the URL as a
    // fallback: anything pointing at drive.google.com is Drive.
    final rawSource = (content['videoSource'] as String?)?.toUpperCase();
    final isDrive = rawSource == 'GOOGLE_DRIVE' ||
        (rawSource == null &&
            (videoUrl ?? '').contains('drive.google.com'));
    final state = id != null ? progress[id] : null;
    final done = state == 'COMPLETED';
    final inProgress = state == 'IN_PROGRESS';

    Color statusBg;
    Color statusFg;
    IconData statusIcon;
    if (done) {
      statusBg = AppColors.greenSft;
      statusFg = AppColors.green;
      statusIcon = Icons.check;
    } else if (inProgress) {
      statusBg = AppColors.brand;
      statusFg = AppColors.textInverse;
      statusIcon = Icons.play_arrow;
    } else if (!hasVideo) {
      statusBg = AppColors.line;
      statusFg = AppColors.muted;
      statusIcon =
          pptUrl != null ? Icons.description_outlined : Icons.lock_outline;
    } else {
      statusBg = AppColors.bg;
      statusFg = AppColors.muted;
      statusIcon = Icons.play_arrow;
    }

    void openVideo() {
      final uri = Uri(
        path: '/watch',
        queryParameters: isDrive
            ? {
                'source': 'drive',
                if (id != null) 'contentId': id,
                'title': title,
              }
            : {
                'source': 'youtube',
                'url': videoUrl,
                'title': title,
              },
      );
      context.push(uri.toString());
    }

    void openMaterial() {
      if (id == null) return;
      final uri = Uri(
        path: '/material',
        queryParameters: {'contentId': id, 'title': title},
      );
      context.push(uri.toString());
    }

    return InkWell(
      onTap: disabled
          ? null
          : (hasVideo ? openVideo : openMaterial),
      child: Container(
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: inProgress ? AppColors.brandSoft : Colors.transparent,
          border: Border(
            bottom: last
                ? BorderSide.none
                : const BorderSide(color: AppColors.line),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: statusBg,
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: Icon(statusIcon, color: statusFg, size: 14),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${num.toString().padLeft(2, '0')}. $title',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.body.copyWith(
                      fontSize: 13.5,
                      color: disabled ? AppColors.muted : AppColors.ink,
                      fontWeight: inProgress
                          ? FontWeight.w800
                          : FontWeight.w600,
                    ),
                  ),
                  if (!hasVideo && hasMaterial)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text('Tap to open material',
                          style: AppTypography.bodyMuted
                              .copyWith(fontSize: 10.5)),
                    ),
                ],
              ),
            ),
            if (hasVideo && hasMaterial)
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Material(
                  color: Colors.transparent,
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: openMaterial,
                    customBorder: const CircleBorder(),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.brandSft2,
                      ),
                      child: const Icon(Icons.description_outlined,
                          size: 16, color: AppColors.brand),
                    ),
                  ),
                ),
              ),
            if (hasVideo)
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: inProgress ? accent : Colors.transparent,
                  border: inProgress
                      ? null
                      : Border.all(
                          color: AppColors.brandSft2, width: 1.5),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  done
                      ? 'Rewatch'
                      : inProgress
                          ? 'Resume'
                          : 'Watch',
                  style: AppTypography.caption.copyWith(
                    fontSize: 11.5,
                    color:
                        inProgress ? AppColors.textInverse : accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({required this.course, required this.total});
  final Map<String, dynamic> course;
  final int total;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
          boxShadow: AppShadows.sm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('ABOUT THIS COURSE',
                style: AppTypography.uppercase
                    .copyWith(letterSpacing: 1.2)),
            const SizedBox(height: 8),
            Text(
              (course['description'] as String?) ??
                  'No description provided yet.',
              style: AppTypography.body
                  .copyWith(color: AppColors.ink2),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: [
                _Kv(k: 'Subject', v: course['subject'] as String? ?? '—'),
                _Kv(
                    k: 'Mentor',
                    v: course['teacherName'] as String? ?? '—'),
                _Kv(k: 'Lectures', v: '$total'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Kv extends StatelessWidget {
  const _Kv({required this.k, required this.v});
  final String k;
  final String v;
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(k.toUpperCase(),
            style: AppTypography.uppercase
                .copyWith(letterSpacing: 1.2)),
        const SizedBox(height: 2),
        Text(v, style: AppTypography.title.copyWith(fontSize: 13.5)),
      ],
    );
  }
}

class _ReviewsEmpty extends StatelessWidget {
  const _ReviewsEmpty();
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 24),
        child: Center(
            child: Text('No reviews yet.',
                style: AppTypography.bodyMuted)),
      );
}

class _Error extends StatelessWidget {
  const _Error({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Text('Failed to load: $message',
            style: AppTypography.bodyMuted, textAlign: TextAlign.center),
      );
}
