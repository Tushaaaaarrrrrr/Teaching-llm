import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/drive/secure_drive_player.dart';
import '../../shared/widgets/youtube/secure_youtube_player.dart';
import '../../shared/widgets/youtube/youtube_utils.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

/// GET /api/content/[id] → full lecture with topic + course nested. Replaces
/// the lighter fields the courses provider exposes — used by [LecturePage]
/// so we can show description, mentor, etc. without an extra round-trip.
final lectureProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, contentId) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/content/$contentId');
  return Map<String, dynamic>.from(res.data as Map);
});

/// GET /api/content/[id]/comments → tree-shaped per-lecture discussion thread
/// with replies nested inside each root comment. Used by the Discussion tab.
final lectureCommentsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>(
        (ref, contentId) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/content/$contentId/comments');
  final list = res.data is List ? res.data as List : const [];
  return [for (final j in list) Map<String, dynamic>.from(j as Map)];
});

/// Per-lecture detail page. Shows the embedded video player on top followed
/// by three tabs:
///   • About      — description + course/topic tags
///   • Discussion — per-lecture Comment thread (POSTs back to the same API)
///   • Notes      — lecture material PDFs (Content.pptUrl) opened via the
///                  in-app watermarked viewer
///
/// Replaces the previous fullscreen /watch route as the primary lecture
/// destination — the player still has its own fullscreen affordance for
/// landscape viewing.
class LecturePage extends ConsumerStatefulWidget {
  const LecturePage({super.key, required this.contentId});
  final String contentId;

  static LecturePage? fromQuery(Map<String, String> query) {
    final id = query['contentId'] ?? query['id'];
    if (id == null || id.isEmpty) return null;
    return LecturePage(contentId: id);
  }

  @override
  ConsumerState<LecturePage> createState() => _LecturePageState();
}

