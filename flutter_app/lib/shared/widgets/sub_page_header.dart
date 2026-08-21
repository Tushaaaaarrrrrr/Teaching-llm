import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme_tokens.dart';

/// Header used on sub-pages (Calendar, Live, Free Resources,
/// Community, etc.) — back chip + title + optional subtitle + right slot + divider.
class SubPageHeader extends StatelessWidget {
  const SubPageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.right,
    this.onBack,
    this.showBack = true,
    this.showLine = true,
  });

  final String title;
  final String? subtitle;
  final Widget? right;
  final VoidCallback? onBack;
  final bool showBack;
  final bool showLine;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (showBack) ...[
                InkWell(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    if (onBack != null) {
                      onBack!();
                    } else if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/academics');
                    }
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: tokens.surfaceSecondary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: tokens.border),
                    ),
                    child: Icon(
                      Icons.chevron_left,
                      size: 20,
                      color: tokens.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: tokens.textPrimary,
                        letterSpacing: -0.3,
                        height: 1.15,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                          color: tokens.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (right != null) right!,
            ],
          ),
          if (showLine) ...[
            const SizedBox(height: 12),
            Divider(color: tokens.divider, thickness: 1.2, height: 1),
          ],
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
    this.color,
    this.onTap,
  });
  final IconData icon;
  final Color? color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final iconColor = color ?? tokens.textPrimary;

    return InkResponse(
      onTap: onTap,
      radius: 20,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: tokens.surfaceSecondary,
          shape: BoxShape.circle,
          border: Border.all(color: tokens.border),
        ),
        child: Icon(icon, size: 18, color: iconColor),
      ),
    );
  }
}
