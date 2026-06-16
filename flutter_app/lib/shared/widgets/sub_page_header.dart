import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// Header used on the academics sub-pages (Calendar, Live, Free Resources,
/// Community). Mirrors SubPageHeader in screens.jsx — back chip + title +
/// optional subtitle + right-side action slot.
class SubPageHeader extends StatelessWidget {
  const SubPageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.right,
    this.onBack,
  });

  final String title;
  final String? subtitle;
  final Widget? right;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: Row(
        children: [
          InkWell(
            onTap: onBack ??
                () => context.canPop()
                    ? context.pop()
                    : context.go('/academics'),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line),
              ),
              child: const Icon(Icons.chevron_left,
                  size: 18, color: AppColors.ink2),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style:
                        AppTypography.h1.copyWith(fontSize: 20, height: 1.15)),
                if (subtitle != null) ...[
                  const SizedBox(height: 1),
                  Text(subtitle!,
                      style: AppTypography.bodyMuted.copyWith(fontSize: 11.5)),
                ],
              ],
            ),
          ),
          if (right != null) right!,
        ],
      ),
    );
  }
}

/// Circle icon button matching CircleIcon in screens.jsx.
class CircleIconBtn extends StatelessWidget {
  const CircleIconBtn({
    super.key,
    required this.icon,
    this.color = AppColors.ink2,
    this.onTap,
  });
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) {
    return InkResponse(
      onTap: onTap,
      radius: 22,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.line),
        ),
        child: Icon(icon, size: 14, color: color),
      ),
    );
  }
}
