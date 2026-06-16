import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import '../courses/course_detail_page.dart' show courseDetailProvider;
import '../../shared/widgets/app_refresh.dart';

/// GET /api/community/[courseId]/messages → list of messages oldest→newest
/// (server returns reversed already). Each row:
/// { id, content, imageUrl?, createdAt, sender: { id, name, role } }
final communityMessagesProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, courseId) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/community/$courseId/messages');
  final list = res.data is List ? res.data as List : const [];
  return [for (final j in list) j as Map<String, dynamic>];
});

/// Community chat for a single course. Mirrors ScreenCommunityChat in
/// community.jsx — header chip with course code + member count, pinned
/// mentor banner placeholder, message bubbles with mentor highlighting,
/// composer at the bottom.
class CommunityChatPage extends ConsumerStatefulWidget {
  const CommunityChatPage({super.key, required this.courseId});
  final String courseId;
  @override
  ConsumerState<CommunityChatPage> createState() =>
      _CommunityChatPageState();
}

class _CommunityChatPageState extends ConsumerState<CommunityChatPage> {
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  bool _sending = false;

  @override
  void dispose() {
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _composer.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(
        '/api/community/${widget.courseId}/messages',
        body: {'content': text},
      );
      _composer.clear();
      ref.invalidate(communityMessagesProvider(widget.courseId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Send failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final courseAsync = ref.watch(courseDetailProvider(widget.courseId));
    final messagesAsync =
        ref.watch(communityMessagesProvider(widget.courseId));
    final me = ref.watch(authStateProvider).value;
    final myId = me?.id;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            _Header(courseAsync: courseAsync, courseId: widget.courseId),
            const _PinnedBanner(),
            Expanded(
              child: messagesAsync.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.cloud_off,
                            color: AppColors.mute2, size: 40),
                        const SizedBox(height: 8),
                        Text('Could not load chat',
                            style: AppTypography.title,
                            textAlign: TextAlign.center),
                        const SizedBox(height: 4),
                        Text(e.toString(),
                            style: AppTypography.bodyMuted,
                            textAlign: TextAlign.center),
                      ],
                    ),
                  ),
                ),
                data: (msgs) {
                  if (msgs.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.all(40),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.chat_bubble_outline,
                              color: AppColors.mute2, size: 40),
                          const SizedBox(height: 8),
                          Text('No messages yet',
                              style: AppTypography.title,
                              textAlign: TextAlign.center),
                          const SizedBox(height: 4),
                          Text("Be the first to say hi!",
                              style: AppTypography.bodyMuted,
                              textAlign: TextAlign.center),
                        ],
                      ),
                    );
                  }
                  return AppRefresh(
                    onRefresh: () async => ref.invalidate(
                        communityMessagesProvider(widget.courseId)),
                    child: ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                      itemCount: msgs.length + 1,
                      itemBuilder: (_, i) {
                        if (i == 0) return const _DayMark(label: 'TODAY');
                        final m = msgs[i - 1];
                        final prev =
                            i >= 2 ? msgs[i - 2] : null;
                        final sender =
                            (m['sender'] as Map<String, dynamic>?) ?? const {};
                        final senderId = sender['id'] as String?;
                        final isMine = senderId != null && senderId == myId;
                        final continuation = prev != null &&
                            ((prev['sender'] as Map?)?['id'] ?? '') ==
                                senderId;
                        return _Bubble(
                          message: m,
                          isMine: isMine,
                          continuation: continuation,
                        );
                      },
                    ),
                  );
                },
              ),
            ),
            _Composer(
              controller: _composer,
              onSend: _send,
              sending: _sending,
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.courseAsync, required this.courseId});
  final AsyncValue<Map<String, dynamic>> courseAsync;
  final String courseId;

  Color _accent(String? hex) {
    final v = int.tryParse(
            (hex ?? '#4F46E5').replaceAll('#', ''),
            radix: 16) ??
        0x4F46E5;
    return Color(0xFF000000 | v);
  }

  String _code(String name) {
    final t = name.trim();
    if (t.isEmpty) return '??';
    final parts = t.split(RegExp(r'\s+'));
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return t.length >= 2 ? t.substring(0, 2).toUpperCase() : t.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final raw = courseAsync.value ?? const {};
    final course = (raw['course'] as Map<String, dynamic>?) ?? raw;
    final name = (course['name'] as String?) ?? 'Community';
    final subject = course['subject'] as String? ?? 'Term 1';
    final accent = _accent(course['color'] as String?);
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.line)),
      ),
      child: Row(
        children: [
          InkWell(
            onTap: () => context.canPop()
                ? context.pop()
                : context.go('/community'),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.chevron_left,
                  color: AppColors.ink2, size: 16),
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: LinearGradient(
                colors: [accent, accent.withOpacity(0.78)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            alignment: Alignment.center,
            child: Text(_code(name),
                style: AppTypography.title.copyWith(
                  color: AppColors.textInverse,
                  fontSize: 13,
                )),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.title
                        .copyWith(fontSize: 14.5, letterSpacing: -0.2)),
                const SizedBox(height: 1),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: AppColors.brandSoft,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(subject.toUpperCase(),
                          style: AppTypography.uppercase.copyWith(
                            fontSize: 9,
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
                            color: AppColors.mute2)),
                    const SizedBox(width: 6),
                    Container(
                        width: 5,
                        height: 5,
                        decoration: const BoxDecoration(
                            shape: BoxShape.circle, color: AppColors.green)),
                    const SizedBox(width: 5),
                    Text('online · enrolled',
                        style: AppTypography.caption.copyWith(
                          fontSize: 10.5,
                          color: AppColors.muted,
                        )),
                  ],
                ),
              ],
            ),
          ),
          const Icon(Icons.more_horiz, color: AppColors.ink2, size: 18),
        ],
      ),
    );
  }
}