class _LecturePageState extends ConsumerState<LecturePage>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _tab.addListener(() {
      if (!_tab.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lectureAsync = ref.watch(lectureProvider(widget.contentId));
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;
    final body = lectureAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => _ErrorState(message: e.toString()),
      data: (lecture) => _Body(
        contentId: widget.contentId,
        lecture: lecture,
        tab: _tab,
      ),
    );
    return Scaffold(
      backgroundColor: isLandscape ? Colors.black : AppColors.bg,
      // Skip the SafeArea entirely in landscape — the player needs every
      // pixel and the status bar is hidden via SystemUiMode by the player
      // when it goes fullscreen anyway.
      body: isLandscape ? body : SafeArea(bottom: false, child: body),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({
    required this.contentId,
    required this.lecture,
    required this.tab,
  });
  final String contentId;
  final Map<String, dynamic> lecture;
  final TabController tab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final title = (lecture['title'] as String?) ?? 'Lecture';
    final desc = (lecture['description'] as String?) ?? '';
    final videoUrl = lecture['videoUrl'] as String?;
    final pptUrl = lecture['pptUrl'] as String?;
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;
    final rawSource = (lecture['videoSource'] as String?)?.toUpperCase();
    final isDrive = rawSource == 'GOOGLE_DRIVE' ||
        (rawSource == null &&
            (videoUrl ?? '').contains('drive.google.com'));
    final topic = (lecture['topic'] as Map<String, dynamic>?) ?? const {};
    final course = (topic['course'] as Map<String, dynamic>?) ?? const {};
    final courseName = (course['name'] as String?) ?? '';
    final topicTitle = (topic['title'] as String?) ?? '';
    final commentsAsync =
        ref.watch(lectureCommentsProvider(contentId));
    final commentCount = commentsAsync.valueOrNull
        ?.fold<int>(0, (n, c) => n + 1 + ((c['replies'] as List?)?.length ?? 0));

    // Landscape: drop the chrome and let the player consume the full
    // viewport. Portrait keeps the back bar + tabs.
    if (isLandscape) {
      return Container(
        color: Colors.black,
        child: SizedBox.expand(
          child: _Player(
            isDrive: isDrive,
            videoUrl: videoUrl,
            contentId: contentId,
            title: title,
          ),
        ),
      );
    }

    return Column(
      children: [
        // ── Header ────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 6, 12, 8),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () =>
                    context.canPop() ? context.pop() : context.go('/courses'),
              ),
              Expanded(
                child: Text(
                  courseName.isNotEmpty ? courseName : 'Lecture',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.title.copyWith(fontSize: 15),
                ),
              ),
            ],
          ),
        ),

        // ── Player ────────────────────────────────────
        AspectRatio(
          aspectRatio: 16 / 9,
          child: Container(
            color: Colors.black,
            child: _Player(
              isDrive: isDrive,
              videoUrl: videoUrl,
              contentId: contentId,
              title: title,
            ),
          ),
        ),

        // ── Metadata ──────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (courseName.isNotEmpty || topicTitle.isNotEmpty)
                Text(
                  [
                    if (courseName.isNotEmpty) courseName.toUpperCase(),
                    if (topicTitle.isNotEmpty) topicTitle.toUpperCase(),
                  ].join('  ·  '),
                  style: AppTypography.uppercase.copyWith(
                    color: AppColors.brand,
                    fontSize: 11,
                    letterSpacing: 0.6,
                  ),
                ),
              const SizedBox(height: 6),
              Text(
                title,
                style: AppTypography.h1.copyWith(fontSize: 22, height: 1.2),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // ── Tab bar ───────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.line),
            ),
            child: TabBar(
              controller: tab,
              labelColor: AppColors.textInverse,
              unselectedLabelColor: AppColors.muted,
              labelStyle: AppTypography.title.copyWith(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
              ),
              unselectedLabelStyle: AppTypography.title.copyWith(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
              labelPadding: EdgeInsets.zero,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: AppColors.brand,
                borderRadius: BorderRadius.circular(10),
              ),
              indicatorPadding: const EdgeInsets.all(4),
              splashBorderRadius: BorderRadius.circular(10),
              dividerColor: Colors.transparent,
              tabs: [
                const Tab(height: 40, text: 'About'),
                Tab(
                  height: 40,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Discussion'),
                      if (commentCount != null && commentCount > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: const Color(0x33FFFFFF),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '$commentCount',
                            style: AppTypography.caption.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const Tab(height: 40, text: 'Notes'),
              ],
            ),
          ),
        ),

        const SizedBox(height: 8),

        // ── Tab body ──────────────────────────────────
        Expanded(
          child: TabBarView(
            controller: tab,
            children: [
              _AboutTab(description: desc, lecture: lecture),
              _DiscussionTab(contentId: contentId),
              _NotesTab(pptUrl: pptUrl, lecture: lecture),
            ],
          ),
        ),
      ],
    );
  }
}

class _Player extends StatelessWidget {
  const _Player({
    required this.isDrive,
    required this.videoUrl,
    required this.contentId,
    required this.title,
  });
  final bool isDrive;
  final String? videoUrl;
  final String contentId;
  final String title;

  @override
  Widget build(BuildContext context) {
    if (videoUrl == null || videoUrl!.isEmpty) {
      return Center(
        child: Text('No video for this lecture',
            style: AppTypography.body.copyWith(color: const Color(0xCCFFFFFF))),
      );
    }
    if (isDrive) {
      return SecureDrivePlayer(
        contentId: contentId,
        title: title,
        autoplay: true,
      );
    }
    final ytId = YouTubeUtils.extractVideoId(videoUrl!);
    if (ytId == null) {
      return Center(
        child: Text('Invalid video URL',
            style: AppTypography.body.copyWith(color: const Color(0xCCFFFFFF))),
      );
    }
    return SecureYouTubePlayer(
      videoId: ytId,
      title: title,
      autoplay: true,
    );
  }
}

