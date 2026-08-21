import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../theme/theme_mode_provider.dart';
import '../../shared/widgets/bouncy_pressable.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_theme_tokens.dart';
import 'notification_settings_page.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentThemeMode =
        ref.watch(themeModeProvider).valueOrNull ?? ThemeMode.system;

    final notifAsync = ref.watch(notificationPrefsProvider);
    final prefs = notifAsync.valueOrNull ??
        const NotificationPrefs(announcements: true, community: true);

    final tokens = context.tokens;
    final cardBg = tokens.cardBg;
    final borderColor = tokens.border;
    final textPrimary = tokens.textPrimary;
    final textSecondary = tokens.textSecondary;

    return Scaffold(
      backgroundColor: tokens.bg,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 60),
          children: [
            SubPageHeader(
              title: 'Settings',
              subtitle: 'Preferences & appearance',
              onBack: () =>
                  context.canPop() ? context.pop() : context.go('/more'),
            ),
            const SizedBox(height: 18),

            // ── 1. APPEARANCE (THEME) ──────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SectionHeader(title: 'APPEARANCE', color: textSecondary),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: borderColor),
                  boxShadow: AppShadows.sm,
                ),
                child: Row(
                  children: [
                    _ThemeTab(
                      label: 'System',
                      icon: Icons.brightness_auto_rounded,
                      isSelected: currentThemeMode == ThemeMode.system,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        ref
                            .read(themeModeProvider.notifier)
                            .set(ThemeMode.system);
                      },
                    ),
                    _ThemeTab(
                      label: 'Light',
                      icon: Icons.light_mode_rounded,
                      isSelected: currentThemeMode == ThemeMode.light,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        ref
                            .read(themeModeProvider.notifier)
                            .set(ThemeMode.light);
                      },
                    ),
                    _ThemeTab(
                      label: 'Dark',
                      icon: Icons.dark_mode_rounded,
                      isSelected: currentThemeMode == ThemeMode.dark,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        ref
                            .read(themeModeProvider.notifier)
                            .set(ThemeMode.dark);
                      },
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // ── 2. PUSH NOTIFICATIONS ──────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SectionHeader(
                  title: 'PUSH NOTIFICATIONS', color: textSecondary),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: borderColor),
                  boxShadow: AppShadows.sm,
                ),
                child: Column(
                  children: [
                    SwitchListTile(
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 4),
                      secondary: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: tokens.primaryAccent.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.campaign_outlined,
                            color: tokens.primaryAccent, size: 20),
                      ),
                      title: Text(
                        'Announcements & News',
                        style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                            color: textPrimary),
                      ),
                      subtitle: Text(
                        'Important notices from mentors and admins',
                        style: TextStyle(fontSize: 12, color: textSecondary),
                      ),
                      value: prefs.announcements,
                      activeColor: tokens.primaryAccent,
                      onChanged: (v) {
                        ref
                            .read(notificationPrefsProvider.notifier)
                            .setAnnouncements(v);
                      },
                    ),
                    Divider(
                      height: 1,
                      color: tokens.borderLight,
                    ),
                    SwitchListTile(
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 4),
                      secondary: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: tokens.success.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(Icons.forum_outlined,
                            color: tokens.success, size: 20),
                      ),
                      title: Text(
                        'Community Messages',
                        style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                            color: textPrimary),
                      ),
                      subtitle: Text(
                        'Course group discussions and threads',
                        style: TextStyle(fontSize: 12, color: textSecondary),
                      ),
                      value: prefs.community,
                      activeColor: tokens.success,
                      onChanged: (v) {
                        ref
                            .read(notificationPrefsProvider.notifier)
                            .setCommunity(v);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.color});
  final String title;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w800,
        letterSpacing: 1.2,
        color: color,
      ),
    );
  }
}

class _ThemeTab extends StatelessWidget {
  const _ThemeTab({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Expanded(
      child: BouncyPressable(
        onTap: onTap,
        scaleDown: 0.96,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? tokens.surfaceSecondary : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? tokens.primaryAccent : tokens.textMuted,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? tokens.primaryAccent : tokens.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
