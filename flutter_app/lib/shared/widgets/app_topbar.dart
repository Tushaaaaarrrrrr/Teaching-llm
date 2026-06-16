import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// /api/unread → { community: bool, support: bool, announcements: bool }.
/// We sum the boolean flags into a single badge dot — the server returns
/// boolean unread per channel, not counts.
final unreadProvider = FutureProvider<int>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<Map<String, dynamic>>('/api/unread');
    final data = res.data ?? const <String, dynamic>{};
    var n = 0;
    if (data['community'] == true) n++;
    if (data['support'] == true) n++;
    if (data['announcements'] == true) n++;
    return n;
  } catch (_) {
    return 0;
  }
});

/// Top-of-screen header used on bottom-nav pages. Real-data bound:
///   - avatar initial + greeting → /api/auth/me via authStateProvider
///   - notif badge → /api/unread via unreadProvider
class AppTopBar extends ConsumerWidget {
  const AppTopBar({
    super.key,
    required this.name,
    this.eyebrow = 'WELCOME TO GENZ IITIAN',
    this.onTapBell,
  });

  final String name;
  final String eyebrow;
  final VoidCallback? onTapBell;

  String _initial(String s) {
    final t = s.trim();
    return t.isEmpty ? 'S' : t[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final letter = _initial(name);
    final notif = ref.watch(unreadProvider).valueOrNull ?? 0;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.brand, AppColors.brandDk],
              ),
            ),
            alignment: Alignment.center,
            child: Text(letter,
                style: AppTypography.title.copyWith(
                  color: AppColors.textInverse,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                )),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(eyebrow,
                    style: AppTypography.uppercase.copyWith(
                      fontSize: 10,
                      letterSpacing: 1.2,
                      color: AppColors.muted,
                    )),
                const SizedBox(height: 1),
                Text(name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.h2.copyWith(fontSize: 18)),
              ],
            ),
          ),
          _IconBtn(
            icon: Icons.notifications_none_outlined,
            badge: notif,
            onTap: onTapBell ?? () => context.go('/notifications'),
          ),
        ],
      ),
    );
  }
}

class _IconBtn extends StatelessWidget {
  const _IconBtn({required this.icon, required this.badge, this.onTap});
  final IconData icon;
  final int badge;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkResponse(
      onTap: onTap,
      radius: 24,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.line),
            ),
            child: Icon(icon, size: 18, color: AppColors.ink2),
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
                  border: Border.all(color: AppColors.bg, width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
