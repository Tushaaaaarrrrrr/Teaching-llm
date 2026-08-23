import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../core/router/app_router.dart';

/// Fullscreen launch splash overlay that matches Capacitor's SplashOverlay.tsx.
/// Plays once per app launch session:
///  - Brand logo + smooth red progress bar ("LOADING...")
///  - Smooth fade-out reveal of the underlying app
class SplashOverlay extends ConsumerStatefulWidget {
  const SplashOverlay({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<SplashOverlay> createState() => _SplashOverlayState();
}

class _SplashOverlayState extends ConsumerState<SplashOverlay>
    with SingleTickerProviderStateMixin {
  static bool _hasShownThisSession = false;

  bool _loaderVisible = true;
  bool _promoVisible = false;
  String _promoImage = '/splash-screen.png';
  int _promoDurationMs = 2500;
  double _progress = 0.0;
  AnimationController? _progressController;
  GoRouter? _router;
  final Set<String> _checkedPages = {};

  @override
  void initState() {
    super.initState();
    if (_hasShownThisSession) {
      _loaderVisible = false;
      return;
    }

    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..addListener(() {
        setState(() {
          _progress = _progressController?.value ?? 0.0;
        });
      });

    _startSplashSequence();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final router = GoRouter.maybeOf(context) ?? ref.read(routerProvider);
    if (!identical(_router, router)) {
      _router?.routerDelegate.removeListener(_handleRouteChange);
      _router = router;
      _router?.routerDelegate.addListener(_handleRouteChange);
    }
    if (!_loaderVisible) _handleRouteChange();
  }

  Future<void> _startSplashSequence() async {
    _progressController?.forward();

    // Keep the branded loading state visible long enough to avoid a flash.
    await Future<void>.delayed(const Duration(milliseconds: 1500));
    if (!mounted || !_loaderVisible) return;
    _dismissLoader();
    _handleRouteChange();
  }

  void _handleRouteChange() {
    if (!mounted || _loaderVisible || _promoVisible || _router == null) return;
    final page = _router!.routerDelegate.currentConfiguration.uri.path;
    if (page.isEmpty || _checkedPages.contains(page)) return;
    _checkedPages.add(page);
    _claimPromo(page);
  }

  Future<void> _claimPromo(String page) async {
    try {
      final response = await ref
          .read(apiClientProvider)
          .post<dynamic>('/api/promo-splash/claim', body: {'page': page});
      final data = response.data;
      if (data is! Map || data['eligible'] != true || !mounted) return;
      _promoImage = data['image']?.toString() ?? '/splash-screen.png';
      final duration = int.tryParse(data['durationMs']?.toString() ?? '');
      _promoDurationMs = (duration ?? 2500).clamp(1000, 10000);
      setState(() => _promoVisible = true);
      await Future<void>.delayed(Duration(milliseconds: _promoDurationMs));
      if (mounted) setState(() => _promoVisible = false);
    } catch (_) {
      // A failed claim must never block navigation.
    }
  }

  void _dismissLoader() {
    if (!_loaderVisible) return;
    _hasShownThisSession = true;
    setState(() {
      _loaderVisible = false;
    });
  }

  @override
  void dispose() {
    _router?.routerDelegate.removeListener(_handleRouteChange);
    _progressController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final overlayVisible = _loaderVisible || _promoVisible;
    if (!overlayVisible) {
      return widget.child;
    }

    return Stack(
      children: [
        widget.child,
        AnimatedOpacity(
          opacity: overlayVisible ? 1.0 : 0.0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
          child: IgnorePointer(
            ignoring: !overlayVisible,
            child: Material(
              color: Colors.white,
              child: SizedBox.expand(
                child: SafeArea(
                  child: _promoVisible ? _buildPromoSplash() : _buildLogoAndProgress(),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLogoAndProgress() {
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

  Widget _buildPromoSplash() {
    final isBundledDefault = _promoImage == '/splash-screen.png' ||
        _promoImage == 'assets/splash-screen.png';
    return SizedBox.expand(
      child: isBundledDefault
          ? Image.asset('assets/splash-screen.png', fit: BoxFit.contain)
          : Image.network(
              _promoImage,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
            ),
    );
  }
}
