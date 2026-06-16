import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

/// Hard-coded fallback slides shown when the manager hasn't added any via
/// `/admin/home-slides` yet. Images ship as bundled Flutter assets so they
/// always load — no dependency on the API host. The moment the manager
/// publishes their own slides the fallback disappears.
final List<Map<String, dynamic>> _defaultSlides = [
  {
    'asset': 'assets/slides/qualifier-session.png',
    'alt': 'May 2026 Term — 15 Minute Session',
    'href': 'https://www.youtube.com/@Gen-ZIITian/videos',
  },
  {
    'asset': 'assets/slides/level-up.png',
    'alt': 'Level Up · Study Smart — use code GENZ50',
    'href': 'https://genziitian.in/courses',
  },
  {
    'asset': 'assets/slides/join-community.png',
    'alt': 'Stay Ahead · Stay Inspired — Gen-Z IITian Newsletter',
    'href': 'https://genziitian.in/newsletter',
  },
];

/// GET /api/admin/home-slides → [{id, image, alt, href, order}]. Marked
/// "accessible to any authenticated user" on the server. Returns the
/// admin-published list when present, falls back to [_defaultSlides] when
/// the manager hasn't set anything up yet.
final homeSlidesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<dynamic>('/api/admin/home-slides');
    final list = res.data is List ? res.data as List : const [];
    if (list.isEmpty) return _defaultSlides;
    return [for (final j in list) j as Map<String, dynamic>];
  } catch (_) {
    return _defaultSlides;
  }
});

/// PageView slider with auto-advance every 4.5s and dot indicator below.
/// Tapping a slide follows its `href` — internal paths (starting with `/`)
/// go through go_router, http(s) URLs open in the system browser.
class HomeSlider extends ConsumerStatefulWidget {
  const HomeSlider({super.key});
  @override
  ConsumerState<HomeSlider> createState() => _HomeSliderState();
}

class _HomeSliderState extends ConsumerState<HomeSlider> {
  final _controller = PageController(viewportFraction: 1.0);
  Timer? _timer;
  int _page = 0;

  void _restartTimer(int slideCount) {
    _timer?.cancel();
    if (slideCount <= 1) return;
    _timer = Timer.periodic(const Duration(milliseconds: 4500), (_) {
      if (!mounted || !_controller.hasClients) return;
      final next = (_page + 1) % slideCount;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _open(BuildContext context, String? href) async {
    if (href == null || href.isEmpty) return;
    if (href.startsWith('/')) {
      if (context.mounted) context.push(href);
      return;
    }
    final uri = Uri.tryParse(href);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(homeSlidesProvider);
    return async.when(
      loading: () => const _Placeholder(label: 'Loading…'),
      error: (_, __) => const SizedBox.shrink(),
      data: (slides) {
        if (slides.isEmpty) return const SizedBox.shrink();
        _restartTimer(slides.length);
        return Column(
          children: [
            SizedBox(
              height: 180,
              child: PageView.builder(
                controller: _controller,
                itemCount: slides.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (_, i) {
                  final s = slides[i];
                  final image = s['image'] as String?;
                  final asset = s['asset'] as String?;
                  final alt = (s['alt'] as String?) ?? '';
                  final href = s['href'] as String?;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(22),
                      child: InkWell(
                        onTap: () => _open(context, href),
                        borderRadius: BorderRadius.circular(22),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(22),
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppColors.brand,
                              boxShadow: AppShadows.lg,
                            ),
                            child: asset != null
                                ? Image.asset(
                                    asset,
                                    fit: BoxFit.cover,
                                    width: double.infinity,
                                    height: double.infinity,
                                    errorBuilder: (_, __, ___) =>
                                        _Placeholder(label: alt),
                                  )
                                : (image == null
                                    ? _Placeholder(label: alt)
                                    : CachedNetworkImage(
                                        imageUrl: image,
                                        fit: BoxFit.cover,
                                        width: double.infinity,
                                        height: double.infinity,
                                        placeholder: (_, __) =>
                                            const _Placeholder(label: ''),
                                        errorWidget: (_, __, ___) =>
                                            _Placeholder(label: alt),
                                      )),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            if (slides.length > 1) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(slides.length, (i) {
                  final active = i == _page;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: active ? 18 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: active ? AppColors.brand : AppColors.line2,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.brand, Color(0xFF7C3AED)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(16),
      child: Text(
        label.isEmpty ? 'Gen-Z IITian' : label,
        textAlign: TextAlign.center,
        style: AppTypography.h2.copyWith(
          color: AppColors.textInverse,
          fontSize: 18,
        ),
      ),
    );
  }
}
