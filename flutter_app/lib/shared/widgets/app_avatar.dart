import 'package:flutter/material.dart';
import '../../config/api_config.dart';

/// Reusable user avatar widget matching Capacitor / Web UserAvatar.tsx.
/// Always renders a profile photo (custom avatar or gender-based default photo)
/// instead of initial letters.
class AppAvatar extends StatelessWidget {
  const AppAvatar({
    super.key,
    this.avatarUrl,
    this.gender,
    this.size = 40,
    this.border,
    this.backgroundColor,
  });

  final String? avatarUrl;
  final String? gender;
  final double size;
  final BoxBorder? border;
  final Color? backgroundColor;

  /// Matches src/lib/avatar.ts getDefaultAvatar(gender)
  static String getDefaultAvatarAsset(String? gender) {
    final g = gender?.trim().toUpperCase();
    if (g == 'FEMALE') return 'assets/avatars/default-female.png';
    if (g == 'MALE') return 'assets/avatars/default-male.png';
    return 'assets/avatars/default-neutral.png';
  }

  @override
  Widget build(BuildContext context) {
    final fallbackAsset = getDefaultAvatarAsset(gender);
    final url = avatarUrl?.trim();

    Widget imageWidget;
    if (url != null && url.isNotEmpty) {
      if (url.startsWith('assets/')) {
        imageWidget = Image.asset(
          url,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Image.asset(
            fallbackAsset,
            width: size,
            height: size,
            fit: BoxFit.cover,
          ),
        );
      } else if (url.startsWith('/avatars/')) {
        final assetPath = 'assets$url';
        imageWidget = Image.asset(
          assetPath,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Image.asset(
            fallbackAsset,
            width: size,
            height: size,
            fit: BoxFit.cover,
          ),
        );
      } else {
        final fullUrl = (url.startsWith('http://') || url.startsWith('https://'))
            ? url
            : '${ApiConfig.baseUrl}$url';
        imageWidget = Image.network(
          fullUrl,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Image.asset(
            fallbackAsset,
            width: size,
            height: size,
            fit: BoxFit.cover,
          ),
        );
      }
    } else {
      imageWidget = Image.asset(
        fallbackAsset,
        width: size,
        height: size,
        fit: BoxFit.cover,
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: backgroundColor ?? const Color(0xFFE2E8F0),
        border: border,
      ),
      child: ClipOval(child: imageWidget),
    );
  }
}
