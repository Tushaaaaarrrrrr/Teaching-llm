import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Fullscreen launch splash overlay that matches Capacitor's SplashOverlay.tsx.
/// Plays once per app launch session:
///  - Stage 1: Brand logo + smooth red progress bar ("LOADING...")
///  - Stage 2: Full-screen mascot splash illustration with "Skip >" pill button
///  - Smooth fade-out reveal of the underlying app
class SplashOverlay extends StatefulWidget {
  const SplashOverlay({super.key, required this.child});

  final Widget child;

  @override
  State<SplashOverlay> createState() => _SplashOverlayState();
}

class _SplashOverlayState extends State<SplashOverlay>
    with SingleTickerProviderStateMixin {
  static bool _hasShownThisSession = false;

  bool _visible = true;
  int _step = 1; // 1 = Logo + Progress, 2 = Mascot Image
  double _progress = 0.0;
  late AnimationController _progressController;

  @override
  void initState() {
    super.initState();
    if (_hasShownThisSession) {
      _visible = false;
      return;
    }

    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..addListener(() {
        setState(() {
          _progress = _progressController.value;
        });
      });

    _startSplashSequence();
  }

  Future<void> _startSplashSequence() async {
    _progressController.forward();

    // Step 1: Wait for progress bar to finish (~900ms)
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted || !_visible) return;

    // Step 2: Show Mascot Image
    setState(() {
      _step = 2;
    });

    // Auto-dismiss after 800ms of mascot display
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (!mounted || !_visible) return;

    _dismiss();
  }

  void _dismiss() {
    if (!_visible) return;
    _hasShownThisSession = true;
    setState(() {
      _visible = false;
    });
  }

  @override
  void dispose() {
    if (!_hasShownThisSession && _visible) {
      _progressController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_hasShownThisSession && !_visible) {
      return widget.child;
    }

    return Stack(
      children: [
        widget.child,
        AnimatedOpacity(
          opacity: _visible ? 1.0 : 0.0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
          onEnd: () {
            if (!_visible) {
              setState(() {
                _hasShownThisSession = true;
              });
            }
          },
          child: IgnorePointer(
            ignoring: !_visible,
            child: Material(
              color: Colors.white,
              child: SizedBox.expand(
                child: SafeArea(
                  child: _step == 1
                      ? _buildStep1LogoAndProgress()
                      : _buildStep2MascotImage(),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep1LogoAndProgress() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // GenZ IITIAN Logo
          Image.asset(
            'assets/mobile-login-logo.png',
            width: 170,
            height: 65,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              return const Text(
                'GenZ® IITIAN',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              );
            },
          ),
          const SizedBox(height: 36),

          // Loading Bar Container
          Container(
            width: 240,
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(999),
            ),
            alignment: Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: _progress.clamp(0.0, 1.0),
              child: Container(
                height: 6,
                decoration: BoxDecoration(
                  color: const Color(0xFFDC2626), // GenZ Red brand color
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),

          const Text(
            'LOADING...',
            style: TextStyle(
              fontSize: 12,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2MascotImage() {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Mascot Image Full Screen
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            child: Image.asset(
              'assets/splash-screen.png',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return _buildStep1LogoAndProgress();
              },
            ),
          ),
        ),

        // Skip Button in Top-Right Corner
        Positioned(
          top: 16,
          right: 20,
          child: GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              _dismiss();
            },
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xBF0F172A),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0x26FFFFFF),
                      width: 1,
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Skip',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 16,
                        color: Colors.white,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
