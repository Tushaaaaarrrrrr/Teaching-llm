import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/api_config.dart';
import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import 'theme_sheet.dart';

/// "More" tab — replaces the old Profile tab on the bottom nav. Hosts a
/// neumorphic 2-column grid of tiles for everything that doesn't deserve
/// its own bottom-nav slot, plus a link to the admin panel for users with
/// the right role.
class MorePage extends ConsumerWidget {
  const MorePage({super.key});

  String _greet() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    if (h < 21) return 'Good Evening';
    return 'Good Night';
  }

  Future<void> _openAdmin(BuildContext context) async {
    final url = '${ApiConfig.baseUrl}/login?next=/admin';
    final ok = await launchUrl(
      Uri.parse(url),
      mode: LaunchMode.externalApplication,
    );
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Couldn't open admin panel")),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final name = user?.name ?? 'Student';
    final role = user?.role ?? 'STUDENT';
    final isStaff = role == 'MANAGER' ||
        role == 'ADMIN' ||
        role == 'INSTRUCTOR' ||
        role == 'SUPER_ADMIN';

    final tiles = <_MoreTile>[
      _MoreTile(
        title: 'Profile',
        sub: 'Your account & enrolled courses',
        icon: Icons.person_outline,
        tone: AppColors.brand,
        soft: AppColors.brandSoft,
        onTap: () => context.push('/profile'),
      ),
      _MoreTile(
        title: 'Store',
        sub: 'Courses, notes & mentor calls',
        icon: Icons.shopping_bag_outlined,
        tone: AppColors.green,
        soft: AppColors.greenSft,
        onTap: () => context.push('/store'),
      ),
      _MoreTile(
        title: 'Transactions',
        sub: 'Purchases & upgrades',
        icon: Icons.receipt_long_outlined,
        tone: AppColors.amber,
        soft: AppColors.amberSft,
        onTap: () => context.push('/transactions'),
      ),
      _MoreTile(
        title: 'Notifications',
        sub: 'Updates from the LMS',
        icon: Icons.notifications_none_outlined,
        tone: AppColors.red,
        soft: AppColors.redSft,
        onTap: () => context.push('/notifications'),
      ),
      _MoreTile(
        title: 'Help & FAQ',
        sub: 'Common questions',
        icon: Icons.help_outline,
        tone: AppColors.brand,
        soft: AppColors.brandSoft,
        onTap: () => context.push('/faq'),
      ),
      _MoreTile(
        title: 'Push settings',
        sub: 'Announcements & community chats',
        icon: Icons.tune,
        tone: AppColors.brand,
        soft: AppColors.brandSft2,
        onTap: () => context.push('/settings/notifications'),
      ),
      _MoreTile(
        title: 'Appearance',
        sub: 'Light / Dark / System',
        icon: Icons.dark_mode_outlined,
        tone: AppColors.ink2,
        soft: AppColors.line,
        onTap: () => ThemeSheet.show(context),
      ),
      _MoreTile(
        title: 'Sign out',
        sub: 'End this session',
        icon: Icons.logout,
        tone: AppColors.red,
        soft: AppColors.redSft,
        onTap: () async {
          await ref.read(authStateProvider.notifier).signOut();
        },
      ),
    ];

    return ListView(
      padding: const EdgeInsets.only(bottom: 110),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        _Greeting(name: name, greeting: _greet()),
        const SizedBox(height: 22),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: tiles.length,
            gridDelegate:
                const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 14,
              crossAxisSpacing: 14,
              childAspectRatio: 1.45,
            ),
            itemBuilder: (_, i) => _NeuTile(spec: tiles[i]),
          ),
        ),
        if (isStaff) ...[
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _AdminLink(onTap: () => _openAdmin(context), role: role),
          ),
        ],
        const SizedBox(height: 26),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text('IMPORTANT PAGES',
              style: AppTypography.uppercase
                  .copyWith(letterSpacing: 1.4)),
        ),
        const SizedBox(height: 10),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: _LinkList(items: [
            _Link(
              label: 'About Us',
              icon: Icons.info_outline,
              tone: AppColors.brand,
              soft: AppColors.brandSoft,
              url: '/about',
            ),
            _Link(
              label: 'Privacy Policy',
              icon: Icons.shield_outlined,
              tone: AppColors.green,
              soft: AppColors.greenSft,
              url: '/privacy',
            ),
            _Link(
              label: 'Terms & Conditions',
              icon: Icons.description_outlined,
              tone: AppColors.amber,
              soft: AppColors.amberSft,
              url: '/terms',
            ),
            _Link(
              label: 'Refund Policy',
              icon: Icons.replay_outlined,
              tone: AppColors.red,
              soft: AppColors.redSft,
              url: '/refund',
            ),
          ]),
        ),
        const SizedBox(height: 22),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text('CONNECT WITH US',
              style: AppTypography.uppercase
                  .copyWith(letterSpacing: 1.4)),
        ),
        const SizedBox(height: 10),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: _LinkList(items: const [
            _Link(
              label: 'Instagram',
              icon: Icons.camera_alt_outlined,
              tone: Color(0xFFE1306C),
              soft: Color(0xFFFEECF1),
              url: 'https://www.instagram.com/genz_iitian/',
              external: true,
            ),
            _Link(
              label: 'YouTube',
              icon: Icons.play_circle_outline,
              tone: Color(0xFFFF0000),
              soft: Color(0xFFFEECEC),
              url: 'https://www.youtube.com/@Gen-ZIITian/videos',
              external: true,
            ),
            _Link(
              label: 'LinkedIn',
              icon: Icons.business_center_outlined,
              tone: Color(0xFF0A66C2),
              soft: Color(0xFFE7EEF8),
              url: 'https://www.linkedin.com/company/genz-iitian',
              external: true,
            ),
            _Link(
              label: 'Telegram',
              icon: Icons.send,
              tone: Color(0xFF229ED9),
              soft: Color(0xFFE5F4FB),
              url: 'https://t.me/IIT_madras_Resources',
              external: true,
            ),
          ]),
        ),
        const SizedBox(height: 26),
        Center(
          child: Text('Gen-Z IITian · v0.1.0',
              style: AppTypography.caption.copyWith(fontSize: 10.5)),
        ),
      ],
    );
  }
}