class _AboutTab extends StatelessWidget {
  const _AboutTab({required this.description, required this.lecture});
  final String description;
  final Map<String, dynamic> lecture;
  @override
  Widget build(BuildContext context) {
    final topic = (lecture['topic'] as Map<String, dynamic>?) ?? const {};
    final course = (topic['course'] as Map<String, dynamic>?) ?? const {};
    final tags = <String>[
      if ((course['name'] as String?)?.isNotEmpty ?? false) course['name'] as String,
      if ((topic['title'] as String?)?.isNotEmpty ?? false) topic['title'] as String,
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.line),
            boxShadow: AppShadows.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: AppColors.brandSoft,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.info_outline,
                        size: 16, color: AppColors.brand),
                  ),
                  const SizedBox(width: 8),
                  Text('About this lecture',
                      style: AppTypography.title.copyWith(fontSize: 14)),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                description.isNotEmpty
                    ? description
                    : 'No description provided for this lecture.',
                style: AppTypography.body.copyWith(
                  fontSize: 13.5,
                  height: 1.5,
                  color: AppColors.ink2,
                ),
              ),
              if (tags.isNotEmpty) ...[
                const SizedBox(height: 14),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final t in tags)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.brandSoft,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(t,
                            style: AppTypography.caption.copyWith(
                              fontSize: 10.5,
                              color: AppColors.brand,
                              fontWeight: FontWeight.w700,
                            )),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _DiscussionTab extends ConsumerStatefulWidget {
  const _DiscussionTab({required this.contentId});
  final String contentId;
  @override
  ConsumerState<_DiscussionTab> createState() => _DiscussionTabState();
}

