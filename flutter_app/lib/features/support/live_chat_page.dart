import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// GET /api/support/live-chats/[id]/messages.
final liveChatMessagesProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((ref, chatId) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/support/live-chats/$chatId/messages');
  final list = res.data is List ? res.data as List : const [];
  return [for (final j in list) j as Map<String, dynamic>];
});

/// Either renders an existing live-support chat (when [chatId] is given) or
/// starts a fresh one via POST /api/support/live-chats. The flow:
///   1. User taps "Start Live Chat" in support_page.dart.
///   2. We push this page with `chatId: null`.
///   3. initState POSTs to /api/support/live-chats → returns the new chat
///      id; we save it and start polling /messages.
///   4. User types and sends; agent (manager) replies on the admin web; we
///      pick up new messages on the next poll.
class LiveChatPage extends ConsumerStatefulWidget {
  const LiveChatPage({super.key, this.chatId, this.initialMessage});
  final String? chatId;
  final String? initialMessage;
  @override
  ConsumerState<LiveChatPage> createState() => _LiveChatPageState();
}

class _LiveChatPageState extends ConsumerState<LiveChatPage> {
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  Timer? _poll;
  String? _chatId;
  String? _status; // WAITING | ACTIVE | CLOSED
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _chatId = widget.chatId;
    if (_chatId == null) {
      _startSession();
    } else {
      _startPolling();
    }
  }

  Future<void> _startSession() async {
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post<Map<String, dynamic>>(
        '/api/support/live-chats',
        body: {
          if (widget.initialMessage != null) 'initialMessage': widget.initialMessage,
        },
      );
      final data = res.data ?? const <String, dynamic>{};
      final id = data['id'] as String?;
      if (id == null) {
        setState(() => _error = 'Could not start chat — empty server response');
        return;
      }
      setState(() {
        _chatId = id;
        _status = data['status'] as String?;
      });
      _startPolling();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _startPolling() {
    _poll?.cancel();
    _poll = Timer.periodic(const Duration(seconds: 4), (_) {
      if (_chatId != null) {
        ref.invalidate(liveChatMessagesProvider(_chatId!));
      }
    });
  }

  Future<void> _send() async {
    final text = _composer.text.trim();
    if (text.isEmpty || _sending || _chatId == null) return;
    setState(() => _sending = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(
        '/api/support/live-chats/$_chatId/messages',
        body: {'content': text},
      );
      _composer.clear();
      ref.invalidate(liveChatMessagesProvider(_chatId!));
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
  void dispose() {
    _poll?.cancel();
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final myId = ref.watch(authStateProvider).value?.id;
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            _Header(status: _status),
            Expanded(
              child: _chatId == null
                  ? _Bootstrap(error: _error, onRetry: () {
                      setState(() => _error = null);
                      _startSession();
                    })
                  : _Thread(
                      chatId: _chatId!,
                      myId: myId,
                      controller: _scroll,
                    ),
            ),
            _Composer(
              controller: _composer,
              sending: _sending,
              onSend: _send,
              disabled: _chatId == null,
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.status});
  final String? status;
  @override
  Widget build(BuildContext context) {
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
                : context.go('/support'),
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
              color: AppColors.brand,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.support_agent,
                color: AppColors.textInverse, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Live Support',
                    style: AppTypography.title.copyWith(fontSize: 14.5)),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: status == 'ACTIVE'
                            ? AppColors.green
                            : (status == 'CLOSED'
                                ? AppColors.muted
                                : AppColors.amber),
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                        status == 'ACTIVE'
                            ? 'Agent connected'
                            : status == 'CLOSED'
                                ? 'Chat closed'
                                : 'Waiting for an agent…',
                        style: AppTypography.caption.copyWith(
                          color: AppColors.muted,
                          fontSize: 11,
                        )),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Bootstrap extends StatelessWidget {
  const _Bootstrap({required this.error, required this.onRetry});
  final String? error;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) {
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off,
                  color: AppColors.mute2, size: 40),
              const SizedBox(height: 8),
              Text("Couldn't start the chat",
                  style: AppTypography.title,
                  textAlign: TextAlign.center),
              const SizedBox(height: 4),
              Text(error!,
                  style: AppTypography.bodyMuted,
                  textAlign: TextAlign.center),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: onRetry,
                child: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }
    return const Center(child: CircularProgressIndicator());
  }
}

class _Thread extends ConsumerWidget {
  const _Thread({
    required this.chatId,
    required this.myId,
    required this.controller,
  });
  final String chatId;
  final String? myId;
  final ScrollController controller;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(liveChatMessagesProvider(chatId));
    return AppRefresh(
      onRefresh: () async => ref.invalidate(liveChatMessagesProvider(chatId)),
      child: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (msgs) {
          if (msgs.isEmpty) {
            return ListView(
              padding: const EdgeInsets.all(32),
              children: [
                const Icon(Icons.chat_bubble_outline,
                    color: AppColors.mute2, size: 40),
                const SizedBox(height: 8),
                Text('Send your first message',
                    style: AppTypography.title,
                    textAlign: TextAlign.center),
                const SizedBox(height: 4),
                Text(
                    "Describe what's wrong. An agent will join the chat shortly.",
                    style: AppTypography.bodyMuted,
                    textAlign: TextAlign.center),
              ],
            );
          }
          return ListView.builder(
            controller: controller,
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            itemCount: msgs.length,
            itemBuilder: (_, i) {
              final m = msgs[i];
              final sender =
                  (m['sender'] as Map<String, dynamic>?) ?? const {};
              final isMine = sender['id'] == myId;
              return _Bubble(message: m, isMine: isMine);
            },
          );
        },
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.isMine});
  final Map<String, dynamic> message;
  final bool isMine;
  @override
  Widget build(BuildContext context) {
    final sender = (message['sender'] as Map<String, dynamic>?) ?? const {};
    final name = (sender['name'] as String?) ?? 'User';
    final role = sender['role'] as String?;
    final isAgent = role == 'MANAGER' || role == 'ADMIN';
    final content = (message['content'] as String?) ?? '';
    final iso = message['createdAt'] as String?;
    final dt = iso != null ? DateTime.tryParse(iso)?.toLocal() : null;
    final time = dt == null
        ? ''
        : '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment:
            isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.78,
            ),
            child: Column(
              crossAxisAlignment: isMine
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                if (!isMine)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 3, left: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(name,
                            style: AppTypography.uppercase.copyWith(
                              color: AppColors.brand,
                              fontSize: 10.5,
                              letterSpacing: 0,
                            )),
                        if (isAgent) ...[
                          const SizedBox(width: 5),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.brand,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('AGENT',
                                style: AppTypography.uppercase.copyWith(
                                  color: AppColors.textInverse,
                                  fontSize: 8,
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
                        color: isMine
                            ? AppColors.textInverse
                            : AppColors.ink,
                        fontSize: 13,
                        height: 1.45,
                      )),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 3, left: 4, right: 4),
                  child: Text(time,
                      style: AppTypography.caption
                          .copyWith(fontSize: 9.5)),
                ),
              ],
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
    required this.sending,
    required this.onSend,
    required this.disabled,
  });
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final bool disabled;
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
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(20),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                enabled: !disabled,
                decoration: InputDecoration(
                  hintText: disabled
                      ? 'Connecting…'
                      : 'Type your message…',
                  border: InputBorder.none,
                  hintStyle: AppTypography.body
                      .copyWith(color: AppColors.muted, fontSize: 13),
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
              onTap: (sending || disabled) ? null : onSend,
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
