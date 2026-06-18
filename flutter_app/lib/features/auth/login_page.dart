import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

/// Dark-themed sign-in surface that mirrors the Capacitor app's
/// MobileLoginExperience after the 3-slide welcome carousel. Single primary
/// action: Continue with Google. Quick Login was tester-only — removed.
class LoginPage extends ConsumerWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final loading = auth.isLoading;
    final error = auth.error;

    return Scaffold(
      backgroundColor: const Color(0xFF0B1020),
      body: Stack(
        children: [
          // Soft decorative blobs to break up the dark background.
          Positioned(
            top: -80,
            left: -60,
            child: _Blob(color: AppColors.brand.withOpacity(0.45), size: 260),
          ),
          Positioned(
            bottom: -120,
            right: -100,
            child: _Blob(
                color: const Color(0xFF8B5CF6).withOpacity(0.35), size: 340),
          ),

          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(flex: 2),

                  // Brand mark
                  Center(
                    child: Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [AppColors.brand, AppColors.brandDk],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: AppShadows.pillGlow(AppColors.brand),
                      ),
                      child: const Icon(
                        Icons.school,
                        color: Colors.white,
                        size: 42,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  Text(
                    'Welcome Back',
                    textAlign: TextAlign.center,
                    style: AppTypography.h1.copyWith(
                      color: Colors.white,
                      fontSize: 26,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Sign in to access live classes, recordings, and your personalised study plan.',
                    textAlign: TextAlign.center,
                    style: AppTypography.body.copyWith(
                      color: const Color(0xCCFFFFFF),
                      fontSize: 13.5,
                      height: 1.5,
                    ),
                  ),

                  const Spacer(flex: 3),

                  if (error != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0x29EF4444),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0x55EF4444)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.error_outline,
                              color: Color(0xFFFCA5A5), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              error.toString(),
                              style: AppTypography.body.copyWith(
                                color: const Color(0xFFFCA5A5),
                                fontSize: 12.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Primary action: Google sign-in
                  _GoogleButton(
                    loading: loading,
                    onPressed: () => ref
                        .read(authStateProvider.notifier)
                        .signInWithGoogle(),
                  ),

                  if (loading) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Signing you in — first launch may take a few seconds while the server wakes up.',
                      style: AppTypography.caption.copyWith(
                        color: const Color(0x99FFFFFF),
                        fontSize: 11.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],

                  const Spacer(flex: 1),

                  Text(
                    'By continuing, you agree to our Terms · Privacy · Refund',
                    textAlign: TextAlign.center,
                    style: AppTypography.caption.copyWith(
                      color: const Color(0x99FFFFFF),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GoogleButton extends StatelessWidget {
  const _GoogleButton({required this.loading, required this.onPressed});
  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(50),
      elevation: 0,
      child: InkWell(
        onTap: loading ? null : onPressed,
        borderRadius: BorderRadius.circular(50),
        child: Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (loading)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: AppColors.ink,
                  ),
                )
              else
                const _GoogleGlyph(),
              const SizedBox(width: 12),
              Text(
                loading ? 'Signing in…' : 'Continue with Google',
                style: AppTypography.title.copyWith(
                  fontSize: 15,
                  color: AppColors.ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Inline SVG-equivalent of the Google "G" glyph, painted with custom widgets
/// so we don't pull in another asset / font for one icon.
class _GoogleGlyph extends StatelessWidget {
  const _GoogleGlyph();
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(painter: _GooglePainter()),
    );
  }
}

class _GooglePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // 4-color Google "G" — quick recreation, not pixel-perfect but recognisable.
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

    // Inner cut-out for the "G" shape — white hole.
    paint.color = Colors.white;
    canvas.drawCircle(center, r * 0.55, paint);

    // Crossbar of the G
    paint.color = const Color(0xFF4285F4);
    canvas.drawRect(
      Rect.fromLTWH(r, r - 1.5, r - 1, 3),
      paint,
    );
  }

  @override
  bool shouldRepaint(_) => false;
}

class _Blob extends StatelessWidget {
  const _Blob({required this.color, required this.size});
  final Color color;
  final double size;
  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color, color.withOpacity(0)],
            stops: const [0.0, 0.75],
          ),
        ),
      ),
    );
  }
}
