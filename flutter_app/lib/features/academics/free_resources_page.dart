import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

/// /api/free-resources/courses → list of free courses (with enrollment).
final freeCoursesProvider =
    FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/free-resources/courses');
  return res.data is List ? res.data as List : const [];
});

/// /api/free-resources/materials → list of free materials.
final freeMaterialsProvider =
    FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/free-resources/materials');
  return res.data is List ? res.data as List : const [];
});

/// /api/free-resources/purchased → list of purchased note packs.
final purchasedMaterialsProvider =
    FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/free-resources/purchased');
  return res.data is List ? res.data as List : const [];
});

/// Free Resources sub-page — three big status cards backed by real counts
/// from /api/free-resources/{courses,materials,purchased}. Quick stats are
/// derived from the same data (no hard-coded numbers anywhere).
class FreeResourcesPage extends ConsumerWidget {
  const FreeResourcesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coursesAsync = ref.watch(freeCoursesProvider);
    final materialsAsync = ref.watch(freeMaterialsProvider);
    final purchasedAsync = ref.watch(purchasedMaterialsProvider);

    final coursesCount = coursesAsync.valueOrNull?.length ?? 0;
    final materialsCount = materialsAsync.valueOrNull?.length ?? 0;
    final purchasedCount = purchasedAsync.valueOrNull?.length ?? 0;

    final anyLoading = coursesAsync.isLoading ||
        materialsAsync.isLoading ||
        purchasedAsync.isLoading;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: AppRefresh(
          onRefresh: () async {
            ref.invalidate(freeCoursesProvider);
            ref.invalidate(freeMaterialsProvider);
            ref.invalidate(purchasedMaterialsProvider);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              SubPageHeader(
                title: 'Free Resources',
                subtitle: 'Access free courses and study materials',
                right: anyLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child:
                            CircularProgressIndicator(strokeWidth: 2),
                      )
                    : null,
              ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _BigCard(
                      icon: Icons.menu_book_outlined,
                      iconBg: const [AppColors.brand, Color(0xFF7C3AED)],
                      title: 'Free Courses',
                      desc:
                          'Browse and self-enroll in free courses with full content access.',
                      pillLabel: coursesCount == 0
                          ? '0 COURSES AVAILABLE'
                          : '$coursesCount ${coursesCount == 1 ? 'COURSE' : 'COURSES'} AVAILABLE',
                      pillColor: AppColors.brand,
                      pillBg: AppColors.brandSoft,
                      exploreColor: AppColors.brand,
                      loading: coursesAsync.isLoading,
                      error: coursesAsync.hasError,
                      onTap: () => context.push('/courses'),
                    ),
                    const SizedBox(height: 16),
                    _BigCard(
                      icon: Icons.folder_open_outlined,
                      iconBg: const [
                        AppColors.green,
                        Color(0xFF14B8A6)
                      ],
                      title: 'Free Materials',
                      desc:
                          'Notes, PYQs, and assignments organised by level and subject.',
                      pillLabel: materialsCount == 0
                          ? '0 MATERIALS AVAILABLE'
                          : '$materialsCount ${materialsCount == 1 ? 'MATERIAL' : 'MATERIALS'} AVAILABLE',
                      pillColor: AppColors.green,
                      pillBg: AppColors.greenSft,
                      exploreColor: AppColors.green,
                      loading: materialsAsync.isLoading,
                      error: materialsAsync.hasError,
                      onTap: () => context.push('/free-resources/materials'),
                    ),
                    const SizedBox(height: 16),
                    _BigCard(
                      icon: Icons.list_alt_outlined,
                      iconBg: const [
                        AppColors.amber,
                        Color(0xFFF97316)
                      ],
                      title: 'Purchased Materials',
                      desc:
                          'Access your securely purchased study notes. Available for 30 days.',
                      pillLabel: purchasedCount == 0
                          ? 'NONE PURCHASED YET'
                          : '$purchasedCount PURCHASED',
                      pillColor: AppColors.amber,
                      pillBg: AppColors.amberSft,
                      exploreColor: AppColors.amber,
                      loading: purchasedAsync.isLoading,
                      error: purchasedAsync.hasError,
                      onTap: () => context.push('/free-resources/purchased'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BigCard extends StatelessWidget {
  const _BigCard({
    required this.icon,
    required this.iconBg,
    required this.title,
    required this.desc,
    required this.pillLabel,
    required this.pillColor,
    required this.pillBg,
    required this.exploreColor,
    required this.loading,
    required this.error,
    required this.onTap,
  });
  final IconData icon;
  final List<Color> iconBg;
  final String title;
  final String desc;
  final String pillLabel;
  final Color pillColor;
  final Color pillBg;
  final Color exploreColor;
  final bool loading;
  final bool error;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.line),
        boxShadow: AppShadows.md,
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: iconBg,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: AppShadows.pillGlow(iconBg.first),
            ),
            child: Icon(icon, color: AppColors.textInverse, size: 32),
          ),
          const SizedBox(height: 14),
          Text(title,
              style: AppTypography.h2.copyWith(fontSize: 17),
              textAlign: TextAlign.center),
          const SizedBox(height: 6),
          Text(desc,
              style: AppTypography.bodyMuted
                  .copyWith(fontSize: 12.5, height: 1.45),
              textAlign: TextAlign.center),
          const SizedBox(height: 14),
          if (loading)
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else if (error)
            Text('Could not load',
                style: AppTypography.caption.copyWith(
                  color: AppColors.red,
                  fontSize: 11,
                ))
          else
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: pillBg,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(pillLabel,
                  style: AppTypography.uppercase.copyWith(
                    fontSize: 10.5,
                    color: pillColor,
                    letterSpacing: 0.6,
                  )),
            ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Explore Now',
                  style: AppTypography.title.copyWith(
                    color: exploreColor,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                  )),
              const SizedBox(width: 4),
              Icon(Icons.arrow_forward, color: exploreColor, size: 14),
            ],
          ),
        ],
      ),
    );
  }
}

// _QuickStats / _Mini / _Divider removed — the QUICK STATS card duplicated
// the counts already shown on the three big status cards above it.
