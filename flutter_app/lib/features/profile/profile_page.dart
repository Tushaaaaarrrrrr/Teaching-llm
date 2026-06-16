import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

/// GET /api/auth/me — returns { user: {...} } with the full profile.
final profileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<Map<String, dynamic>>('/api/auth/me');
  return (res.data?['user'] as Map<String, dynamic>?) ?? const {};
});

/// Profile screen — gradient hero with XP bar, stats strip, streak heatmap,
/// achievements, and grouped settings menus. Mirrors profile.jsx from the
/// design canvas. Reachable as the 4th bottom-nav tab at /profile.
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        surfaceTintColor: AppColors.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: AppColors.ink),
          onPressed: () => context.canPop()
              ? context.pop()
              : context.go('/more'),
        ),
        title: Text('Profile',
            style: AppTypography.h2.copyWith(fontSize: 18)),
        centerTitle: false,
      ),
      body: AppRefresh(
        onRefresh: () async => ref.invalidate(profileProvider),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _Error(message: e.toString()),
          data: (u) {
            final enrollments = (u['enrollments'] as List?) ?? const [];
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                _HeroCard(user: u, enrollmentsCount: enrollments.length),
                const SizedBox(height: 24),
                _SectionTitle(
                    title: 'Enrolled courses',
                    subtitle: enrollments.isEmpty
                        ? 'None yet'
                        : '${enrollments.length} active'),
                const SizedBox(height: 10),
                if (enrollments.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Text(
                        "You're not enrolled in any course yet — visit the Store to browse.",
                        style: AppTypography.bodyMuted),
                  )
                else
                  Column(
                    children: [
                      for (final e in enrollments)
                        _EnrollmentTile(
                          data: e as Map<String, dynamic>,
                          onTap: () {
                            final id =
                                ((e['course'] as Map?)?['id']) as String?;
                            if (id != null) context.go('/courses/$id');
                          },
                        ),
                    ],
                  ),
                const SizedBox(height: 22),
                _SectionTitle(title: 'Account'),
                const SizedBox(height: 10),
                _MenuGroup(items: [
                  _MenuItem(
                    icon: Icons.person_outline,
                    label: 'Personal information',
                    sub: u['email'] as String? ?? 'Name, email, phone',
                  ),
                  _MenuItem(
                    icon: Icons.shopping_bag_outlined,
                    label: 'Store',
                    sub: 'Courses, notes & mentor calls',
                    onTap: () => context.push('/store'),
                  ),
                  _MenuItem(
                    icon: Icons.receipt_long_outlined,
                    label: 'Transactions',
                    sub: 'Purchases, upgrades & bills',
                    onTap: () => context.push('/transactions'),
                  ),
                  _MenuItem(
                    icon: Icons.notifications_none_outlined,
                    label: 'Notifications',
                    sub: 'Push & email preferences',
                    onTap: () => context.push('/notifications'),
                  ),
                  _MenuItem(
                    icon: Icons.shield_outlined,
                    label: 'Privacy & security',
                  ),
                ]),
                const SizedBox(height: 22),
                _SectionTitle(title: 'Support'),
                const SizedBox(height: 10),
                _MenuGroup(items: [
                  _MenuItem(
                    icon: Icons.help_outline,
                    label: 'Help center · FAQ',
                    onTap: () => context.push('/faq'),
                  ),
                  _MenuItem(
                      icon: Icons.chat_outlined,
                      label: 'Contact support',
                      onTap: () => context.go('/support')),
                  _MenuItem(
                      icon: Icons.star_outline,
                      label: 'Rate the app',
                      onTap: () => ScaffoldMessenger.of(context)
                          .showSnackBar(const SnackBar(
                              content: Text(
                                  'Rate-the-app link will open the Play Store once the app is published.')))),
                ]),
                const SizedBox(height: 22),
                _SignOutTile(
                  onTap: () async {
                    await ref.read(authStateProvider.notifier).signOut();
                  },
                ),
                const SizedBox(height: 22),
                Center(
                  child: Text('Gen-Z IITian · v0.1.0',
                      style: AppTypography.caption.copyWith(fontSize: 10.5)),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _EnrollmentTile extends StatelessWidget {
  const _EnrollmentTile({required this.data, required this.onTap});
  final Map<String, dynamic> data;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final course = (data['course'] as Map?) ?? const {};
    final name = (course['name'] as String?) ?? 'Course';
    final subject = course['subject'] as String?;
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
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
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.brandSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Text(initial,
                      style: AppTypography.title.copyWith(
                        color: AppColors.brand,
                        fontSize: 14,
                      )),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.title.copyWith(fontSize: 13.5)),
                      if (subject != null) ...[
                        const SizedBox(height: 2),
                        Text(subject,
                            style: AppTypography.bodyMuted
                                .copyWith(fontSize: 11.5)),
                      ],
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    color: AppColors.mute2, size: 14),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// _HeaderBar removed — replaced by the Scaffold's real AppBar so the page
// now has a proper Material ancestor (kills the yellow text-underline
// debug indicator that appears when DefaultTextStyle isn't inherited).

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.user, required this.enrollmentsCount});
  final Map<String, dynamic> user;
  final int enrollmentsCount;
  @override
  Widget build(BuildContext context) {
    final name = (user['name'] as String?) ?? 'Student';
    final email = (user['email'] as String?) ?? '';
    final role = (user['role'] as String?) ?? 'STUDENT';
    final avatar = user['avatar'] as String?;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [AppColors.brand, Color(0xFF7C3AED)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: AppShadows.lg,
      ),
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          Positioned(
            right: -50,
            top: -50,
            child: Container(
              width: 180,
              height: 180,
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
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(22),
                      color: const Color(0xEBFFFFFF),
                      border: Border.all(
                          color: const Color(0x59FFFFFF), width: 3),
                      image: (avatar != null && avatar.isNotEmpty)
                          ? DecorationImage(
                              image: NetworkImage(avatar), fit: BoxFit.cover)
                          : null,
                    ),
                    alignment: Alignment.center,
                    child: (avatar == null || avatar.isEmpty)
                        ? Text(
                            name.isNotEmpty
                                ? name[0].toUpperCase()
                                : 'S',
                            style: AppTypography.title.copyWith(
                              color: AppColors.brandDk,
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.heroHeading.copyWith(
                              fontSize: 19,
                              letterSpacing: -0.3,
                            )),
                        const SizedBox(height: 2),
                        Text(email,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.body.copyWith(
                              fontSize: 12,
                              color: const Color(0xD9FFFFFF),
                            )),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          children: [
                            _Pill(label: role.toUpperCase()),
                            if (enrollmentsCount > 0)
                              _Pill(
                                label:
                                    '$enrollmentsCount ${enrollmentsCount == 1 ? 'COURSE' : 'COURSES'}',
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0x33FFFFFF),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label,
          style: AppTypography.uppercase.copyWith(
            color: AppColors.textInverse,
            fontSize: 10,
            letterSpacing: 0.4,
          )),
    );
  }
}

