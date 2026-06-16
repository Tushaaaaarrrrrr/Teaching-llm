import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// Section heading row: bold title, optional subtitle, optional right-aligned
/// "See all →" link. Mirrors SectionHead in screens.jsx.
class SectionHead extends StatelessWidget {
  const SectionHead({
    super.key,
    required this.title,
    this.subtitle,
    this.right,
    this.onRightTap,
    this.topPadding = 28,
  });

  final String title;
  final String? subtitle;
  final String? right;
  final VoidCallback? onRightTap;
  final double topPadding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: topPadding),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.h2),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!,
                      style: AppTypography.bodyMuted.copyWith(fontSize: 12)),
                ],
              ],
            ),
          ),
          if (right != null)
            InkWell(
              onTap: onRightTap,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                child: Row(
                  children: [
                    Text(right!,
                        style: AppTypography.caption.copyWith(
                          color: AppColors.brand,
                          fontWeight: FontWeight.w700,
                        )),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward,
                        size: 12, color: AppColors.brand),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
