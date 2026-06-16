import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_topbar.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

// Public courses catalog — hosted on the Next.js site. Tapping either the
// "Courses" tile or the "Visit Here" pill in the store opens this URL in
// the system browser so students can complete purchases on the web flow.
const _courseStoreUrl = 'https://genziitian.in/courses';

Future<void> _openCourseStore(BuildContext context) async {
  final ok = await launchUrl(
    Uri.parse(_courseStoreUrl),
    mode: LaunchMode.externalApplication,
  );
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Couldn't open the courses page.")),
    );
  }
}

/// Store page — header, support row, 2×2 product grid (Courses, Premium
/// Notes, Mentor Calls, Test Series) with the StatCard pattern, and a
/// featured-bundle banner. Mirrors ScreenStore in store.jsx.
class StorePage extends ConsumerWidget {
  const StorePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).value;
    final firstName =
        (user?.firstName ?? user?.name.split(' ').first) ?? 'there';

    final products = const [
      _Product(
        id: 'courses',
        title: 'Courses',
        count: '3 available',
        icon: Icons.menu_book_outlined,
        gradient: [Color(0xFF6366F1), AppColors.brand],
      ),
      _Product(
        id: 'notes',
        title: 'Premium Notes',
        count: '1 note',
        icon: Icons.description_outlined,
        gradient: [Color(0xFF34D399), AppColors.green],
      ),
      _Product(
        id: 'mentor',
        title: 'Book a Mentor Call',
        count: '2 mentors',
        icon: Icons.headset_mic_outlined,
        gradient: [Color(0xFFFB923C), Color(0xFFF97316)],
      ),
      _Product(
        id: 'test',
        title: 'Test Series',
        count: '1 available',
        icon: Icons.checklist_outlined,
        gradient: [Color(0xFFE879F9), Color(0xFFD946EF)],
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            AppTopBar(name: firstName),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('GenZ IITian\nOfficial Store',
                      style: AppTypography.h1
                          .copyWith(fontSize: 26, height: 1.15)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Flexible(
                        child: Text('You can also buy courses from',
                            style: AppTypography.bodyMuted
                                .copyWith(fontSize: 12.5)),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () => _openCourseStore(context),
                        borderRadius: BorderRadius.circular(999),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppColors.brand,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Visit Here',
                                  style: AppTypography.caption.copyWith(
                                    color: AppColors.textInverse,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                  )),
                              const SizedBox(width: 4),
                              const Icon(Icons.arrow_forward,
                                  color: AppColors.textInverse, size: 11),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SupportCard(
                    onTap: () => context.go('/faq'),
                  ),
                  const SizedBox(height: 20),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: products.length,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 14,
                      crossAxisSpacing: 14,
                      childAspectRatio: 0.92,
                    ),
                    itemBuilder: (_, i) =>
                        _ProductCard(product: products[i]),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Product {
  const _Product({
    required this.id,
    required this.title,
    required this.count,
    required this.icon,
    required this.gradient,
  });
  final String id;
  final String title;
  final String count;
  final IconData icon;
  final List<Color> gradient;
}

class _SupportCard extends StatelessWidget {
  const _SupportCard({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.line),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppColors.brandSoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.help_outline,
                    color: AppColors.brand, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text('Facing any issue? Get Support',
                    style: AppTypography.title.copyWith(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    )),
              ),
              const Icon(Icons.chevron_right,
                  color: AppColors.mute2, size: 14),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product});
  final _Product product;
  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: () {
        if (product.id == 'courses') {
          // Course purchases live on the marketing site — open in the
          // browser instead of routing to the in-app catalog.
          _openCourseStore(context);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${product.title} — coming soon')),
          );
        }
      },
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppColors.line),
          boxShadow: AppShadows.sm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: product.gradient,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: AppShadows.pillGlow(product.gradient.first),
              ),
              child: Icon(product.icon,
                  color: AppColors.textInverse, size: 26),
            ),
            const SizedBox(height: 14),
            Text(product.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.h2.copyWith(
                  fontSize: 16,
                  letterSpacing: -0.4,
                )),
            const SizedBox(height: 4),
            Text(product.count,
                style: AppTypography.caption.copyWith(
                  fontSize: 11.5,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w600,
                )),
            const Spacer(),
            Row(
              children: [
                Text('Explore',
                    style: AppTypography.title.copyWith(
                      fontSize: 12.5,
                      color: AppColors.brand,
                      fontWeight: FontWeight.w800,
                    )),
                const SizedBox(width: 4),
                const Icon(Icons.chevron_right,
                    color: AppColors.brand, size: 14),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// _BundleBanner removed — the hard-coded "Degree Programme Bundle · save
// ₹4,200" featured banner is gone. Reintroduce when there's a real bundle
// offering tied to a SKU, not a fake countdown.
