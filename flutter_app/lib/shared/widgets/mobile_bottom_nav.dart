import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

/// Five-tab bottom nav with an elevated center button.
/// Home · Courses · Academics(FAB) · Support · More.
/// The Academics FAB floats above the bar so it reads as the primary
/// shortcut from anywhere in the app.
class MobileBottomNav extends StatelessWidget {
  const MobileBottomNav({super.key, required this.currentLocation});

  final String currentLocation;

  static const _left = <_TabSpec>[
    _TabSpec('Home', Icons.home_outlined, '/dashboard'),
    _TabSpec('Courses', Icons.menu_book_outlined, '/courses'),
  ];
  static const _right = <_TabSpec>[
    _TabSpec('Support', Icons.headset_mic_outlined, '/support'),
    _TabSpec('More', Icons.menu, '/more'),
  ];
  static const _center =
      _TabSpec('Academics', Icons.school_outlined, '/academics');

  bool _isActive(_TabSpec t) {
    if (t.path == '/dashboard') return currentLocation == '/dashboard';
    return currentLocation.startsWith(t.path);
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 108, // bar (66) + room for the more-elevated FAB above
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomCenter,
        children: [
          // The actual bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xF0FFFFFF),
                border: Border(top: BorderSide(color: AppColors.line)),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x0A141260),
                    offset: Offset(0, -6),
                    blurRadius: 18,
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: SizedBox(
                  height: 66,
                  child: Row(
                    children: [
                      for (final t in _left)
                        Expanded(
                          child: _NavItem(
                              spec: t, active: _isActive(t)),
                        ),
                      // Spacer for the FAB hole
                      const Expanded(child: SizedBox()),
                      for (final t in _right)
                        Expanded(
                          child: _NavItem(
                              spec: t, active: _isActive(t)),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // The elevated Academics center button — pushed up further so it
          // reads as an above-bar tab indicator rather than overlapping the
          // bar surface. Soft halo behind it to match the reference UI.
          Positioned(
            bottom: 40,
            child: _CenterFab(active: _isActive(_center)),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({required this.spec, required this.active});
  final _TabSpec spec;
  final bool active;
  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.brand : AppColors.mute2;
    return InkWell(
      onTap: () => context.go(spec.path),
      child: SizedBox(
        height: double.infinity,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(spec.icon, size: 22, color: color),
            const SizedBox(height: 4),
            Text(
              spec.label,
              style: AppTypography.caption.copyWith(
                fontSize: 10.5,
                color: color,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CenterFab extends StatelessWidget {
  const _CenterFab({required this.active});
  final bool active;
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Soft halo ring behind the FAB so it reads as floating above the
        // bar rather than punched through it. Sized larger than the button
        // and tinted to match the brand color.
        Container(
          width: 68,
          height: 68,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.brand.withOpacity(0.10),
          ),
          alignment: Alignment.center,
          child: Material(
            color: AppColors.brand,
            shape: const CircleBorder(),
            elevation: 10,
            shadowColor: AppColors.brand.withOpacity(0.55),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: () => context.go('/academics'),
              child: Container(
                width: 56,
                height: 56,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: AppShadows.pillGlow(AppColors.brand),
                ),
                child: const Icon(Icons.school_outlined,
                    color: AppColors.textInverse, size: 26),
              ),
            ),
          ),
        ),
        const SizedBox(height: 3),
        Text(
          'Academics',
          style: AppTypography.caption.copyWith(
            fontSize: 10.5,
            color: active ? AppColors.brand : AppColors.muted,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _TabSpec {
  const _TabSpec(this.label, this.icon, this.path);
  final String label;
  final IconData icon;
  final String path;
}