class _PinnedBanner extends StatelessWidget {
  const _PinnedBanner();
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.amberSft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFCD8A6)),
      ),
      child: Row(
        children: [
          const Icon(Icons.push_pin, color: AppColors.amber, size: 14),
          const SizedBox(width: 8),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Pinned by mentor: ',
                    style: AppTypography.body.copyWith(
                      color: const Color(0xFF92400E),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextSpan(
                    text: 'Welcome to the community — say hi 👋',
                    style: AppTypography.body.copyWith(
                      color: const Color(0xFF92400E),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Icon(Icons.chevron_right,
              color: Color(0xFF92400E), size: 12),
        ],
      ),
    );
  }
}

class _DayMark extends StatelessWidget {
  const _DayMark({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        children: [
          Expanded(child: Container(height: 1, color: AppColors.line)),
          const SizedBox(width: 10),
          Text(label,
              style: AppTypography.uppercase.copyWith(
                fontSize: 10,
                letterSpacing: 1,
              )),
          const SizedBox(width: 10),
          Expanded(child: Container(height: 1, color: AppColors.line)),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    required this.message,
    required this.isMine,
    required this.continuation,
  });
  final Map<String, dynamic> message;
  final bool isMine;
  final bool continuation;

  String _formatTime(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  static const _palette = [
    [Color(0xFFEC4899), Color(0xFFFCE7F3)], // pink
    [Color(0xFF0EA5E9), Color(0xFFE0F2FE)], // sky
    [Color(0xFF10B981), Color(0xFFD1FAE5)], // emerald
    [AppColors.brand, AppColors.brandSoft], // indigo
    [Color(0xFFF59E0B), Color(0xFFFEF4E2)], // amber
    [Color(0xFF8B5CF6), Color(0xFFEDE9FE)], // violet
  ];

  @override
  Widget build(BuildContext context) {
    final sender = (message['sender'] as Map<String, dynamic>?) ?? const {};
    final name = (sender['name'] as String?) ?? 'User';
    final role = sender['role'] as String?;
    final isMentor = role == 'MANAGER' || role == 'INSTRUCTOR';
    final content = (message['content'] as String?) ?? '';
    final time = _formatTime(message['createdAt'] as String?);

    // Deterministic colour from sender name.
    final paletteIdx = name.hashCode.abs() % _palette.length;
    final tone = isMentor ? AppColors.brand : _palette[paletteIdx][0];
    final toneBg =
        isMentor ? AppColors.brandSoft : _palette[paletteIdx][1];
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';

    return Padding(
      padding: EdgeInsets.only(bottom: continuation ? 4 : 14),
      child: Row(
        mainAxisAlignment:
            isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMine)
            SizedBox(
              width: 30,
              child: continuation
                  ? const SizedBox()
                  : Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: toneBg,
                      ),
                      alignment: Alignment.center,
                      child: Text(initial,
                          style: AppTypography.uppercase.copyWith(
                            color: tone,
                            fontSize: 11,
                            letterSpacing: 0,
                          )),
                    ),
            ),
          if (!isMine) const SizedBox(width: 8),
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.78,
              ),
              child: Column(
                crossAxisAlignment: isMine
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
                children: [
                  if (!isMine && !continuation)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4, left: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(name,
                              style: AppTypography.uppercase.copyWith(
                                color: tone,
                                fontSize: 11,
                                letterSpacing: 0,
                              )),
                          if (isMentor) ...[
                            const SizedBox(width: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: tone,
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text('MENTOR',
                                  style: AppTypography.uppercase.copyWith(
                                    color: AppColors.textInverse,
                                    fontSize: 8.5,
                                    letterSpacing: 0.4,
                                  )),
                            ),
                          ],
                        ],
                      ),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 13, vertical: 9),
                    decoration: BoxDecoration(
                      color: isMine ? AppColors.brand : AppColors.surface,
                      border: isMine
                          ? null
                          : Border.all(color: AppColors.line),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(14),
                        topRight: const Radius.circular(14),
                        bottomLeft: Radius.circular(isMine ? 14 : 4),
                        bottomRight: Radius.circular(isMine ? 4 : 14),
                      ),
                    ),
                    child: Text(content,
                        style: AppTypography.body.copyWith(
                          fontSize: 13,
                          color: isMine
                              ? AppColors.textInverse
                              : AppColors.ink,
                          height: 1.45,
                        )),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 3, left: 4, right: 4),
                    child: Text(time + (isMine ? ' · sent' : ''),
                        style: AppTypography.caption.copyWith(
                          fontSize: 9.5,
                          color: AppColors.muted,
                        )),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.onSend,
    required this.sending,
  });
  final TextEditingController controller;
  final VoidCallback onSend;
  final bool sending;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.add,
                color: AppColors.muted, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              constraints: const BoxConstraints(minHeight: 40),
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(20),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.center,
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Message community…',
                  border: InputBorder.none,
                  hintStyle: AppTypography.body.copyWith(
                    fontSize: 13,
                    color: AppColors.muted,
                  ),
                ),
                style: AppTypography.body.copyWith(fontSize: 13),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
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
                width: 40,
                height: 40,
                child: sending
                    ? const Padding(
                        padding: EdgeInsets.all(11),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.textInverse,
                        ),
                      )
                    : const Icon(Icons.send,
                        color: AppColors.textInverse, size: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