class _DiscussionTabState extends ConsumerState<_DiscussionTab> {
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _post() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(
        '/api/content/${widget.contentId}/comments',
        body: {'content': body},
      );
      _controller.clear();
      ref.invalidate(lectureCommentsProvider(widget.contentId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Post failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(lectureCommentsProvider(widget.contentId));
    return Column(
      children: [
        Expanded(
          child: AppRefresh(
            onRefresh: () async =>
                ref.invalidate(lectureCommentsProvider(widget.contentId)),
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _ErrorState(message: e.toString()),
              data: (list) {
                if (list.isEmpty) {
                  return ListView(
                    children: [
                      const SizedBox(height: 60),
                      Center(
                        child: Column(
                          children: [
                            const Icon(Icons.forum_outlined,
                                color: AppColors.mute2, size: 36),
                            const SizedBox(height: 10),
                            Text('No questions yet',
                                style: AppTypography.title),
                            const SizedBox(height: 4),
                            Text('Be the first to ask',
                                style: AppTypography.bodyMuted
                                    .copyWith(fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _CommentCard(comment: list[i]),
                );
              },
            ),
          ),
        ),
        _Composer(
          controller: _controller,
          sending: _sending,
          onSend: _post,
        ),
      ],
    );
  }
}

class _CommentCard extends StatelessWidget {
  const _CommentCard({required this.comment});
  final Map<String, dynamic> comment;

  String _initial(String? name) {
    if (name == null || name.isEmpty) return '?';
    return name.trim()[0].toUpperCase();
  }

  String _timeAgo(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final user = (comment['user'] as Map<String, dynamic>?) ?? const {};
    final name = (user['name'] as String?) ?? 'Student';
    final role = (user['role'] as String?) ?? 'STUDENT';
    final content = (comment['content'] as String?) ?? '';
    final createdAt = comment['createdAt'] as String?;
    final replies = (comment['replies'] as List?) ?? const [];
    final isManager = role == 'MANAGER' || role == 'ADMIN' || role == 'INSTRUCTOR';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
        boxShadow: AppShadows.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isManager ? AppColors.amberSft : AppColors.brandSoft,
                  shape: BoxShape.circle,
                ),
                child: Text(_initial(name),
                    style: AppTypography.title.copyWith(
                      fontSize: 12,
                      color: isManager ? AppColors.amber : AppColors.brand,
                      fontWeight: FontWeight.w800,
                    )),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.title.copyWith(fontSize: 13),
                      ),
                    ),
                    if (isManager) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppColors.amberSft,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('MENTOR',
                            style: AppTypography.uppercase.copyWith(
                              fontSize: 9,
                              color: AppColors.amber,
                              letterSpacing: 0.4,
                            )),
                      ),
                    ],
                  ],
                ),
              ),
              Text(_timeAgo(createdAt),
                  style: AppTypography.caption.copyWith(
                    fontSize: 10.5,
                    color: AppColors.muted,
                  )),
            ],
          ),
          const SizedBox(height: 8),
          Text(content,
              style: AppTypography.body.copyWith(fontSize: 13.5, height: 1.45)),
          if (replies.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.only(left: 12),
              decoration: const BoxDecoration(
                border: Border(
                  left: BorderSide(color: AppColors.brand, width: 2),
                ),
              ),
              child: Column(
                children: [
                  for (final r in replies)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _CommentCard(
                          comment: Map<String, dynamic>.from(r as Map)),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.onSend,
  });
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    // viewInsets.bottom is the keyboard; viewPadding.bottom is the system
    // gesture bar. Pad for whichever is larger so the composer always sits
    // above both, even on phones with a tall navigation bar.
    final bottomInset = media.viewInsets.bottom > 0
        ? media.viewInsets.bottom
        : media.viewPadding.bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(16, 10, 16, 10 + bottomInset),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: 'Ask a question…',
                hintStyle: AppTypography.bodyMuted.copyWith(fontSize: 13),
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 10),
                filled: true,
                fillColor: AppColors.bg,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: AppColors.brand,
            borderRadius: BorderRadius.circular(20),
            child: InkWell(
              onTap: sending ? null : onSend,
              borderRadius: BorderRadius.circular(20),
              child: SizedBox(
                width: 44,
                height: 44,
                child: sending
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.textInverse,
                        ),
                      )
                    : const Icon(Icons.send,
                        color: AppColors.textInverse, size: 18),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotesTab extends StatelessWidget {
  const _NotesTab({required this.pptUrl, required this.lecture});
  final String? pptUrl;
  final Map<String, dynamic> lecture;

  Future<void> _open(BuildContext context) async {
    if (pptUrl == null || pptUrl!.isEmpty) return;
    final id = lecture['id'] as String?;
    final title = (lecture['title'] as String?) ?? 'Lecture material';
    final isDrive = pptUrl!.contains('drive.google.com') ||
        pptUrl!.contains('docs.google.com');
    if (isDrive && id != null) {
      final uri = Uri(
        path: '/material',
        queryParameters: {'contentId': id, 'title': title},
      );
      context.push(uri.toString());
      return;
    }
    await launchUrl(Uri.parse(pptUrl!),
        mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final hasMaterial = pptUrl != null && pptUrl!.isNotEmpty;
    if (!hasMaterial) {
      return Padding(
        padding: const EdgeInsets.all(40),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.description_outlined,
                  color: AppColors.mute2, size: 36),
              const SizedBox(height: 10),
              Text('No notes yet',
                  style: AppTypography.title, textAlign: TextAlign.center),
              const SizedBox(height: 4),
              Text(
                "The instructor hasn't uploaded slides for this lecture.",
                style: AppTypography.bodyMuted.copyWith(fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }
    final title = (lecture['title'] as String?) ?? 'Lecture material';
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      children: [
        Material(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            onTap: () => _open(context),
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.line),
                boxShadow: AppShadows.sm,
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.redSft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.picture_as_pdf,
                        color: AppColors.red, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.title.copyWith(fontSize: 13.5)),
                        const SizedBox(height: 2),
                        Text(
                          'Lecture slides · PDF',
                          style: AppTypography.bodyMuted
                              .copyWith(fontSize: 11.5),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: AppColors.mute2),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, color: AppColors.mute2, size: 40),
            const SizedBox(height: 10),
            Text("Couldn't load this lecture",
                style: AppTypography.title, textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(message,
                textAlign: TextAlign.center,
                style: AppTypography.bodyMuted.copyWith(fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