// _StatsRow / _Stat / _StatDivider removed — they showed fake XP / streak /
// class-rank numbers. Real account stats now live on the hero card pills and
// the "Enrolled courses" section below it.

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.subtitle, this.right});
  final String title;
  final String? subtitle;
  final String? right;
  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.h2.copyWith(fontSize: 16)),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(subtitle!,
                    style:
                        AppTypography.bodyMuted.copyWith(fontSize: 11.5)),
              ],
            ],
          ),
        ),
        if (right != null)
          Text(right!,
              style: AppTypography.caption.copyWith(
                color: AppColors.brand,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              )),
      ],
    );
  }
}

// _StreakHeatmap, _AchievementStrip, _Ach, _AchCard removed — they were
// rendering fake gamification (seeded heatmap + hardcoded achievements). No
// backend signal exists for these yet, so showing them would mislead users.

class _MenuItem {
  const _MenuItem(
      {required this.icon, required this.label, this.sub, this.onTap});
  final IconData icon;
  final String label;
  final String? sub;
  final VoidCallback? onTap;
}

class _MenuGroup extends StatelessWidget {
  const _MenuGroup({required this.items});
  final List<_MenuItem> items;
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
            _MenuRow(item: items[i], last: i == items.length - 1),
        ],
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({required this.item, required this.last});
  final _MenuItem item;
  final bool last;
  @override
  Widget build(BuildContext context) {
    // Wrapped in Material because the parent _MenuGroup is a Container, not
    // a Material — without this, InkWell throws "No Material widget found"
    // (which is the red error the user saw on the Account section).
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.onTap,
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
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: AppColors.brandSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: Icon(item.icon, color: AppColors.brand, size: 16),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.label,
                      style: AppTypography.title
                          .copyWith(fontSize: 13.5, color: AppColors.ink)),
                  if (item.sub != null) ...[
                    const SizedBox(height: 1),
                    Text(item.sub!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bodyMuted.copyWith(fontSize: 11)),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right,
                color: AppColors.mute2, size: 14),
          ],
        ),
      ),
      ),
    );
  }
}

class _SignOutTile extends StatelessWidget {
  const _SignOutTile({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    // Same Material wrap as _MenuRow — without it InkWell hits
    // "No Material widget found" when this tile is mounted under a plain
    // Container/ListView.
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
      onTap: onTap,
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
                color: AppColors.redSft,
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.logout,
                  color: AppColors.red, size: 16),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text('Sign out',
                  style: AppTypography.title.copyWith(
                    fontSize: 13.5,
                    color: AppColors.red,
                    fontWeight: FontWeight.w700,
                  )),
            ),
          ],
        ),
      ),
      ),
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        const Icon(Icons.cloud_off, color: AppColors.mute2, size: 40),
        const SizedBox(height: 8),
        Text('Could not load profile',
            style: AppTypography.title, textAlign: TextAlign.center),
        const SizedBox(height: 4),
        Text(message,
            style: AppTypography.bodyMuted, textAlign: TextAlign.center),
      ],
    );
  }
}