class _Link {
  const _Link({
    required this.label,
    required this.icon,
    required this.tone,
    required this.soft,
    required this.url,
    this.external = false,
  });
  final String label;
  final IconData icon;
  final Color tone;
  final Color soft;
  final String url;
  final bool external;
}

class _LinkList extends StatelessWidget {
  const _LinkList({required this.items});
  final List<_Link> items;

  Future<void> _open(BuildContext context, _Link item) async {
    // Relative paths route in-app via go_router so legal pages render the
    // bundled content with no network call; absolute URLs open externally.
    if (item.url.startsWith('/')) {
      context.push(item.url);
      return;
    }
    final ok = await launchUrl(
      Uri.parse(item.url),
      mode: LaunchMode.externalApplication,
    );
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Couldn't open ${item.label}")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++)
            _LinkRow(
              item: items[i],
              last: i == items.length - 1,
              onTap: () => _open(context, items[i]),
            ),
        ],
      ),
    );
  }
}

class _LinkRow extends StatelessWidget {
  const _LinkRow({
    required this.item,
    required this.last,
    required this.onTap,
  });
  final _Link item;
  final bool last;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
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
                color: item.soft,
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: Icon(item.icon, color: item.tone, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(item.label,
                  style: AppTypography.title.copyWith(fontSize: 13.5)),
            ),
            Icon(
              item.external ? Icons.open_in_new : Icons.chevron_right,
              color: AppColors.mute2,
              size: item.external ? 14 : 16,
            ),
          ],
        ),
      ),
    );
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.name, required this.greeting});
  final String name;
  final String greeting;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.line),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.person,
                color: AppColors.muted, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(
                  TextSpan(
                    style: AppTypography.h2.copyWith(fontSize: 17),
                    children: [
                      TextSpan(text: '$greeting, '),
                      TextSpan(
                          text: name,
                          style: AppTypography.h2.copyWith(
                            fontSize: 17,
                            color: AppColors.brand,
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 2),
                Text("You've done well today. Get some good rest.",
                    style: AppTypography.bodyMuted.copyWith(fontSize: 12)),
              ],
            ),
          ),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.surface,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.line),
            ),
            child: const Icon(Icons.notifications_none_outlined,
                color: AppColors.ink2, size: 18),
          ),
        ],
      ),
    );
  }
}

class _MoreTile {
  const _MoreTile({
    required this.title,
    required this.sub,
    required this.icon,
    required this.tone,
    required this.soft,
    required this.onTap,
  });
  final String title;
  final String sub;
  final IconData icon;
  final Color tone;
  final Color soft;
  final VoidCallback onTap;
}

/// Neumorphic tile — soft drop shadow + tiny inner highlight to match the
/// pillowy look in the 2nd reference screenshot.
class _NeuTile extends StatelessWidget {
  const _NeuTile({required this.spec});
  final _MoreTile spec;
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: spec.onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Color(0x14000000),
                offset: Offset(6, 6),
                blurRadius: 14,
              ),
              BoxShadow(
                color: Color(0xCCFFFFFF),
                offset: Offset(-6, -6),
                blurRadius: 14,
              ),
            ],
            border: Border.all(color: const Color(0xFFE9EBF2)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: spec.soft,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Icon(spec.icon, color: spec.tone, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(spec.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.title
                            .copyWith(fontSize: 13.5)),
                    const SizedBox(height: 3),
                    Text(spec.sub,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bodyMuted
                            .copyWith(fontSize: 10.5, height: 1.35)),
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

class _AdminLink extends StatelessWidget {
  const _AdminLink({required this.onTap, required this.role});
  final VoidCallback onTap;
  final String role;
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.brand, Color(0xFF7C3AED)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0x29FFFFFF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.admin_panel_settings_outlined,
                  color: AppColors.textInverse, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Open admin panel',
                      style: AppTypography.title.copyWith(
                        color: AppColors.textInverse,
                        fontSize: 14,
                      )),
                  const SizedBox(height: 2),
                  Text('You\'re signed in as $role',
                      style: AppTypography.body.copyWith(
                        color: const Color(0xD9FFFFFF),
                        fontSize: 11.5,
                      )),
                ],
              ),
            ),
            const Icon(Icons.open_in_new,
                color: AppColors.textInverse, size: 16),
          ],
        ),
      ),
    );
  }
}
