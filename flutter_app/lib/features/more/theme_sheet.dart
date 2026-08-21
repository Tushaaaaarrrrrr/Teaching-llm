import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import '../../theme/theme_mode_provider.dart';

/// Bottom sheet with the three theme options (System / Light / Dark) as a
/// radio list. Persists the choice via [themeModeProvider] which writes to
/// SharedPreferences.
class ThemeSheet extends ConsumerWidget {
  const ThemeSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ThemeSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current =
        ref.watch(themeModeProvider).valueOrNull ?? ThemeMode.system;
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.line,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text('Appearance',
              style: AppTypography.h2.copyWith(fontSize: 17)),
          const SizedBox(height: 4),
          Text(
            'Choose how the app looks. "System" follows your phone\'s setting.',
            style: AppTypography.bodyMuted.copyWith(fontSize: 12.5),
          ),
          const SizedBox(height: 14),
          _ThemeOption(
            label: 'System default',
            sub: 'Match the device theme',
            icon: Icons.brightness_auto,
            value: ThemeMode.system,
            current: current,
            onTap: () => _pick(ref, ThemeMode.system, context),
          ),
          const SizedBox(height: 8),
          _ThemeOption(
            label: 'Light',
            sub: 'Always use the light theme',
            icon: Icons.light_mode,
            value: ThemeMode.light,
            current: current,
            onTap: () => _pick(ref, ThemeMode.light, context),
          ),
          const SizedBox(height: 8),
          _ThemeOption(
            label: 'Dark',
            sub: 'Always use the dark theme',
            icon: Icons.dark_mode,
            value: ThemeMode.dark,
            current: current,
            onTap: () => _pick(ref, ThemeMode.dark, context),
          ),
        ],
      ),
    );
  }

  void _pick(WidgetRef ref, ThemeMode m, BuildContext context) {
    ref.read(themeModeProvider.notifier).set(m);
    Navigator.of(context).pop();
  }
}

class _ThemeOption extends StatelessWidget {
  const _ThemeOption({
    required this.label,
    required this.sub,
    required this.icon,
    required this.value,
    required this.current,
    required this.onTap,
  });
  final String label;
  final String sub;
  final IconData icon;
  final ThemeMode value;
  final ThemeMode current;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selected = value == current;
    return Material(
      color: selected
          ? AppColors.brandSoft
          : Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? AppColors.brand : AppColors.line,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.brand
                      : AppColors.brandSoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon,
                    color: selected
                        ? AppColors.textInverse
                        : AppColors.brand,
                    size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: AppTypography.title
                            .copyWith(fontSize: 13.5)),
                    const SizedBox(height: 2),
                    Text(sub,
                        style: AppTypography.bodyMuted
                            .copyWith(fontSize: 11.5)),
                  ],
                ),
              ),
              if (selected)
                const Icon(Icons.check_circle,
                    color: AppColors.brand, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
