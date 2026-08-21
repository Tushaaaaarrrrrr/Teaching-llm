import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/bouncy_pressable.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme_tokens.dart';
import '../../theme/app_typography.dart';

/// Clean, minimal, premium sign-in surface.
class LoginPage extends ConsumerWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final loading = auth.isLoading;
    final error = auth.error;
    final tokens = context.tokens;
    final isDark = context.isDark;

    final bgColor = tokens.bg;
    final textPrimary = tokens.textPrimary;
    final textSecondary = tokens.textSecondary;
    final borderColor = tokens.border;
    final btnBg = tokens.cardBg;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 24),

                        // 1. Brand Logo (Always at the top)
                        Center(
                          child: _BrandLogo(isDark: isDark),
                        ),

                        // Push welcome content toward vertical center
                        const Spacer(flex: 2),

                        // 2. Main Content: Welcome Back & Subtitle
                        Text(
                          'Welcome Back!',
                          textAlign: TextAlign.center,
                          style: AppTypography.h1.copyWith(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: textPrimary,
                            letterSpacing: -0.4,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'Log in or create a new account with Google',
                            textAlign: TextAlign.center,
                            style: AppTypography.body.copyWith(
                              fontSize: 13.5,
                              color: textSecondary,
                              height: 1.4,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),

                        // Error Banner (if any)
                        if (error != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0x33EF4444)
                                  : const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isDark
                                    ? const Color(0x66EF4444)
                                    : const Color(0xFFFCA5A5),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline,
                                    color: Color(0xFFDC2626), size: 18),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    error.toString(),
                                    style: AppTypography.body.copyWith(
                                      color: const Color(0xFFDC2626),
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 24),

                        // 3. Google Login Button
                        _GoogleLoginButton(
                          loading: loading,
                          backgroundColor: btnBg,
                          borderColor: borderColor,
                          textColor: textPrimary,
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            ref
                                .read(authStateProvider.notifier)
                                .signInWithGoogle();
                          },
                        ),

                        const Spacer(flex: 2),

                        // 4. Divider: ──────── or ────────
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 32),
                          child: Row(
                            children: [
                              Expanded(
                                child: Divider(
                                  color: borderColor,
                                  thickness: 1,
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                child: Text(
                                  'or',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Divider(
                                  color: borderColor,
                                  thickness: 1,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // 5. Explore Courses Action
                        Center(
                          child: BouncyPressable(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              context.go('/courses');
                            },
                            scaleDown: 0.96,
                            child: const Padding(
                              padding: EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 6),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Explore Courses',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.brand,
                                      fontFamily: 'Manrope',
                                    ),
                                  ),
                                  SizedBox(width: 6),
                                  Icon(
                                    Icons.arrow_forward_rounded,
                                    size: 16,
                                    color: AppColors.brand,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const Spacer(flex: 1),

                        // 6. Bottom Legal Section
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'By continuing, you agree to our',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: textSecondary,
                                  fontWeight: FontWeight.w400,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _LegalLink(
                                    label: 'Terms',
                                    onTap: () => context.push('/terms-and-conditions'),
                                  ),
                                  Text(
                                    ' · ',
                                    style: TextStyle(
                                      color: textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                  _LegalLink(
                                    label: 'Privacy',
                                    onTap: () => context.push('/privacy-policy'),
                                  ),
                                  Text(
                                    ' · ',
                                    style: TextStyle(
                                      color: textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                  _LegalLink(
                                    label: 'Refund',
                                    onTap: () => context.push('/refund-policy'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Logo component displayed directly on the background.
class _BrandLogo extends StatelessWidget {
  const _BrandLogo({required this.isDark});
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/mobile-login-logo.png',
      width: 140,
      height: 52,
      fit: BoxFit.contain,
      color: isDark ? Colors.white : null,
      colorBlendMode: isDark ? BlendMode.srcIn : null,
      errorBuilder: (context, error, stackTrace) {
        // High-fidelity fallback text logo
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Gen',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    letterSpacing: -0.5,
                    fontFamily: 'Manrope',
                  ),
                ),
                const Text(
                  'Z',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFFEF4444),
                    letterSpacing: -0.5,
                    fontFamily: 'Manrope',
                  ),
                ),
                Text(
                  '®',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 8, height: 1.5, color: const Color(0xFFEF4444)),
                const SizedBox(width: 6),
                Text(
                  'IITIAN',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 3.5,
                    color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF1E293B),
                    fontFamily: 'Manrope',
                  ),
                ),
                const SizedBox(width: 6),
                Container(width: 8, height: 1.5, color: const Color(0xFFEF4444)),
              ],
            ),
          ],
        );
      },
    );
  }
}

/// Normal, premium Google login authentication button.
/// 12px border radius, subtle border, no shadows or glows.
class _GoogleLoginButton extends StatelessWidget {
  const _GoogleLoginButton({
    required this.loading,
    required this.backgroundColor,
    required this.borderColor,
    required this.textColor,
    required this.onPressed,
  });

  final bool loading;
  final Color backgroundColor;
  final Color borderColor;
  final Color textColor;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return BouncyPressable(
      onTap: loading ? null : onPressed,
      scaleDown: 0.98,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor, width: 1),
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (loading)
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: textColor,
                ),
              )
            else
              const _GoogleGlyph(),
            const SizedBox(width: 12),
            Text(
              loading ? 'Signing in…' : 'Continue with Google',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w600,
                color: textColor,
                fontFamily: 'Manrope',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Google "G" 4-color brand glyph
class _GoogleGlyph extends StatelessWidget {
  const _GoogleGlyph();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 18,
      height: 18,
      child: CustomPaint(painter: _GooglePainter()),
    );
  }
}

class _GooglePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    final r = size.width / 2;
    final center = Offset(r, r);

    void arc(Color c, double startDeg, double sweepDeg) {
      paint.color = c;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: r),
        startDeg * 3.14159 / 180,
        sweepDeg * 3.14159 / 180,
        true,
        paint,
      );
    }

    arc(const Color(0xFFEA4335), 142, 110);
    arc(const Color(0xFFFBBC05), -142, 75);
    arc(const Color(0xFF34A853), -22, 90);
    arc(const Color(0xFF4285F4), 68, 70);

    paint.color = Colors.white;
    canvas.drawCircle(center, r * 0.55, paint);

    paint.color = const Color(0xFF4285F4);
    canvas.drawRect(
      Rect.fromLTWH(r, r - 1.4, r - 0.5, 2.8),
      paint,
    );
  }

  @override
  bool shouldRepaint(_) => false;
}

class _LegalLink extends StatelessWidget {
  const _LegalLink({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.brand,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }
}
