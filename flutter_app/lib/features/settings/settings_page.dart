import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
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

            const SizedBox(height: 28),

            // ── 3. DANGER ZONE (ACCOUNT DELETION) ──────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SectionHeader(
                  title: 'DANGER ZONE', color: tokens.danger),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: tokens.danger.withOpacity(0.25)),
                  boxShadow: AppShadows.sm,
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 6),
                  leading: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: tokens.danger.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.delete_forever_rounded,
                        color: tokens.danger, size: 22),
                  ),
                  title: Text(
                    'Delete Your Account',
                    style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                        color: tokens.danger),
                  ),
                  subtitle: Text(
                    'Permanently delete your account and access',
                    style: TextStyle(fontSize: 12, color: textSecondary),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded,
                      color: Colors.grey, size: 22),
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    showDialog<void>(
                      context: context,
                      builder: (ctx) => _DeleteAccountDialog(ref: ref),
                    );
                  },
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

class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog({required this.ref});
  final WidgetRef ref;

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  bool _agreed = false;
  bool _loading = false;

  Future<void> _submit() async {
    if (!_agreed || _loading) return;
    setState(() => _loading = true);

    try {
      final api = widget.ref.read(apiClientProvider);
      final res = await api.post(
        '/api/user/delete-request',
        body: {'agreedToTerms': true},
      );

      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop();

      final msg = res.data is Map && res.data['message'] is String
          ? res.data['message'] as String
          : 'Your account deletion request has been submitted. Deletion may take up to 24 hours to complete.';

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.info_outline, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(child: Text(msg)),
            ],
          ),
          backgroundColor: const Color(0xFF1E293B),
          duration: const Duration(seconds: 5),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Dialog(
      backgroundColor: tokens.cardBg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: tokens.danger.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(Icons.warning_amber_rounded,
                      color: tokens.danger, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Delete Your Account',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: tokens.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Permanent account removal request',
                        style: TextStyle(
                          fontSize: 12,
                          color: tokens.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            Text(
              'You are about to permanently delete your account from our platform.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: tokens.textPrimary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),

            // Terms Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: tokens.surfaceSecondary,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: tokens.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Please note:',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: tokens.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _bulletPoint('Any active subscriptions or course access will be closed.', tokens),
                  _bulletPoint('You will be removed from all teams, communities, and communication channels.', tokens),
                  _bulletPoint('No refund will be provided for any remaining subscription period or unused access.', tokens),
                  _bulletPoint('Account deletion may take up to 24 hours to complete.', tokens),
                ],
              ),
            ),
            const SizedBox(height: 14),

            Text(
              'We’re sorry to see you go. Please confirm that you understand these terms and wish to continue.',
              style: TextStyle(
                fontSize: 13,
                color: tokens.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),

            // Checkbox Container
            InkWell(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _agreed = !_agreed);
              },
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: _agreed ? tokens.danger.withOpacity(0.08) : tokens.surfaceSecondary,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: _agreed ? tokens.danger : tokens.border,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Checkbox(
                      value: _agreed,
                      activeColor: tokens.danger,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      onChanged: (v) => setState(() => _agreed = v ?? false),
                    ),
                    Expanded(
                      child: Text(
                        'I confirm that I understand these terms and wish to continue.',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: tokens.textPrimary,
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 22),

            // Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _loading ? null : () => Navigator.of(context, rootNavigator: true).pop(),
                  child: Text(
                    'Cancel',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: tokens.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton(
                  onPressed: (_agreed && !_loading) ? _submit : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: tokens.danger,
                    disabledBackgroundColor: tokens.border,
                    foregroundColor: Colors.white,
                    disabledForegroundColor: tokens.textMuted,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    elevation: _agreed ? 2 : 0,
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Delete Account',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _bulletPoint(String text, AppThemeTokens tokens) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: TextStyle(color: tokens.textSecondary, fontWeight: FontWeight.bold)),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12.5,
                color: tokens.textSecondary,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

